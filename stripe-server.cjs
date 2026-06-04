// InvoiceChaser Stripe Checkout Server
// Run with: node stripe-server.cjs

require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { createClient } = require('@supabase/supabase-js')
const { Resend } = require('resend')
const request = require('request-promise-native')
const { sha512 } = require('js-sha512')

// Stripe setup — key MUST be set in .env (never hardcode)
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
if (!STRIPE_SECRET_KEY) {
  console.error('FATAL: STRIPE_SECRET_KEY is not set. Copy .env.example to .env and fill in your keys.')
  process.exit(1)
}
const stripe = require('stripe')(STRIPE_SECRET_KEY)

// Supabase setup for webhook database updates
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY
const supabase = SUPABASE_URL && SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  : null

const app = express()
const PORT = 3002

// Allow any localhost origin so Vite port shifts (4181, 4182, etc.) don't break CORS
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      cb(null, true)
    } else {
      cb(new Error('Not allowed by CORS'))
    }
  },
  methods: ['POST', 'GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
}))

// JSON parser for regular routes (NOT webhook — webhook needs raw body)
app.use(express.json())

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', stripe: 'connected', supabase: supabase ? 'connected' : 'not configured' })
})

// Main checkout endpoint
app.post('/checkout', async (req, res) => {
  try {
    const {
      amount,
      name,
      plan_id,
      user_id,
      customer_email,
      customer_name,
      metadata = {}
    } = req.body

    console.log('[/checkout] Creating session:', { amount, name, plan_id, user_id, customer_email })

    if (!amount || !name) {
      return res.status(400).json({ error: 'Missing required fields: amount, name' })
    }

    // Determine if subscription or one-time payment
    const isSubscription = ['starter', 'professional', 'business'].includes(plan_id)
    const isLifetime = plan_id === 'lifetime'

    // Build line_items with dynamic price_data
    const lineItem = {
      price_data: {
        currency: 'usd',
        product_data: {
          name: name,
          description: `InvoiceChaser ${name}`,
        },
        unit_amount: amount,
      },
      quantity: 1,
    }

    // Add recurring for subscriptions
    if (isSubscription) {
      lineItem.price_data.recurring = { interval: 'month' }
    }

    // Build session config
    const sessionConfig = {
      mode: isSubscription ? 'subscription' : 'payment',
      payment_method_types: ['card'],
      line_items: [lineItem],
      metadata: {
        user_id: user_id || 'guest',
        plan_id: plan_id || 'default',
        ...metadata
      },
      success_url: `${req.headers.origin || 'http://localhost:4181'}/payment-success?session_id={CHECKOUT_SESSION_ID}&plan=${plan_id}`,
      cancel_url: `${req.headers.origin || 'http://localhost:4181'}/checkout?plan=${plan_id}`,
      automatic_tax: { enabled: true },
      allow_promotion_codes: true,
    }

    // Add customer email to pre-fill checkout
    if (customer_email) {
      sessionConfig.customer_email = customer_email
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create(sessionConfig)

    console.log('[/checkout] Session created:', session.id, 'mode:', sessionConfig.mode)
    return res.json({ url: session.url, session_id: session.id, mode: sessionConfig.mode })

  } catch (error) {
    console.error('[/checkout] Error:', error)
    return res.status(500).json({ error: error.message })
  }
})

// Webhook endpoint — MUST use express.raw() before express.json()
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature']
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || ''

  let event

  try {
    if (endpointSecret && sig) {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret)
    } else {
      event = JSON.parse(req.body)
    }
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  console.log('Webhook event received:', event.type)

  // Handle checkout session completion
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const { user_id, plan_id } = session.metadata || {}
    const customerId = session.customer
    const subscriptionId = session.subscription

    console.log('Payment successful:', session.id)
    console.log('User:', user_id, 'Plan:', plan_id, 'Customer:', customerId, 'Subscription:', subscriptionId)

    // Update database via Supabase
    if (supabase && user_id && user_id !== 'guest') {
      try {
        // Update user profile plan
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ plan: plan_id, updated_at: new Date().toISOString() })
          .eq('id', user_id)

        if (profileError) {
          console.error('Failed to update profile:', profileError.message)
        } else {
          console.log('Profile updated to plan:', plan_id)
        }

        // Insert or update subscription record
        const { error: subError } = await supabase
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

        if (subError) {
          console.error('Failed to update subscription:', subError.message)
        } else {
          console.log('Subscription record updated')
        }

        // Record the payment
        const amount = session.amount_total || 0
        const { error: payError } = await supabase.from('payments').insert({
          user_id: user_id,
          amount: amount / 100,
          currency: session.currency?.toUpperCase() || 'USD',
          method: 'stripe',
          status: 'completed',
          transaction_ref: session.id,
          metadata: {
            plan_id,
            customer_id: customerId,
            subscription_id: subscriptionId,
          },
        })

        if (payError) {
          console.error('Failed to record payment:', payError.message)
        } else {
          console.log('Payment recorded: $', amount / 100)
        }
      } catch (dbError) {
        console.error('Database update error:', dbError)
      }
    } else {
      console.log('Supabase not configured or no user_id — skipping DB update')
    }
  }

  // Handle failed payments
  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object
    const customerId = invoice.customer
    const subscriptionId = invoice.subscription

    console.log('Payment failed for subscription:', subscriptionId, 'customer:', customerId)

    if (supabase) {
      try {
        // Update subscription status to past_due
        const { error: subError } = await supabase
          .from('subscriptions')
          .update({ status: 'past_due', updated_at: new Date().toISOString() })
          .eq('stripe_subscription_id', subscriptionId)

        if (subError) {
          console.error('Failed to update subscription status:', subError.message)
        }
      } catch (dbError) {
        console.error('Database update error:', dbError)
      }
    }
  }

  res.json({ received: true })
})

