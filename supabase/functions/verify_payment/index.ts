import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.18.0'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
})

serve(async (req) => {
  try {
    const { session_id, paynow_ref } = await req.json()

    if (!session_id && !paynow_ref) {
      return new Response(
        JSON.stringify({ error: 'Missing payment reference' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    let subscriptionData = null

    if (session_id) {
      // Verify Stripe payment
      const session = await stripe.checkout.sessions.retrieve(session_id)

      if (session.payment_status !== 'paid') {
        return new Response(
          JSON.stringify({ error: 'Payment not completed' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }

      const { userId, planId } = session.metadata

      // Create or update subscription
      const { data: subscription, error } = await supabase
        .from('subscriptions')
        .upsert({
          user_id: userId,
          plan: planId,
          status: 'active',
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        })
        .select()
        .single()

      if (error) throw error
      subscriptionData = subscription
    } else if (paynow_ref) {
      // Paynow verification requires a real API call to the Paynow gateway.
      // Trusting a client-supplied reference without gateway confirmation is a critical
      // security vulnerability — do not activate subscriptions here without that check.
      return new Response(
        JSON.stringify({ error: 'Paynow payment verification is not yet implemented server-side' }),
        { status: 501, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ subscription: subscriptionData }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error verifying payment:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
