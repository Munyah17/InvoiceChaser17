import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { PLAN_PRICES } from '../lib/stripe'

export default function CheckoutPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useStore()

  const planId = searchParams.get('plan') || 'professional'
  const plan = PLAN_PRICES[planId]

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [gateway, setGateway] = useState('stripe')

  if (!plan) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">Invalid Plan</h1>
          <p className="text-neutral-500 dark:text-neutral-400 mb-4">The selected plan doesn't exist.</p>
          <button
            onClick={() => navigate('/plans')}
            className="px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-lg font-medium"
          >
            View Plans
          </button>
        </div>
      </div>
    )
  }

  const formatPrice = (cents) => `$${(cents / 100).toFixed(2)}`

  const handleCheckout = async () => {
    setIsLoading(true)
    setError('')
    try {
      if (gateway === 'stripe') {
        await redirectToStripe()
      } else {
        await redirectToPaynow()
      }
    } catch (err) {
      console.error('Checkout error:', err)
      setError(err.message || 'Could not reach payment gateway. Please try again.')
      setIsLoading(false)
    }
  }

  const redirectToStripe = async () => {
    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan: plan.name,
        amount: plan.monthly || plan.oneTime,
        email: user?.email,
        plan_id: planId,
        user_id: user?.id || null,
      }),
    })

    const text = await response.text()
    let data
    try {
      data = JSON.parse(text)
    } catch {
      throw new Error(`Gateway error: ${text.substring(0, 120) || 'Empty response — is the dev server running? Use npm run dev'}`)
    }

    if (!response.ok) throw new Error(data.error || `Server error: ${response.status}`)
    if (!data.url) throw new Error('No checkout URL received from Stripe')

    window.location.href = data.url
  }

  const redirectToPaynow = async () => {
    const reference = `IC-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
    const amountDollars = (plan.monthly || plan.oneTime) / 100

    const response = await fetch('/api/paynow-pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: amountDollars,
        description: plan.name,
        reference,
        email: user?.email,
        user_id: user?.id || null,
        plan_id: planId,
      }),
    })

    const text = await response.text()
    let data
    try {
      data = JSON.parse(text)
    } catch {
      throw new Error(`Gateway error: ${text.substring(0, 120) || 'Empty response — is the dev server running? Use npm run dev'}`)
    }

    if (!response.ok || !data.success) throw new Error(data.error || 'Paynow payment initiation failed')
    if (!data.url) throw new Error('No redirect URL received from Paynow')

    if (data.pollUrl) {
      sessionStorage.setItem('paynow_poll_url', data.pollUrl)
      sessionStorage.setItem('paynow_reference', reference)
      sessionStorage.setItem('paynow_plan_id', planId)
    }

    window.location.href = data.url
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 py-12 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">Complete Your Purchase</h1>
          <p className="text-neutral-500 dark:text-neutral-400">Select a payment gateway — you'll be redirected to their secure checkout</p>
        </div>

        {/* Order Summary */}
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6 mb-6">
          <h2 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-4">Order Summary</h2>
          <div className="flex justify-between items-center py-3 border-b border-neutral-100 dark:border-neutral-800">
            <div>
              <p className="font-medium text-neutral-900 dark:text-white">{plan.name}</p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {plan.monthly ? 'Monthly subscription' : 'One-time payment'}
              </p>
            </div>
            <p className="text-xl font-bold text-neutral-900 dark:text-white">
              {formatPrice(plan.monthly || plan.oneTime)}
            </p>
          </div>
          <div className="flex justify-between items-center pt-3">
            <p className="font-semibold text-neutral-900 dark:text-white">Total due today</p>
            <p className="text-2xl font-bold text-neutral-900 dark:text-white">
              {formatPrice(plan.monthly || plan.oneTime)}
            </p>
          </div>
        </div>

        {/* Gateway Selector */}
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6 mb-6">
          <h2 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-4">Payment Gateway</h2>
          <div className="space-y-3">
            {/* Stripe */}
            <button
              type="button"
              onClick={() => setGateway('stripe')}
              className={`w-full flex items-center rounded-xl border transition-all px-6 py-4 ${
                gateway === 'stripe'
                  ? 'border-sky-500 bg-white dark:bg-neutral-800 shadow-md'
                  : 'border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:border-neutral-400'
              }`}
            >
              <div className="flex-1 flex items-center">
                <img src="/stripe-logo.png" alt="Stripe" className="h-10 w-auto object-contain" />
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                gateway === 'stripe' ? 'border-sky-500' : 'border-neutral-400'
              }`}>
                {gateway === 'stripe' && <div className="w-2.5 h-2.5 rounded-full bg-sky-500" />}
              </div>
            </button>

            {/* Paynow */}
            <button
              type="button"
              onClick={() => setGateway('paynow')}
              className={`w-full flex items-center rounded-xl border transition-all px-6 py-4 ${
                gateway === 'paynow'
                  ? 'border-sky-500 bg-white dark:bg-neutral-800 shadow-md'
                  : 'border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:border-neutral-400'
              }`}
            >
              <div className="flex-1 flex items-center">
                <img src="/paynow-logo.png" alt="Paynow" className="h-12 w-auto object-contain" />
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                gateway === 'paynow' ? 'border-sky-500' : 'border-neutral-400'
              }`}>
                {gateway === 'paynow' && <div className="w-2.5 h-2.5 rounded-full bg-sky-500" />}
              </div>
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <button
          onClick={handleCheckout}
          disabled={isLoading}
          className="w-full py-4 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-xl font-semibold text-base hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Redirecting to {gateway === 'stripe' ? 'Stripe' : 'Paynow'}...
            </>
          ) : (
            `Continue to ${gateway === 'stripe' ? 'Stripe' : 'Paynow'} Checkout — ${formatPrice(plan.monthly || plan.oneTime)}`
          )}
        </button>

        <button
          type="button"
          onClick={() => navigate('/plans')}
          disabled={isLoading}
          className="w-full mt-3 py-2 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
        >
          ← Back to Plans
        </button>

        <p className="text-center text-xs text-neutral-500 dark:text-neutral-400 mt-5">
          You will be redirected to {gateway === 'stripe' ? "Stripe's" : "Paynow's"} secure checkout.
          InvoiceChaser never sees or stores your payment details.
        </p>
      </div>
    </div>
  )
}
