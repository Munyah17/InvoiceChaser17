// Netlify Function: Stripe Webhook Handler
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = SUPABASE_URL && SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  : null

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Stripe-Signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const sig = event.headers['stripe-signature']
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || ''

  let stripeEvent

  try {
    const body = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body

    if (endpointSecret && sig) {
      stripeEvent = stripe.webhooks.constructEvent(body, sig, endpointSecret)
    } else {
      stripeEvent = JSON.parse(body)
    }
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return { statusCode: 400, headers, body: `Webhook Error: ${err.message}` }
  }

  console.log('Webhook event received:', stripeEvent.type)

  // Handle checkout session completion
  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object
    const { user_id, plan_id } = session.metadata || {}
    const customerId = session.customer
    const subscriptionId = session.subscription

    if (supabase && user_id && user_id !== 'guest') {
      try {
        // Update user profile plan
        await supabase
          .from('profiles')
          .update({ plan: plan_id, updated_at: new Date().toISOString() })
          .eq('id', user_id)

        // Upsert subscription record
        await supabase
          .from('subscriptions')
          .upsert({
            user_id: user_id,
            plan: plan_id,
            status: 'active',
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            current_period_start: subscriptionId ? new Date().toISOString() : null,
            current_period_end: subscriptionId
              ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
              : null,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' })

        // Record payment
        const amount = session.amount_total || 0
        await supabase.from('payments').insert({
          user_id: user_id,
          amount: amount / 100,
          currency: session.currency?.toUpperCase() || 'USD',
          method: 'stripe',
          status: 'completed',
          transaction_ref: session.id,
          metadata: { plan_id, customer_id: customerId, subscription_id: subscriptionId },
        })
      } catch (dbError) {
        console.error('Database update error:', dbError)
      }
    }
  }

  // Handle failed payments
  if (stripeEvent.type === 'invoice.payment_failed') {
    const invoice = stripeEvent.data.object
    const subscriptionId = invoice.subscription

    if (supabase && subscriptionId) {
      try {
        await supabase
          .from('subscriptions')
          .update({ status: 'past_due', updated_at: new Date().toISOString() })
          .eq('stripe_subscription_id', subscriptionId)
      } catch (dbError) {
        console.error('Database update error:', dbError)
      }
    }
  }

  return { statusCode: 200, headers, body: JSON.stringify({ received: true }) }
}
