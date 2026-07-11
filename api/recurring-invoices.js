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
      let query = supabase
        .from('recurring_invoices')
        .select('*, customers(name, email)')
        .eq('user_id', userId)

      if (status) query = query.eq('status', status)

      const { data, error } = await query.order('next_run_date')

      if (error) return res.status(400).json({ error: error.message })
      return res.status(200).json({ recurringInvoices: data })
    }

    if (req.method === 'POST') {
      const { customer_id, template_invoice_id, frequency, start_date, end_date, auto_charge, payment_method } = req.body

      if (!customer_id || !frequency) {
        return res.status(400).json({ error: 'Missing required fields: customer_id, frequency' })
      }

      // Calculate next run date based on frequency
      const startDateObj = new Date(start_date || new Date())
      const nextRunDate = new Date(startDateObj)

      const frequencyDays = {
        daily: 1,
        weekly: 7,
        biweekly: 14,
        monthly: 30,
        quarterly: 90,
        yearly: 365,
      }

      nextRunDate.setDate(nextRunDate.getDate() + (frequencyDays[frequency] || 30))

      const { data, error } = await supabase
        .from('recurring_invoices')
        .insert([{
          user_id: userId,
          customer_id,
          template_invoice_id,
          frequency,
          start_date: start_date || new Date().toISOString().split('T')[0],
          end_date,
          next_run_date: nextRunDate.toISOString().split('T')[0],
          auto_charge: auto_charge || false,
          payment_method,
        }])
        .select()

      if (error) return res.status(400).json({ error: error.message })
      return res.status(201).json({ recurringInvoice: data[0] })
    }

    if (req.method === 'PUT') {
      const { id, ...updateData } = req.body

      if (!id) return res.status(400).json({ error: 'Missing recurring invoice ID' })

      const { data, error } = await supabase
        .from('recurring_invoices')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', userId)
        .select()

      if (error) return res.status(400).json({ error: error.message })
      return res.status(200).json({ recurringInvoice: data[0] })
    }

    if (req.method === 'DELETE') {
      const { id } = req.body

      if (!id) return res.status(400).json({ error: 'Missing recurring invoice ID' })

      // Soft delete by marking as cancelled
      const { error } = await supabase
        .from('recurring_invoices')
        .update({ status: 'cancelled' })
        .eq('id', id)
        .eq('user_id', userId)

      if (error) return res.status(400).json({ error: error.message })
      return res.status(200).json({ success: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('❌ Recurring Invoices error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
