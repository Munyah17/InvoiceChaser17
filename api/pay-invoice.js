import Stripe from 'stripe'
import { Paynow } from 'paynow'
import { createClient } from '@supabase/supabase-js'
import { handlePreflight } from './_lib/cors.js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = SUPABASE_URL && SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  : null

// Debtor pays a collection/convenience surcharge on top of the invoice; the
// creditor's 10% success fee is deducted separately from their wallet once
// the payment is confirmed (see api/webhook.js and api/paynow-result.js).
const DEBTOR_FEE_RATE = 0.025

export default async function handler(req, res) {
  if (handlePreflight(req, res)) return

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Server not configured' })
  }

  try {
    const { invoice_number, gateway } = req.body

    if (!invoice_number || !['stripe', 'paynow'].includes(gateway)) {
      return res.status(400).json({ error: 'Missing invoice_number or invalid gateway' })
    }

    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('id, invoice_number, amount, currency, description, customer_email, customer_name, user_id, status')
      .eq('invoice_number', invoice_number)
      .single()

    if (invoiceError || !invoice) {
      return res.status(404).json({ error: 'Invoice not found' })
    }

    if (invoice.status === 'paid') {
      return res.status(400).json({ error: 'This invoice has already been paid' })
    }

    const baseAmount = parseFloat(invoice.amount)
    const fee = Math.round(baseAmount * DEBTOR_FEE_RATE * 100) / 100
    const total = Math.round((baseAmount + fee) * 100) / 100
    const currency = (invoice.currency || 'USD').toLowerCase()
    const origin = req.headers.origin || process.env.VITE_APP_URL

    if (gateway === 'stripe') {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        customer_email: invoice.customer_email || undefined,
        line_items: [{
          price_data: {
            currency,
            product_data: { name: `Invoice ${invoice.invoice_number}${invoice.description ? ` — ${invoice.description}` : ''}` },
            unit_amount: Math.round(total * 100),
          },
          quantity: 1,
        }],
        metadata: {
          type: 'invoice_payment',
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
          creditor_user_id: invoice.user_id,
          base_amount: String(baseAmount),
          fee_amount: String(fee),
        },
        success_url: `${origin}/pay/${invoice.invoice_number}?paid=1`,
        cancel_url: `${origin}/pay/${invoice.invoice_number}`,
      })
      return res.status(200).json({ url: session.url })
    }

    // Paynow
    const integrationId = process.env.PAYNOW_INTEGRATION_ID || process.env.PAYNOW_ID
    const integrationKey = process.env.PAYNOW_INTEGRATION_KEY || process.env.PAYNOW_KEY
    if (!integrationId || !integrationKey) {
      return res.status(500).json({ error: 'Paynow credentials not configured' })
    }

    const paynow = new Paynow(integrationId, integrationKey)
    const siteUrl = process.env.VITE_APP_URL || `https://${req.headers.host}`
    paynow.resultUrl = `${siteUrl}/api/paynow-result`
    paynow.returnUrl = `${siteUrl}/pay/${invoice.invoice_number}?paid=1`

    const payment = paynow.createPayment(invoice.invoice_number, invoice.customer_email || 'customer@invoicechaser.com')
    payment.add(`InvoiceChaser — Invoice ${invoice.invoice_number}`, total)

    const response = await paynow.send(payment)
    if (!response.success) {
      return res.status(402).json({ error: response.error || 'Paynow transaction initiation failed' })
    }

    await supabase.from('payments').insert({
      user_id: invoice.user_id,
      amount: total,
      currency: invoice.currency || 'USD',
      method: 'paynow',
      status: 'pending',
      transaction_ref: invoice.invoice_number,
      metadata: {
        type: 'invoice_payment',
        invoice_id: invoice.id,
        base_amount: baseAmount,
        fee_amount: fee,
        paynow_poll_url: response.pollUrl,
      },
    })

    return res.status(200).json({ success: true, url: response.redirectUrl, pollUrl: response.pollUrl })
  } catch (error) {
    console.error('Pay invoice error:', error)
    return res.status(500).json({ error: error.message })
  }
}
