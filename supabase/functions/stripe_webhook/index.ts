import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.18.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
})

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || ''

serve(async (req) => {
  try {
    const signature = req.headers.get('stripe-signature')
    
    if (!signature) {
      return new Response(
        JSON.stringify({ error: 'No signature' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.text()
    
    let event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('VITE_SUPABASE_URL') || '',
      Deno.env.get('VITE_SUPABASE_SERVICE_ROLE_KEY') || ''
    )

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const { userId, planId, paymentMethod, isLifetime } = session.metadata

      if (!userId || !planId) {
        console.error('Missing metadata in checkout session')
        return new Response(
          JSON.stringify({ error: 'Missing metadata' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }

      // Update user metadata with subscription info
      const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
        user_metadata: {
          subscription_status: 'active',
          plan_id: planId,
          payment_method: paymentMethod,
          is_lifetime: isLifetime === 'true',
          subscription_updated_at: new Date().toISOString(),
        },
      })

      if (updateError) {
        console.error('Error updating user metadata:', updateError)
        return new Response(
          JSON.stringify({ error: 'Failed to update user' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      }

      // Create subscription record in database
      const { error: subError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: userId,
          plan_id: planId,
          status: 'active',
          stripe_session_id: session.id,
          payment_method: paymentMethod,
          is_lifetime: isLifetime === 'true',
        })

      if (subError) {
        console.error('Error creating subscription record:', subError)
        // Don't fail the webhook if this fails, user metadata is enough
      }

      console.log(`Subscription activated for user ${userId}, plan ${planId}`)
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
