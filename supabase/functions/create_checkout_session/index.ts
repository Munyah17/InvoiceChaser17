import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.18.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
})

serve(async (req) => {
  try {
    const { planId, userId, email, paymentMethod, amount } = await req.json()

    if (!planId || !userId || !email) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Plan pricing (updated to match landing page)
    const plans: Record<string, number> = {
      starter: 4.99,
      professional: 11.99,
      business: 29.99,
      lifetime: 99,
    }

    const price = plans[planId] || amount
    if (!price) {
      return new Response(
        JSON.stringify({ error: 'Invalid plan' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Determine payment mode based on plan
    const isLifetime = planId === 'lifetime'
    const mode = isLifetime ? 'payment' : 'subscription'

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `InvoiceChaser ${planId.charAt(0).toUpperCase() + planId.slice(1)} Plan`,
              description: isLifetime ? 'Lifetime access - one-time payment' : 'Monthly subscription',
            },
            unit_amount: Math.round(price * 100), // Convert to cents
            ...(isLifetime ? {} : {
              recurring: {
                interval: 'month',
              },
            }),
          },
          quantity: 1,
        },
      ],
      mode,
      success_url: `${req.headers.get('origin')}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/payment-failure`,
      customer_email: email,
      metadata: {
        userId,
        planId,
        paymentMethod: paymentMethod || 'card',
        isLifetime: isLifetime.toString(),
      },
    })

    return new Response(
      JSON.stringify({ sessionId: session.id }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
