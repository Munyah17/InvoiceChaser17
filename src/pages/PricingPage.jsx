import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useStore } from '../store/useStore'
import Button from '../components/Button'
import { getPlanPrices } from '../lib/pricing'

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 4.99,
    currency: 'USD',
    period: 'month',
    features: [
      '20 invoices/month',
      'Email reminders',
      'PDF export',
      'Basic analytics',
      'Customer management',
      '5 BOQ/week',
    ],
    popular: false,
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 11.99,
    currency: 'USD',
    period: 'month',
    features: [
      'Unlimited invoices',
      'Full automation',
      'BOQ/BOM Engine',
      'API access',
      'Advanced analytics',
      'Priority support',
    ],
    popular: true,
  },
  {
    id: 'business',
    name: 'Business',
    price: 29.99,
    currency: 'USD',
    period: 'month',
    features: [
      'Multi-user access (5 users)',
      'White-label invoices',
      'Team collaboration',
      'Custom branding',
      'Priority support',
      'SLA guarantee',
    ],
    popular: false,
  },
]

export default function PricingPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useStore()

  // Live prices from app_pricing (super-admin editable), keyed by plan id.
  const [priceMap, setPriceMap] = useState({})
  useEffect(() => {
    getPlanPrices().then(list => {
      const m = {}
      list.forEach(p => { m[p.plan_key] = Number(p.amount_cents) / 100 })
      setPriceMap(m)
    })
  }, [])
  const priceOf = (id, fallback) => (priceMap[id] != null ? priceMap[id] : fallback)

  // Check if a plan is pre-selected from URL
  const preselectedPlan = searchParams.get('plan')

  const handleGetStarted = (planId) => {
    if (!user) {
      // Redirect to register with plan pre-selected, then checkout
      navigate(`/register?redirect=/checkout?plan=${planId}`)
      return
    }
    // Redirect to checkout page
    navigate(`/checkout?plan=${planId}`)
  }

  return (
    <div className="min-h-screen bg-neutral-950 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="font-display font-bold text-4xl text-white tracking-tight mb-4">
            Choose Your Plan
          </h1>
          <p className="text-lg text-neutral-400 max-w-2xl mx-auto">
            Start automating your invoice chasing today. All plans include a 14-day free trial.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto px-4">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-neutral-900/50 p-8 rounded-2xl border-2 transition-all ${
                plan.popular
                  ? 'border-white bg-neutral-900/30'
                  : 'border-neutral-800/30'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-neutral-950 px-4 py-1 rounded-full text-sm font-semibold">
                  Most Popular
                </div>
              )}

              <h3 className="font-display font-bold text-2xl text-white tracking-tight mb-2">
                {plan.name}
              </h3>
              <div className="mb-6">
                <span className="font-display font-bold text-4xl text-white">
                  ${priceOf(plan.id, plan.price)}
                </span>
                <span className="text-neutral-400">/{plan.period}</span>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <svg
                      viewBox="0 0 24 24"
                      className="w-5 h-5 text-white flex-shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span className="text-neutral-300">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                variant={plan.popular ? 'primary' : 'default'}
                className={`w-full font-semibold ${
                  plan.popular
                    ? 'bg-white text-neutral-950 hover:bg-neutral-200 border-white'
                    : 'bg-neutral-800 text-white hover:bg-neutral-700 border-neutral-700'
                }`}
                onClick={() => handleGetStarted(plan.id)}
              >
                {user ? 'Upgrade Plan' : 'Get Started'}
              </Button>
            </div>
          ))}
        </div>

        {/* Enterprise + Lifetime Section */}
        <div className="max-w-7xl mx-auto mt-12 px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Enterprise */}
            <div className="bg-neutral-900/50 rounded-3xl p-8 border border-neutral-700/50 flex flex-col justify-between">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-900/50 text-neutral-300 rounded-full text-sm font-semibold mb-4 border border-neutral-700/50">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                  Custom Solution
                </div>
                <h2 className="font-display font-bold text-3xl lg:text-4xl text-white mb-3 tracking-tight">
                  Enterprise
                </h2>
                <p className="text-neutral-300 mb-4">
                  Tailored solutions for large organizations. Dedicated support, custom SLAs, and on-premise deployment options.
                </p>
                <ul className="text-sm text-neutral-300 space-y-2">
                  <li className="flex items-center gap-2">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-white fill-none stroke-2 flex-shrink-0"><polyline points="20 6 9 17 4 12"/></svg>
                    Dedicated account manager
                  </li>
                  <li className="flex items-center gap-2">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-white fill-none stroke-2 flex-shrink-0"><polyline points="20 6 9 17 4 12"/></svg>
                    Custom SLA & branding
                  </li>
                  <li className="flex items-center gap-2">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-white fill-none stroke-2 flex-shrink-0"><polyline points="20 6 9 17 4 12"/></svg>
                    On-premise & SSO options
                  </li>
                </ul>
              </div>
              <div className="mt-6 text-left">
                <div className="text-neutral-400 mb-4">Custom pricing based on your needs</div>
                <Button
                  variant="default"
                  size="lg"
                  className="bg-white text-neutral-950 hover:bg-neutral-200 border-white font-semibold"
                  onClick={() => handleGetStarted('enterprise')}
                >
                  {user ? 'Contact Sales' : 'Contact Sales'}
                </Button>
              </div>
            </div>

            {/* Lifetime */}
            <div className="bg-neutral-900/50 rounded-3xl p-8 border border-neutral-700/50 flex flex-col justify-between">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-900/50 text-neutral-300 rounded-full text-sm font-semibold mb-4 border border-neutral-700/50">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                  Limited Time Offer
                </div>
                <h2 className="font-display font-bold text-3xl lg:text-4xl text-white mb-3 tracking-tight">
                  Lifetime Access
                </h2>
                <p className="text-neutral-300 mb-4">
                  Pay once, use forever. No monthly fees, no subscriptions.
                </p>
                <ul className="text-sm text-neutral-300 space-y-2">
                  <li className="flex items-center gap-2">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-white fill-none stroke-2 flex-shrink-0"><polyline points="20 6 9 17 4 12"/></svg>
                    All Professional features included
                  </li>
                  <li className="flex items-center gap-2">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-white fill-none stroke-2 flex-shrink-0"><polyline points="20 6 9 17 4 12"/></svg>
                    Free lifetime updates
                  </li>
                  <li className="flex items-center gap-2">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-white fill-none stroke-2 flex-shrink-0"><polyline points="20 6 9 17 4 12"/></svg>
                    Priority support forever
                  </li>
                </ul>
              </div>
              <div className="mt-6 text-left">
                <div className="font-display font-bold text-5xl lg:text-6xl text-white mb-1">${priceOf('lifetime', 89)}<span className="text-xl text-neutral-300 font-normal">once</span></div>
                <div className="text-neutral-400 mb-4">Best value for serious businesses</div>
                <Button
                  variant="default"
                  size="lg"
                  className="bg-white text-neutral-950 hover:bg-neutral-200 border-white font-semibold"
                  onClick={() => handleGetStarted('lifetime')}
                >
                  {user ? 'Upgrade to Lifetime' : 'Get Lifetime Access'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mt-12">
          <p className="text-neutral-500 text-sm">
            All plans include a 14-day free trial. Cancel anytime. No questions asked.
          </p>
        </div>
      </div>
    </div>
  )
}
