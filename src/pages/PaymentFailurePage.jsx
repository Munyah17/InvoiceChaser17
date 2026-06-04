import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { supabase } from '../lib/supabase'
import Button from '../components/Button'

export default function PaymentFailurePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { setUserPlan } = useStore()
  const planId = searchParams.get('plan') || 'starter'

  useEffect(() => {
    // Fallback: ensure user is on Free plan if payment failed
    const downgradeToFree = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('profiles').update({ plan: 'free' }).eq('id', user.id)
        setUserPlan('free')
      }
    }
    downgradeToFree()
  }, [setUserPlan])

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="bg-neutral-100 dark:bg-neutral-900 rounded-2xl p-8 border border-neutral-200 dark:border-neutral-800 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg viewBox="0 0 24 24" className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </div>

          <h1 className="font-display font-bold text-3xl text-neutral-950 dark:text-white tracking-tight mb-4">
            Payment Failed
          </h1>

          <p className="text-neutral-500 dark:text-neutral-400 mb-2">
            Your payment could not be processed. Don't worry — you have been registered on the <strong>Free Plan</strong>.
          </p>
          <p className="text-neutral-500 dark:text-neutral-400 mb-8 text-sm">
            You can retry the payment or use a different payment method.
          </p>

          <div className="space-y-3">
            <Button
              variant="primary"
              className="w-full shadow-glow font-semibold"
              onClick={() => navigate(`/checkout?plan=${planId}`)}
            >
              Retry Payment
            </Button>
            <Button
              variant="default"
              className="w-full font-medium"
              onClick={() => navigate('/pricing')}
            >
              View All Plans
            </Button>
            <Button
              variant="default"
              className="w-full font-medium"
              onClick={() => navigate('/app/dashboard')}
            >
              Go to Dashboard (Free)
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
