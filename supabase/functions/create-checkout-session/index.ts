import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { 
      amount, 
      product_name, 
      user_id, 
      plan_id, 
      success_url, 
      cancel_url,
      customer_email,
      customer_name,
      metadata = {}
    } = await req.json()

    // Validate required fields
    if (!amount || !product_name || !user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: amount, product_name, user_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get Stripe secret key from environment
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeSecretKey) {
      return new Response(
        JSON.stringify({ error: 'Stripe secret key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    })

    // Get site URL
    const siteUrl = Deno.env.get('SITE_URL') || 'http://localhost:5173'

    // Prepare session config
    const sessionConfig: any = {
      mode: amount >= 10000 ? 'payment' : 'subscription', // One-time for lifetime, subscription for monthly
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: product_name,
              description: `InvoiceChaser ${product_name}`,
            },
            unit_amount: amount, // Amount in cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        user_id: user_id,
        plan_id: plan_id || 'default',
        ...metadata
      },
      success_url: success_url || `${siteUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancel_url || `${siteUrl}/plans`,
    }

    // Add customer email if provided
    if (customer_email) {
      sessionConfig.customer_email = customer_email
    }

    // Create or retrieve customer if name provided
    if (customer_name && customer_email) {
      try {
        // Try to find existing customer
        const customers = await stripe.customers.list({
          email: customer_email,
          limit: 1
        })
        
        if (customers.data.length > 0) {
          sessionConfig.customer = customers.data[0].id
        } else {
          // Create new customer
          const customer = await stripe.customers.create({
            name: customer_name,
            email: customer_email,
            phone: metadata.phone || undefined,
            address: metadata.address ? {
              line1: metadata.address,
              city: metadata.city,
              country: metadata.country
            } : undefined
          })
          sessionConfig.customer = customer.id
        }
      } catch (e) {
        console.log('Customer creation skipped:', e.message)
      }
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create(sessionConfig)

    return new Response(
      JSON.stringify({ 
        url: session.url,
        session_id: session.id 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error creating checkout session:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to create checkout session' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
