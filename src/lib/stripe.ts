// Stripe Checkout integration for InvoiceChaser
// Uses Stripe.js for direct redirect to checkout

import { loadStripe } from '@stripe/stripe-js'

export interface CheckoutSessionParams {
  amount: number // Amount in cents (e.g., 499 for $4.99)
  product_name: string
  user_id: string
  plan_id?: string
  success_url?: string
  cancel_url?: string
}

// Demo mode - set to true to test UI without Stripe
const DEMO_MODE = false

// Load Stripe with publishable key
const stripePromise = loadStripe(import.meta.env?.VITE_STRIPE_PUBLISHABLE_KEY || '')

export async function createCheckoutSession(params: CheckoutSessionParams): Promise<{ url: string | null; error?: string }> {
  // DEMO MODE: Simulate successful checkout for UI testing
  if (DEMO_MODE) {
    console.log('DEMO MODE: Simulating checkout for', params.plan_id)
    await new Promise(resolve => setTimeout(resolve, 1500))
    return { url: `${params.success_url || window.location.origin}/payment-success?demo=true&plan=${params.plan_id}` }
  }

  try {
    const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL
    const supabaseKey = import.meta.env?.VITE_SUPABASE_ANON_KEY

    console.log('Creating checkout session:', { 
      plan: params.plan_id, 
      amount: params.amount,
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey
    })

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase configuration')
      return { url: null, error: 'Payment service not configured. Please contact support.' }
    }

    // Try Edge Function first
    const response = await fetch(`${supabaseUrl}/functions/v1/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify(params),
    })

    console.log('Response status:', response.status)

    // If Edge Function not deployed (404), fall back to direct Stripe redirect
    if (response.status === 404 || response.status === 502) {
      console.log('Edge Function not available, using direct Stripe redirect')
      return await createDirectStripeCheckout(params)
    }

    const data = await response.json()
    console.log('Response data:', data)

    if (!response.ok) {
      console.error('Checkout session creation failed:', data)
      return { url: null, error: data.error || `Server error: ${response.status}` }
    }

    if (data.url) {
      return { url: data.url }
    } else {
      return { url: null, error: 'No checkout URL returned' }
    }
  } catch (error) {
    console.error('Error creating checkout session:', error)
    // Try direct Stripe as fallback
    return await createDirectStripeCheckout(params)
  }
}

// Fallback: Create checkout using Stripe.js directly
async function createDirectStripeCheckout(params: CheckoutSessionParams): Promise<{ url: string | null; error?: string }> {
  try {
    const stripe = await stripePromise
    if (!stripe) {
      return { url: null, error: 'Stripe not initialized. Please check your configuration.' }
    }

    // For direct checkout without backend, we'll use Stripe's client-only checkout
    // This requires setting up products in Stripe Dashboard first
    const { error } = await stripe.redirectToCheckout({
      lineItems: [
        {
          price: getStripePriceId(params.plan_id || ''), // Get price ID from mapping
          quantity: 1,
        },
      ],
      mode: 'subscription',
      successUrl: params.success_url || `${window.location.origin}/payment-success`,
      cancelUrl: params.cancel_url || `${window.location.origin}/plans`,
      clientReferenceId: params.user_id,
    })

    if (error) {
      console.error('Stripe redirect error:', error)
      return { url: null, error: error.message }
    }

    return { url: null } // Will redirect, so no URL returned
  } catch (error) {
    console.error('Direct Stripe checkout error:', error)
    return { url: null, error: error instanceof Error ? error.message : 'Stripe checkout failed' }
  }
}

// Map plan IDs to Stripe Price IDs (configure these in your Stripe Dashboard)
function getStripePriceId(planId: string): string {
  const priceIds: Record<string, string> = {
    'starter': import.meta.env?.VITE_STRIPE_STARTER_PRICE_ID || '',
    'professional': import.meta.env?.VITE_STRIPE_PROFESSIONAL_PRICE_ID || '',
    'business': import.meta.env?.VITE_STRIPE_BUSINESS_PRICE_ID || '',
    'lifetime': import.meta.env?.VITE_STRIPE_LIFETIME_PRICE_ID || '',
  }
  return priceIds[planId] || ''
}

// Helper to redirect to Stripe Checkout
export async function redirectToCheckout(params: CheckoutSessionParams): Promise<boolean> {
  const { url, error } = await createCheckoutSession(params)
  
  if (error) {
    console.error('Checkout error:', error)
    return false
  }
  
  if (url) {
    window.location.href = url
    return true
  }
  
  return false
}

// Plan pricing configuration (amounts in cents)
export const PLAN_PRICES = {
  starter: {
    monthly: 499, // $4.99
    yearly: 4999, // $49.99 (2 months free)
    name: 'Starter Plan',
  },
  professional: {
    monthly: 1199, // $11.99
    yearly: 11999, // $119.99 (2 months free)
    name: 'Professional Plan',
  },
  business: {
    monthly: 2999, // $29.99
    yearly: 29999, // $299.99 (2 months free)
    name: 'Business Plan',
  },
  lifetime: {
    oneTime: 9900, // $99.00
    name: 'Lifetime Access',
  },
}
