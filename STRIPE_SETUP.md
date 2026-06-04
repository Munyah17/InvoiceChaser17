# Stripe Checkout Setup Guide

## Quick Fix for "Failed to initiate checkout" Error

The error occurs because the Supabase Edge Function `create-checkout-session` isn't deployed.

### Step 1: Deploy the Edge Function

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Deploy the Edge Function
supabase functions deploy create-checkout-session
```

### Step 2: Set Environment Variables in Supabase

Go to Supabase Dashboard → Edge Functions → Secrets:

```
STRIPE_SECRET_KEY=sk_live_... or sk_test_...
SITE_URL=https://yourdomain.com or http://localhost:5173
```

### Step 3: Test with Stripe Test Card

Use these test card numbers:
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- Any future expiry date
- Any 3-digit CVC

### Alternative: Test Mode (No Stripe Required)

If you want to test the UI without setting up Stripe, I can add a mock payment mode.

## Environment Variables Checklist

Your `.env` file should have:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Verify Function is Running

Test the function directly:
```bash
curl -X POST https://your-project.supabase.co/functions/v1/create-checkout-session \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"amount":499,"product_name":"Test","user_id":"test"}'
```

Should return: `{"url":"https://checkout.stripe.com/..."}`
