const { Paynow } = require('paynow')
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = SUPABASE_URL && SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  : null

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    const { amount, description, reference, email, user_id, plan_id } = JSON.parse(event.body)

    if (!amount || !description || !reference) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing required fields: amount, description, reference' }) }
    }

    const integrationId = process.env.PAYNOW_INTEGRATION_ID || process.env.PAYNOW_ID
    const integrationKey = process.env.PAYNOW_INTEGRATION_KEY || process.env.PAYNOW_KEY

    if (!integrationId || !integrationKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Paynow credentials not configured' }) }
    }

    const paynow = new Paynow(integrationId, integrationKey)
    const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || 'https://invoicechaser.netlify.app'

    // Paynow calls this URL after the transaction completes (server-side confirmation)
    paynow.resultUrl = `${siteUrl}/.netlify/functions/paynow-result`
    // Paynow redirects the customer's browser back here after checkout
    paynow.returnUrl = `${siteUrl}/payment-success?method=paynow&plan=${plan_id || 'professional'}&ref=${reference}`

    const payment = paynow.createPayment(reference, email || 'customer@invoicechaser.com')
    payment.add(`InvoiceChaser — ${description}`, parseFloat(amount))

    // Send to Paynow web checkout — Paynow handles all payment method selection
    const response = await paynow.send(payment)

    if (!response.success) {
      return {
        statusCode: 402,
        headers,
        body: JSON.stringify({ error: response.error || 'Paynow transaction initiation failed' }),
      }
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

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        url: response.redirectUrl,
        pollUrl: response.pollUrl,
        reference,
      }),
    }
  } catch (error) {
    console.error('Paynow payment error:', error)
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
  }
}
