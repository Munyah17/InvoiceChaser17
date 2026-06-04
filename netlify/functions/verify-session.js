// Netlify Function: Verify Stripe Checkout Session
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
}

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    const params = new URLSearchParams(event.rawQuery)
    const session_id = params.get('session_id')

    if (!session_id) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing session_id' }) }
    }

    const session = await stripe.checkout.sessions.retrieve(session_id)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        id: session.id,
        status: session.payment_status,
        plan_id: session.metadata?.plan_id,
        customer_email: session.customer_email,
        amount_total: session.amount_total,
        currency: session.currency,
      }),
    }
  } catch (error) {
    console.error('Verify session error:', error)
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
  }
}
