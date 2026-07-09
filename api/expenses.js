import { createClient } from '@supabase/supabase-js'
import { verifyAdmin } from './_lib/verify-jwt.js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, serviceRoleKey)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const auth = await verifyAdmin(req, supabase, supabaseUrl, serviceRoleKey)
    if (auth.error) return res.status(auth.status).json({ error: auth.error })

    const userId = auth.user.id

    if (req.method === 'GET') {
      const { status, startDate, endDate } = req.query
      let query = supabase.from('expenses').select('*').eq('user_id', userId)

      if (status) query = query.eq('status', status)
      if (startDate) query = query.gte('expense_date', startDate)
      if (endDate) query = query.lte('expense_date', endDate)

      const { data, error } = await query.order('expense_date', { ascending: false })

      if (error) return res.status(400).json({ error: error.message })
      return res.status(200).json({ expenses: data })
    }

    if (req.method === 'POST') {
      const { vendor_id, account_id, amount, category, description, receipt_url, expense_date } = req.body

      if (!amount) return res.status(400).json({ error: 'Amount is required' })

      const { data, error } = await supabase
        .from('expenses')
        .insert([{
          user_id: userId,
          vendor_id,
          account_id,
          amount,
          category,
          description,
          receipt_url,
          expense_date: expense_date || new Date().toISOString().split('T')[0],
        }])
        .select()

      if (error) return res.status(400).json({ error: error.message })
      return res.status(201).json({ expense: data[0] })
    }

    if (req.method === 'PUT') {
      const { id, ...updateData } = req.body

      if (!id) return res.status(400).json({ error: 'Missing expense ID' })

      const { data, error } = await supabase
        .from('expenses')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', userId)
        .select()

      if (error) return res.status(400).json({ error: error.message })
      return res.status(200).json({ expense: data[0] })
    }

    if (req.method === 'DELETE') {
      const { id } = req.body

      if (!id) return res.status(400).json({ error: 'Missing expense ID' })

      const { error } = await supabase.from('expenses').delete().eq('id', id).eq('user_id', userId)

      if (error) return res.status(400).json({ error: error.message })
      return res.status(200).json({ success: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('❌ Expenses error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
