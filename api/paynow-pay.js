import { Paynow } from 'paynow'
import { createClient } from '@supabase/supabase-js'
import { handlePreflight } from './_lib/cors.js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = SUPABASE_URL && SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  : null

export default async function handler(req, res) {
  if (handlePreflight(req, res)) return

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { amount, description, reference, email, user_id, plan_id } = req.body

    if (!amount || !description || !reference) {
      return res.status(400).json({ error: 'Missing required fields: amount, description, reference' })
    }

    const integrationId = process.env.PAYNOW_INTEGRATION_ID || process.env.PAYNOW_ID
    const integrationKey = process.env.PAYNOW_INTEGRATION_KEY || process.env.PAYNOW_KEY

    if (!integrationId || !integrationKey) {
      return res.status(500).json({ error: 'Paynow credentials not configured' })
    }

    const paynow = new Paynow(integrationId, integrationKey)
    const siteUrl = process.env.VITE_APP_URL || `https://${req.headers.host}`

    // Paynow calls this URL after the transaction completes (server-side confirmation)
    paynow.resultUrl = `${siteUrl}/api/paynow-result`
    // Paynow redirects the customer's browser back here after checkout
    paynow.returnUrl = `${siteUrl}/payment-success?method=paynow&plan=${plan_id || 'professional'}&ref=${reference}`

    const payment = paynow.createPayment(reference, email || 'customer@invoicechaser.com')
    payment.add(`InvoiceChaser — ${description}`, parseFloat(amount))

    // Send to Paynow web checkout — Paynow handles all payment method selection
    const response = await paynow.send(payment)

    if (!response.success) {
      return res.status(402).json({ error: response.error || 'Paynow transaction initiation failed' })
    }

    // Record pending payment in Supabase
    if (supabase) {
      await supabase.from('payments').insert({
        user_id: user_id || null,
        amount: parseFloat(amount),
        currency: 'USD',
        method: 'paynow',
        status: 'pending',
        transaction_ref: reference,
        metadata: {
          paynow_poll_url: response.pollUrl,
          paynow_reference: reference,
          plan_id: plan_id || null,
        },
      })
    }

    return res.status(200).json({
      success: true,
      url: response.redirectUrl,
      pollUrl: response.pollUrl,
      reference,
    })
  } catch (error) {
    console.error('Paynow payment error:', error)
    return res.status(500).json({ error: error.message })
  }
}