// Send email endpoint
app.post('/send-email', async (req, res) => {
  try {
    const { to, subject, html, text } = req.body
    if (!to || !subject) {
      return res.status(400).json({ error: 'Missing required fields: to, subject' })
    }

    const resendApiKey = process.env.RESEND_API_KEY
    if (!resendApiKey) {
      console.warn('RESEND_API_KEY not set — skipping email')
      return res.json({ sent: false, reason: 'RESEND_API_KEY not configured' })
    }

    const resend = new Resend(resendApiKey)
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@invoicechaser.com',
      to,
      subject,
      html,
      text,
    })

    if (error) {
      console.error('Email send error:', error)
      return res.status(500).json({ error: error.message })
    }

    res.json({ sent: true, messageId: data?.id })
  } catch (err) {
    console.error('/send-email error:', err)
    res.status(500).json({ error: err.message })
  }
})

// Verify session endpoint (called by frontend on payment-success page)
// Both /verify-session and /api/verify-session are supported
app.get('/api/verify-session', async (req, res) => {
  try {
    const { session_id } = req.query
    if (!session_id) return res.status(400).json({ error: 'Missing session_id' })
    const session = await stripe.checkout.sessions.retrieve(session_id)
    res.json({
      id: session.id,
      status: session.payment_status,
      plan_id: session.metadata?.plan_id,
      customer_email: session.customer_email,
      amount_total: session.amount_total,
      currency: session.currency,
    })
  } catch (error) {
    console.error('Verify session error:', error)
    res.status(500).json({ error: error.message })
  }
})

