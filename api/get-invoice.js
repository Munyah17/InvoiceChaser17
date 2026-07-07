import { createClient } from '@supabase/supabase-js'
import { handlePreflight } from './_lib/cors.js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = SUPABASE_URL && SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  : null

const DEBTOR_FEE_RATE = 0.025

export default async function handler(req, res) {
  if (handlePreflight(req, res)) return

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Server not configured' })
  }

  const { invoice_number } = req.query
  if (!invoice_number) {
    return res.status(400).json({ error: 'Missing invoice_number' })
  }

  try {
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('id, invoice_number, amount, currency, description, due_date, status, customer_name, user_id')
      .eq('invoice_number', invoice_number)
      .single()

    if (error || !invoice) {
      return res.status(404).json({ error: 'Invoice not found' })
    }

    const { data: creditor } = await supabase
      .from('profiles')
      .select('full_name, company_name')
      .eq('id', invoice.user_id)
      .single()

    const amount = parseFloat(invoice.amount)
    const fee = Math.round(amount * DEBTOR_FEE_RATE * 100) / 100
    const total = Math.round((amount + fee) * 100) / 100

    return res.status(200).json({
      invoice_number: invoice.invoice_number,
      description: invoice.description,
      due_date: invoice.due_date,
      status: invoice.status,
      customer_name: invoice.customer_name,
      currency: invoice.currency || 'USD',
      creditor_name: creditor?.company_name || creditor?.full_name || 'Your Creditor',
      amount,
      fee_rate: DEBTOR_FEE_RATE,
      fee,
      total,
    })
  } catch (error) {
    console.error('Get invoice error:', error)
    return res.status(500).json({ error: error.message })
  }
}
