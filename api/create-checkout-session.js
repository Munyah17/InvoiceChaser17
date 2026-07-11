import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { handlePreflight } from './_lib/cors.js'
import { activatePlan } from './_lib/activate-plan.js'

// Plan checkout + post-payment verification.
//   POST /api/create-checkout-session { plan, amount, plan_id, user_id } → { url }
//   GET  /api/create-checkout-session?session_id=cs_... → verifies with Stripe
//        and (if paid) activates the plan server-side, then returns status.
// The GET path is authoritative: the plan is only written after Stripe itself
// confirms payment_status === 'paid'. Clients can no longer set their own plan.

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = SUPABASE_URL && SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  : null

export default async function handler(req, res) {
  if (handlePreflight(req, res)) return

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

  try {
    // ── Verify a completed checkout session and activate the plan ───────────
    if (req.method === 'GET') {
      const { session_id } = req.query
      if (!session_id) {
        return res.status(400).json({ error: 'Missing session_id' })
      }

      const session = await stripe.checkout.sessions.retrieve(session_id)
      const isPaid = session.payment_status === 'paid'
      const planId = session.metadata?.plan_id
      const userId = session.metadata?.user_id

      // Invoice payments are reconciled by the webhook, not here.
      if (isPaid && planId && session.metadata?.type !== 'invoice_payment') {
        await activatePlan(supabase, {
          userId,
          planId,
          method: 'stripe',
          transactionRef: session.id,
          amount: session.amount_total || 0,
          currency: session.currency?.toUpperCase() || 'USD',
          stripeCustomerId: session.customer,
          stripeSubscriptionId: session.subscription,
        })
      }

      return res.status(200).json({
        id: session.id,
        status: session.payment_status,
        plan_id: planId,
        customer_email: session.customer_email,
        amount_total: session.amount_total,
        currency: session.currency,
      })
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    const { plan, amount, email, plan_id, user_id, metadata = {} } = req.body

    if (!amount || amount < 1) {
      return res.status(400).json({ error: 'Invalid amount' })
    }

    const isSubscription = ['starter', 'professional', 'business'].includes(plan_id || plan)
    const origin = req.headers.origin || process.env.VITE_APP_URL

    const lineItem = {
      price_data: {
        currency: 'usd',
        product_data: { name: plan },
        unit_amount: amount,
      },
      quantity: 1,
    }

    if (isSubscription) {
      lineItem.price_data.recurring = { interval: 'month' }
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: isSubscription ? 'subscription' : 'payment',
      customer_email: email,
      line_items: [lineItem],
      metadata: {
        user_id: user_id || 'guest',
        plan_id: plan_id || plan,
        ...metadata,
      },
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}&plan=${plan_id || plan}`,
      cancel_url: `${origin}/checkout?plan=${plan_id || plan}`,
      automatic_tax: { enabled: true },
      allow_promotion_codes: true,
    })

    return res.status(200).json({ url: session.url })
  } catch (error) {
    console.error('Stripe error:', error)
    return res.status(500).json({ error: 'Payment processing error' })
  }
}
