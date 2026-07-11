import { createClient } from '@supabase/supabase-js'
import { verifyUser } from './_lib/verify-jwt.js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, serviceRoleKey)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const auth = await verifyUser(req, supabaseUrl, serviceRoleKey)
    if (auth.error) return res.status(auth.status).json({ error: auth.error })

    const userId = auth.user.id

    if (req.method === 'GET') {
      const { status } = req.query
      let query = supabase.from('bills').select('*').eq('user_id', userId)

      if (status) query = query.eq('status', status)

      const { data, error } = await query.order('due_date')

      if (error) return res.status(400).json({ error: error.message })
      return res.status(200).json({ bills: data })
    }

    if (req.method === 'POST') {
      const { vendor_id, bill_number, amount_due, bill_date, due_date, description } = req.body

      if (!vendor_id || !bill_number || !amount_due) {
        return res.status(400).json({ error: 'Missing required fields: vendor_id, bill_number, amount_due' })
      }

      const { data, error } = await supabase
        .from('bills')
        .insert([{
          user_id: userId,
          vendor_id,
          bill_number,
          amount_due,
          bill_date: bill_date || new Date().toISOString().split('T')[0],
          due_date,
          description,
        }])
        .select()

      if (error) return res.status(400).json({ error: error.message })
      return res.status(201).json({ bill: data[0] })
    }

    if (req.method === 'PUT') {
      const { id, amount_paid, ...updateData } = req.body

      if (!id) return res.status(400).json({ error: 'Missing bill ID' })

      let newStatus = updateData.status

      // Auto-update status based on amount_paid
      if (amount_paid !== undefined) {
        const { data: billData } = await supabase.from('bills').select('amount_due').eq('id', id).single()
        if (billData) {
          if (amount_paid >= billData.amount_due) {
            newStatus = 'paid'
          } else if (amount_paid > 0) {
            newStatus = 'open'
          }
        }
      }

      const { data, error } = await supabase
        .from('bills')
        .update({ ...updateData, amount_paid, status: newStatus })
        .eq('id', id)
        .eq('user_id', userId)
        .select()

      if (error) return res.status(400).json({ error: error.message })
      return res.status(200).json({ bill: data[0] })
    }

    if (req.method === 'DELETE') {
      const { id } = req.body

      if (!id) return res.status(400).json({ error: 'Missing bill ID' })

      const { error } = await supabase.from('bills').delete().eq('id', id).eq('user_id', userId)

      if (error) return res.status(400).json({ error: error.message })
      return res.status(200).json({ success: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('❌ Bills error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
