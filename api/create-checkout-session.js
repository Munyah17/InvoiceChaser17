import Stripe from 'stripe'
import { handlePreflight } from './_lib/cors.js'

export default async function handler(req, res) {
  if (handlePreflight(req, res)) return

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    const { plan, amount, email, plan_id, user_id, metadata = {} } = req.body

    const isSubscription = ['starter', 'professional', 'business'].includes(plan_id || plan)
    const origin = req.headers.origin || process.env.VITE_APP_URL

    const lineItem = {
      price_data: {
        currency: 'usd',
        product_data: {
          name: plan,
        },
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
    return res.status(500).json({ error: error.message })
  }
}
