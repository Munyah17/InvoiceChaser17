import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { applyCors } from './_lib/cors.js'
import { readRawBody } from './_lib/rawBody.js'

// Signature verification needs the exact raw bytes Stripe sent.
export const config = { api: { bodyParser: false } }

const stripe = Stripe(process.env.STRIPE_SECRET_KEY)

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = SUPABASE_URL && SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  : null

export default async function handler(req, res) {
  applyCors(res)

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const sig = req.headers['stripe-signature']
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || ''

  let stripeEvent

  try {
    const rawBody = await readRawBody(req)

    if (endpointSecret && sig) {
      stripeEvent = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret)
    } else {
      stripeEvent = JSON.parse(rawBody.toString('utf8'))
    }
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  console.log('Webhook event received:', stripeEvent.type)

  // Handle checkout session completion
  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object

    // ── Invoice payment (debtor paying via a reminder link) ────────────────
    if (session.metadata?.type === 'invoice_payment') {
      if (supabase) {
        try {
          const { invoice_id, invoice_number, creditor_user_id, base_amount, fee_amount } = session.metadata
          await supabase.from('invoices').update({ status: 'paid', updated_at: new Date().toISOString() }).eq('id', invoice_id)

          await supabase.from('payments').insert({
            invoice_id,
            amount: session.amount_total / 100,
            currency: session.currency?.toUpperCase() || 'USD',
            method: 'stripe',
            status: 'completed',
            transaction_ref: session.id,
            metadata: { type: 'invoice_payment', invoice_number, base_amount, debtor_fee: fee_amount },
          })

          // Creditor's 10% success fee, deducted from their wallet
          const creditorFee = Math.round(parseFloat(base_amount) * 0.10 * 100) / 100
          const { data: wallet } = await supabase.from('wallets').select('balance').eq('user_id', creditor_user_id).single()
          if (wallet) {
            await supabase.from('wallets').update({ balance: parseFloat(wallet.balance) - creditorFee, updated_at: new Date().toISOString() }).eq('user_id', creditor_user_id)
          }
          await supabase.from('wallet_transactions').insert({
            user_id: creditor_user_id,
            invoice_id,
            amount: creditorFee,
            type: 'debit',
            description: `Collection fee (10%) — Invoice ${invoice_number} paid via reminder link`,
            reference: session.id,
          })
        } catch (dbError) {
          console.error('Invoice payment webhook error:', dbError)
        }
      }
      return res.status(200).json({ received: true })
    }

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

  return res.status(200).json({ received: true })
}
