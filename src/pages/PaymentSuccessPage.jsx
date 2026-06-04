import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { supabase } from '../lib/supabase'
import Button from '../components/Button'

export default function PaymentSuccessPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { setUserPlan } = useStore()
  const [loading, setLoading] = useState(true)
  const [sessionData, setSessionData] = useState(null)
  const isDemo = searchParams.get('demo') === 'true'
  const demoPlan = searchParams.get('plan') || 'professional'

  const method = searchParams.get('method')

  useEffect(() => {
    const processPayment = async () => {
      if (isDemo) {
        setSessionData({ plan: demoPlan, status: 'active' })
        setUserPlan(demoPlan)
        setLoading(false)
        return
      }

      // Paynow / EcoCash path — verify by polling the gateway
      if (method === 'paynow' || method === 'ecocash') {
        const planId = searchParams.get('plan') || 'professional'
        const pollUrl = sessionStorage.getItem('paynow_poll_url')

        if (pollUrl) {
          // Poll up to 6 times (12 s total) waiting for the gateway to confirm
          let paid = false
          for (let i = 0; i < 6; i++) {
            try {
              const pollRes = await fetch('/api/paynow-poll', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pollUrl }),
              })
              const pollData = await pollRes.json()
              if (pollData.paid) { paid = true; break }
              if (['cancelled', 'failed', 'error'].includes((pollData.status || '').toLowerCase())) break
            } catch (_) { /* network hiccup — keep polling */ }
            await new Promise(r => setTimeout(r, 2000))
          }

          if (!paid) {
            // Gateway hasn't confirmed yet — navigate to failure so user can retry
            sessionStorage.removeItem('paynow_poll_url')
            sessionStorage.removeItem('paynow_reference')
            sessionStorage.removeItem('paynow_plan_id')
            navigate(`/payment-failure?plan=${planId}`)
            return
          }
        }
        // Confirmed paid (or no pollUrl — trust the returnUrl for mobile)
        sessionStorage.removeItem('paynow_poll_url')
        sessionStorage.removeItem('paynow_reference')
        sessionStorage.removeItem('paynow_plan_id')

        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase.from('profiles').update({ plan: planId }).eq('id', user.id)
          await supabase.from('subscriptions').upsert({
            user_id: user.id, plan: planId, status: 'active',
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' })
        }
        setUserPlan(planId)
        setSessionData({ plan: planId, status: 'paid', method })
        setLoading(false)
        return
      }

      const sessionId = searchParams.get('session_id')
      if (!sessionId) {
        navigate('/pricing')
        return
      }

      try {
        // 1. Verify with our backend
        const verifyRes = await fetch(`/api/verify-session?session_id=${sessionId}`)
        const verifyData = await verifyRes.json()

        if (verifyData.error) throw new Error(verifyData.error)

        const planId = verifyData.plan_id || searchParams.get('plan')
        const isPaid = verifyData.status === 'paid'

        if (isPaid && planId) {
          // 2. Update user profile in Supabase (frontend fallback in case webhook missed)
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            await supabase.from('profiles').update({ plan: planId }).eq('id', user.id)
            await supabase.from('subscriptions').upsert({
              user_id: user.id,
              plan: planId,
              status: 'active',
              updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' })
            setUserPlan(planId)
          }
        }

        setSessionData({
          plan: planId,
          status: verifyData.status,
          amount: verifyData.amount_total,
          currency: verifyData.currency,
        })
      } catch (error) {
        console.error('Payment verification error:', error)
      } finally {
        setLoading(false)
      }
    }

    processPayment()
  }, [searchParams, navigate, setUserPlan, isDemo, demoPlan, method])

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-neutral-950 dark:border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-neutral-500 dark:text-neutral-400">Processing your payment...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="bg-neutral-100 dark:bg-neutral-900 rounded-2xl p-8 border border-neutral-200 dark:border-neutral-800 text-center">
          {isDemo && (
            <div className="mb-4 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm font-medium">
              DEMO MODE - No actual payment processed
            </div>
          )}
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg viewBox="0 0 24 24" className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <h1 className="font-display font-bold text-3xl text-neutral-950 dark:text-white tracking-tight mb-4">
            {isDemo ? 'Demo Payment Successful!' : 'Payment Successful!'}
          </h1>

          <p className="text-neutral-500 dark:text-neutral-400 mb-8">
            {isDemo
              ? 'This was a test. To enable real payments, deploy the Edge Function (see STRIPE_SETUP.md).'
              : 'Your subscription has been activated. You now have full access to all features.'}
          </p>

          {sessionData && (
            <div className="bg-neutral-200 dark:bg-neutral-800 rounded-xl p-4 mb-8 text-left">
              <div className="flex justify-between items-center mb-2">
                <span className="text-neutral-500 dark:text-neutral-400">Plan:</span>
                <span className="font-semibold text-neutral-950 dark:text-white capitalize">{sessionData.plan}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-neutral-500 dark:text-neutral-400">Status:</span>
                <span className="font-semibold text-green-600 capitalize">{sessionData.status}</span>
              </div>
              {sessionData.amount && (
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500 dark:text-neutral-400">Amount:</span>
                  <span className="font-semibold text-neutral-950 dark:text-white">
                    ${(sessionData.amount / 100).toFixed(2)} {sessionData.currency?.toUpperCase()}
                  </span>
                </div>
              )}
            </div>
          )}

          <Button
            variant="primary"
            className="w-full shadow-glow font-semibold"
            onClick={() => navigate('/app/dashboard')}
          >
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}
