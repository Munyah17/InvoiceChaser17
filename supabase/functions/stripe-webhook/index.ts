/// <reference path="./deno.d.ts" />

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno&dts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0?target=deno&dts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!stripeSecretKey || !supabaseUrl || !supabaseServiceKey) {
    return new Response(
      JSON.stringify({ error: 'Server configuration error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
  })

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const signature = req.headers.get('stripe-signature')
    const body = await req.text()

    if (!webhookSecret || !signature) {
      return new Response(
        JSON.stringify({ error: 'Missing webhook secret or signature' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret)

    // Handle checkout completion
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const userId = session.metadata?.user_id
      const planId = session.metadata?.plan_id

      if (userId && planId) {
        // Update user's plan in database
        const { error } = await supabase
          .from('user_plans')
          .upsert({
            user_id: userId,
            plan: planId,
            status: 'active',
            stripe_session_id: session.id,
            updated_at: new Date().toISOString(),
          })

        if (error) {
          console.error('Error updating user plan:', error)
          return new Response(
            JSON.stringify({ error: 'Failed to update user plan' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        console.log(`Updated user ${userId} to plan ${planId}`)
      }
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
