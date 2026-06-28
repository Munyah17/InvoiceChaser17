import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { signUp, signIn, supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import Button from '../components/Button'
import { formatDateTime } from '../utils/dateFormat'

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: 'forever',
    description: 'Basic features',
    features: ['1 invoice/week', 'Email reminders', 'PDF export'],
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 4.99,
    period: 'month',
    description: 'For freelancers',
    features: ['100 invoices/month', 'PDF export', 'Customer management'],
    popular: false,
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 11.99,
    period: 'month',
    description: 'For growing businesses',
    features: ['Unlimited invoices', 'BOQ/BOM Engine', 'Priority support'],
    popular: true,
  },
  {
    id: 'business',
    name: 'Business',
    price: 29.99,
    period: 'month',
    description: 'For teams & agencies',
    features: ['5 team users', 'White-label', 'SLA guarantee'],
    popular: false,
  },
  {
    id: 'lifetime',
    name: 'Lifetime',
    price: 99,
    period: 'one-time',
    description: 'Pay once, use forever',
    features: ['All Pro features', 'Lifetime updates', 'Priority support'],
    popular: false,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: null,
    period: 'custom',
    description: 'Tailored for large orgs',
    features: ['Custom SLA', 'Dedicated manager', 'SSO integration'],
    popular: false,
  },
]