app.get('/verify-session', async (req, res) => {
  try {
    const { session_id } = req.query
    if (!session_id) {
      return res.status(400).json({ error: 'Missing session_id' })
    }

    const session = await stripe.checkout.sessions.retrieve(session_id)
    res.json({
      id: session.id,
      status: session.payment_status,
      plan_id: session.metadata?.plan_id,
      customer_email: session.customer_email,
      amount_total: session.amount_total,
      currency: session.currency,
    })
  } catch (error) {
    console.error('Verify session error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Paynow live config
const PAYNOW_ID = process.env.PAYNOW_INTEGRATION_ID || process.env.PAYNOW_ID
const PAYNOW_KEY = process.env.PAYNOW_INTEGRATION_KEY || process.env.PAYNOW_KEY

// Paynow hash must match the exact field order in the form POST body.
// request-promise-native sends fields in Object insertion order, so we build
// the data object in alphabetical order and hash in that same order.
function paynowHash(values, key) {
  let str = ''
  for (const k of Object.keys(values)) {
    if (k !== 'hash') str += values[k]
  }
  str += key.toLowerCase()
  return sha512(str).toUpperCase()
}

async function paynowInitiate({ reference, amount, description, returnUrl, resultUrl, authEmail }) {
  // Keys in alphabetical order so insertion order === alphabetical order
  const data = {
    additionalinfo: description,
    amount: amount.toString(),
    id: PAYNOW_ID,
    reference,
    resulturl: resultUrl,
    returnurl: returnUrl,
    status: 'Message',
  }
  if (authEmail) {
    data.authemail = authEmail
    // Re-insert in alphabetical order
    const sorted = {}
    for (const k of Object.keys(data).sort()) sorted[k] = data[k]
    Object.assign(data, sorted)
  }
  data.hash = paynowHash(data, PAYNOW_KEY)

  const raw = await request({
    method: 'POST',
    uri: 'https://www.paynow.co.zw/interface/initiatetransaction',
    form: data,
    json: false,
  })

  const resp = {}
  for (const pair of raw.split('&')) {
    const [k, v] = pair.split('=')
    resp[decodeURIComponent(k)] = decodeURIComponent(v || '')
  }

  if (resp.status.toLowerCase() === 'error') {
    return { success: false, error: resp.error }
  }

  return {
    success: true,
    redirectUrl: resp.browserurl,
    pollUrl: resp.pollurl,
    reference: resp.reference,
    paynowreference: resp.paynowreference,
    hash: resp.hash,
  }
}


async function paynowPoll(pollUrl) {
  const raw = await request({ uri: pollUrl, json: false })
  const resp = {}
  for (const pair of raw.split('&')) {
    const [k, v] = pair.split('=')
    resp[decodeURIComponent(k)] = decodeURIComponent(v || '')
  }
  return {
    paid: () => resp.status.toLowerCase() === 'paid',
    status: resp.status,
    amount: resp.amount,
    reference: resp.reference,
    paynowreference: resp.paynowreference,
  }
}

// --- Local dev aliases so frontend /api/* calls work ---
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { plan, amount, email, plan_id, user_id, metadata = {} } = req.body
    const isSubscription = ['starter', 'professional', 'business'].includes(plan_id || plan)
    const origin = req.headers.origin || `http://localhost:${PORT}`
    const lineItem = {
      price_data: {
        currency: 'usd',
        product_data: { name: plan },
        unit_amount: amount,
      },
      quantity: 1,
    }
    if (isSubscription) lineItem.price_data.recurring = { interval: 'month' }
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: isSubscription ? 'subscription' : 'payment',
      customer_email: email,
      line_items: [lineItem],
      metadata: { user_id: user_id || 'guest', plan_id: plan_id || plan, ...metadata },
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}&plan=${plan_id || plan}`,
      cancel_url: `${origin}/checkout?plan=${plan_id || plan}`,
      automatic_tax: { enabled: true },
      allow_promotion_codes: true,
    })
    res.json({ url: session.url, session_id: session.id })
  } catch (error) {
    console.error('Checkout error:', error)
    res.status(500).json({ error: error.message })
  }
})


app.post('/api/paynow-pay', async (req, res) => {
  try {
    const { amount, description, reference, email, user_id, plan_id } = req.body
    if (!amount || !description || !reference) return res.status(400).json({ error: 'Missing required fields: amount, description, reference' })
    if (!PAYNOW_ID || !PAYNOW_KEY) return res.status(500).json({ error: 'Paynow credentials not configured' })

    const frontendUrl = process.env.VITE_APP_URL || req.headers.origin || 'http://localhost:4181'
    const resultUrl = process.env.PAYNOW_RESULT_URL || `http://localhost:3002/api/paynow-result`

    let response
    try {
      response = await paynowInitiate({
        reference,
        amount: parseFloat(amount),
        description: `InvoiceChaser — ${description}`,
        returnUrl: `${frontendUrl}/payment-success?method=paynow&plan=${plan_id || 'professional'}&ref=${reference}`,
        resultUrl,
        authEmail: email || 'payments@invoicechaser.com',
      })
    } catch (sdkErr) {
      console.error('Paynow API error:', sdkErr)
      return res.status(500).json({ error: sdkErr.message || 'Paynow API error' })
    }

    if (!response || !response.success) {
      const decodedError = response?.error ? decodeURIComponent(response.error.replace(/\+/g, ' ')) : 'Paynow transaction failed'
      return res.status(402).json({ error: decodedError })
    }

    if (supabase) {
      await supabase.from('payments').insert({
        user_id: user_id || null,
        amount: parseFloat(amount),
        currency: 'USD',
        method: 'paynow',
        status: 'pending',
        transaction_ref: reference,
        metadata: { paynow_poll_url: response.pollUrl, paynow_reference: reference, plan_id: plan_id || null },
      })
    }

    res.json({
      success: true,
      url: response.redirectUrl,
      pollUrl: response.pollUrl,
      reference,
    })
  } catch (error) {
    console.error('Paynow payment error:', error)
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/paynow-poll', async (req, res) => {
  try {
    const { pollUrl } = req.body
    if (!pollUrl) return res.status(400).json({ error: 'Missing pollUrl' })
    const status = await paynowPoll(pollUrl)
    res.json({ paid: status.paid(), status: status.status, amount: status.amount, reference: status.reference, paynowReference: status.paynowreference })
  } catch (error) {
    console.error('Paynow poll error:', error)
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/paynow-result', async (req, res) => {
  try {
    const { status, reference, paynowreference, amount } = req.body
    console.log('Paynow result callback:', { status, reference, paynowreference, amount })
    if (supabase && reference) {
      const newStatus = status === 'Paid' || status === 'paid' ? 'completed' : 'failed'
      await supabase.from('payments').update({ status: newStatus, metadata: { paynow_status: status, paynow_reference: paynowreference, paynow_amount: amount } }).eq('transaction_ref', reference)
    }
    res.json({ received: true, status, reference })
  } catch (error) {
    console.error('Paynow result error:', error)
    res.status(500).json({ error: error.message })
  }
})

app.listen(PORT, () => {
  console.log(`✅ API Server running on http://localhost:${PORT}`)
  console.log(`📋 Endpoints:`)
  console.log(`   POST http://localhost:${PORT}/checkout`)
  console.log(`   GET  http://localhost:${PORT}/verify-session`)
  console.log(`   POST http://localhost:${PORT}/webhook`)
  console.log(`   POST http://localhost:${PORT}/api/create-checkout-session`)
  console.log(`   POST http://localhost:${PORT}/api/paynow-pay`)
  console.log(`   POST http://localhost:${PORT}/api/ecocash-pay`)
  console.log(`   GET  http://localhost:${PORT}/health`)
  console.log('')
  console.log('⚠️  IMPORTANT: Keep your secret key safe! Never commit it to git.')
})
