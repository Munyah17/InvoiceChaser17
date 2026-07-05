import Stripe from 'stripe'
import { handlePreflight } from './_lib/cors.js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  if (handlePreflight(req, res)) return

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { session_id } = req.query

    if (!session_id) {
      return res.status(400).json({ error: 'Missing session_id' })
    }

    const session = await stripe.checkout.sessions.retrieve(session_id)

    return res.status(200).json({
      id: session.id,
      status: session.payment_status,
      plan_id: session.metadata?.plan_id,
      customer_email: session.customer_email,
      amount_total: session.amount_total,
      currency: session.currency,
    })
  } catch (error) {
    console.error('Verify session error:', error)
    return res.status(500).json({ error: error.message })
  }
}