export default function RegisterPage() {
  const [fullName, setFullName] = useState('')
  const [company, setCompany] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState('')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { setUser, setSession } = useStore()

  const rawRedirect = searchParams.get('redirect')
  const redirectUrl = rawRedirect?.startsWith('/') ? rawRedirect : '/app/dashboard'
  const preselectedPlan = searchParams.get('plan')

  // Pre-select plan from URL
  useEffect(() => {
    if (preselectedPlan && PLANS.find(p => p.id === preselectedPlan)) {
      setSelectedPlan(preselectedPlan)
    }
  }, [preselectedPlan])

  const handlePlanSelect = (planId) => {
    setSelectedPlan(planId)
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!selectedPlan) {
      setError('Please select a plan')
      return
    }

    if (!fullName || !company || !email || !password) {
      setError('Please fill in all fields')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    try {
      const { data, error: signUpError } = await signUp(email, password, {
        full_name: fullName,
        company_name: company,
        selected_plan: selectedPlan,
      })

      if (signUpError) {
        setError(signUpError.message)
        setLoading(false)
        return
      }

      const { data: signInData, error: signInError } = await signIn(email, password)

      if (signInError) {
        setError('Account created but failed to sign in. Please try logging in.')
        setLoading(false)
        return
      }

      setUser(signInData.user)
      setSession(signInData.session)

      // Handle Enterprise: show request submitted
      if (selectedPlan === 'enterprise') {
        // Save enterprise request to DB (fire and forget)
        try {
          await supabase.from('enterprise_requests').insert({
            user_id: signInData.user.id,
            name: fullName,
            email: email,
            company: company,
            status: 'pending',
          })

          // Notify admin via email
          fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: import.meta.env.VITE_ADMIN_EMAIL || 'admin@invoicechaser.com',
              subject: `New Enterprise Request from ${fullName}`,
              html: `<p><strong>Name:</strong> ${fullName}</p>
                     <p><strong>Email:</strong> ${email}</p>
                     <p><strong>Company:</strong> ${company || 'N/A'}</p>
                     <p>Submitted at: ${formatDateTime(new Date())}</p>`,
              text: `New Enterprise Request from ${fullName}\nEmail: ${email}\nCompany: ${company || 'N/A'}`,
            }),
          }).catch(err => console.error('Admin email failed:', err))
        } catch (e) {
          console.error('Failed to save enterprise request:', e)
        }
        setSubmitted(true)
        setLoading(false)
        return
      }

      // Free plan: go to dashboard
      if (selectedPlan === 'free') {
        navigate('/app/dashboard')
        return
      }

      // Paid plans: redirect to checkout
      navigate(`/checkout?plan=${selectedPlan}`)
    } catch (error) {
      console.error('Registration error:', error)
      setError('Failed to create account. Please try again or contact support.')
      setLoading(false)
    }
  }

  // Enterprise request submitted state
  if (submitted) {
    return (
      <div className="min-h-screen bg-white dark:bg-neutral-950 flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg viewBox="0 0 24 24" className="w-10 h-10 stroke-green-600 dark:stroke-green-400 fill-none stroke-2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 className="font-display font-bold text-2xl text-neutral-950 dark:text-white mb-3">
            Request Submitted
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mb-2">
            Thank you for your interest in our Enterprise plan.
          </p>
          <p className="text-neutral-500 dark:text-neutral-400 mb-6">
            Our team will review your request and contact you at <span className="text-neutral-950 dark:text-white font-medium">{email}</span> shortly.
          </p>
          <Link to="/app/dashboard">
            <Button variant="primary" className="font-semibold">
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-neutral-950 dark:bg-white rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 24 24" className="w-8 h-8 fill-white dark:fill-neutral-950">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <h1 className="font-display font-bold text-3xl text-neutral-950 dark:text-white mb-2">Create Account</h1>
          <p className="text-neutral-500 dark:text-neutral-400">Select a plan and fill in your details to get started</p>
        </div>

        {/* Plan Selection */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-white mb-4 text-center">Select a Plan</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {PLANS.map((plan) => (
              <button
                key={plan.id}
                onClick={() => handlePlanSelect(plan.id)}
                className={`relative text-left p-4 rounded-xl border-2 transition-all ${
                  selectedPlan === plan.id
                    ? 'border-neutral-900 dark:border-white bg-neutral-100 dark:bg-neutral-800'
                    : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-300 dark:hover:border-neutral-700'
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-2 left-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                    Popular
                  </span>
                )}
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm text-neutral-900 dark:text-white">{plan.name}</span>
                  {selectedPlan === plan.id && (
                    <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-neutral-900 dark:stroke-white fill-none stroke-2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                <div className="mb-2">
                  {plan.price !== null ? (
                    <span className="font-bold text-lg text-neutral-900 dark:text-white">
                      ${plan.price}<span className="text-xs font-normal text-neutral-500">/{plan.period}</span>
                    </span>
                  ) : (
                    <span className="font-bold text-lg text-neutral-900 dark:text-white">Custom</span>
                  )}
                </div>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">{plan.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Account Form */}
        <div className="bg-neutral-100 dark:bg-neutral-900/50 backdrop-blur-sm border border-neutral-300 dark:border-neutral-700/50 rounded-3xl p-8 shadow-2xl max-w-md mx-auto">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-2">
                Full Name
              </label>
              <input
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-300 dark:border-neutral-700/50 rounded-xl text-neutral-950 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:border-neutral-950 dark:focus:border-white focus:bg-white dark:focus:bg-neutral-900/70 transition-all"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-2">
                Company Name
              </label>
              <input
                type="text"
                placeholder="Acme Inc"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-300 dark:border-neutral-700/50 rounded-xl text-neutral-950 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:border-neutral-950 dark:focus:border-white focus:bg-white dark:focus:bg-neutral-900/70 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-300 dark:border-neutral-700/50 rounded-xl text-neutral-950 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:border-neutral-950 dark:focus:border-white focus:bg-white dark:focus:bg-neutral-900/70 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-2">
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-300 dark:border-neutral-700/50 rounded-xl text-neutral-950 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:border-neutral-950 dark:focus:border-white focus:bg-white dark:focus:bg-neutral-900/70 transition-all"
              />
              <p className="text-xs text-neutral-500 mt-2">Must be at least 6 characters</p>
            </div>

            {error && (
              <div className="p-4 bg-red-900/50 border border-red-700/50 rounded-xl text-sm text-red-400">
                {error}
              </div>
            )}

            <Button
              variant="primary"
              className="w-full font-semibold text-lg py-4 bg-neutral-200 dark:bg-neutral-800 text-neutral-950 dark:text-white hover:bg-neutral-300 dark:hover:bg-neutral-700 border-neutral-300 dark:border-neutral-700"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  Creating account...
                </span>
              ) : selectedPlan === 'enterprise' ? (
                'Submit Request'
              ) : selectedPlan && ['starter','professional','business','lifetime'].includes(selectedPlan) ? (
                'Create Account & Proceed to Checkout'
              ) : (
                'Create Account'
              )}
            </Button>
          </form>

          <div className="mt-8 pt-8 border-t border-neutral-300 dark:border-neutral-700/50">
            <p className="text-center text-neutral-500 dark:text-neutral-400">
              Already have an account?{' '}
              <Link to="/login" className="text-neutral-950 dark:text-white font-medium hover:underline">
                Sign in here
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link to="/" className="text-neutral-500 dark:text-neutral-500 text-sm hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
