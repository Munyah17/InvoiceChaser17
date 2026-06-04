import { useStore } from '../store/useStore'
import { PLAN_PRICES } from '../lib/stripe'

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: 'forever',
    features: ['1 invoice/week', 'Email reminders', 'PDF export', 'Basic analytics', '1 BOQ/week', '1 BOM/week'],
    limits: { boqPerWeek: 1, invoicesPerWeek: 1, bomPerWeek: 1 },
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 4.99,
    period: 'month',
    features: ['100 invoices/month', 'Email reminders', 'PDF export', 'Basic analytics', '5 BOQ/week', 'Customer management'],
    limits: { boqPerWeek: 5, invoicesPerMonth: 100 },
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 11.99,
    period: 'month',
    features: ['Unlimited invoices', 'Full automation', 'AI BOQ/BOM', 'API access', 'Unlimited BOQ', 'Priority support'],
    limits: { boqPerWeek: Infinity, invoicesPerMonth: Infinity },
    popular: true,
  },
  {
    id: 'business',
    name: 'Business',
    price: 29.99,
    period: 'month',
    features: ['Everything in Pro', '5 team users', 'White-label', 'Custom branding', 'SLA guarantee'],
    limits: { boqPerWeek: Infinity, invoicesPerMonth: Infinity },
  },
]

const LIFETIME = {
  id: 'lifetime',
  name: 'Lifetime',
  price: 99,
  period: 'one-time',
  features: ['Everything in Professional', 'Lifetime access', 'All future updates', 'No recurring fees', 'Priority support forever'],
  limits: { boqPerWeek: Infinity, invoicesPerMonth: Infinity },
}

const ENTERPRISE = {
  id: 'enterprise',
  name: 'Enterprise',
  price: null,
  period: 'custom',
  features: ['Everything in Business', 'Dedicated account manager', 'Custom SLA', 'On-premise option', 'White-label platform', 'API access', 'Unlimited team users', 'SSO integration'],
  limits: { boqPerWeek: Infinity, invoicesPerMonth: Infinity },
}

export default function PlansPage() {
  const { userPlan, user } = useStore()

  const handleUpgrade = (planId) => {
    if (!user) {
      // Redirect to login, then back to checkout
      window.location.href = `/login?redirect=/checkout?plan=${planId}`
      return
    }

    // Redirect to our checkout page where user enters billing info
    window.location.href = `/checkout?plan=${planId}`
  }

  const currentPlan = PLANS.find(p => p.id === userPlan) || PLANS[0]

  return (
    <div className="animate-fade-in">
      <h1 className="font-semibold text-lg text-neutral-900 dark:text-white mb-1">Upgrade Plan</h1>
      <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-6">Manage your subscription and usage</p>

      {/* Current Plan */}
      <div className="bg-neutral-900 dark:bg-white rounded-2xl p-5 mb-6 text-white dark:text-neutral-950">
        <div className="text-[10px] font-medium uppercase tracking-wider opacity-60 mb-1">Current Plan</div>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold text-xl">{currentPlan.name}</div>
            <div className="text-xs opacity-70 mt-0.5">
              {currentPlan.limits.boqPerWeek === Infinity ? 'Unlimited BOQ' : `${currentPlan.limits.boqPerWeek} BOQ/week`}
            </div>
          </div>
          <div className="text-right">
            <div className="font-semibold text-2xl">${currentPlan.price}</div>
            <div className="text-xs opacity-70">/{currentPlan.period}</div>
          </div>
        </div>
      </div>

      {/* Usage */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
          <div className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">BOQ Used</div>
          <div className="font-semibold text-xl text-neutral-900 dark:text-white">0 <span className="text-xs font-normal text-neutral-400">/ {currentPlan.limits.boqPerWeek === Infinity ? '∞' : currentPlan.limits.boqPerWeek}</span></div>
          <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-1.5 mt-2">
            <div className="bg-neutral-900 dark:bg-white h-1.5 rounded-full" style={{ width: '0%' }} />
          </div>
        </div>
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
          <div className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">Invoices</div>
          <div className="font-semibold text-xl text-neutral-900 dark:text-white">0 <span className="text-xs font-normal text-neutral-400">/ {currentPlan.limits.invoicesPerWeek ? `${currentPlan.limits.invoicesPerWeek}/week` : currentPlan.limits.invoicesPerMonth === Infinity ? '∞' : currentPlan.limits.invoicesPerMonth}</span></div>
          <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-1.5 mt-2">
            <div className="bg-neutral-900 dark:bg-white h-1.5 rounded-full" style={{ width: '0%' }} />
          </div>
        </div>
      </div>

      {/* Plans Grid */}
      <h2 className="font-semibold text-sm text-neutral-900 dark:text-white mb-3">Choose a Plan</h2>
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Row 1: Professional (Popular) + Business */}
        {PLANS.filter(p => p.id === 'professional' || p.id === 'business').map((plan) => (
          <div key={plan.id} className={`bg-white dark:bg-neutral-900 border ${plan.popular ? 'border-neutral-900 dark:border-white' : 'border-neutral-200 dark:border-neutral-800'} rounded-xl p-4`}>
            {plan.popular && <span className="text-[9px] font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 px-2 py-0.5 rounded-full">Popular</span>}
            <h3 className="font-semibold text-sm text-neutral-900 dark:text-white mt-2">{plan.name}</h3>
            <div className="flex items-baseline gap-1 mt-1 mb-3">
              <span className="font-semibold text-xl text-neutral-900 dark:text-white">${plan.price}</span>
              <span className="text-[11px] text-neutral-500">/{plan.period}</span>
            </div>
            <ul className="space-y-1.5 mb-4">
              {plan.features.map((f, i) => (
                <li key={i} className="flex items-start gap-1.5 text-[11px] text-neutral-600 dark:text-neutral-400">
                  <svg viewBox="0 0 24 24" className="w-3 h-3 stroke-neutral-900 dark:stroke-white fill-none stroke-2 flex-shrink-0 mt-0.5"><polyline points="20 6 9 17 4 12" /></svg>
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleUpgrade(plan.id)}
              className={`w-full py-2 rounded-lg text-xs font-medium transition-opacity hover:opacity-90 ${
                plan.popular
                  ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
              }`}
            >
              Upgrade
            </button>
          </div>
        ))}

        {/* Row 2: Starter + Lifetime (Once Off) */}
        {PLANS.filter(p => p.id === 'starter').map((plan) => (
          <div key={plan.id} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
            <h3 className="font-semibold text-sm text-neutral-900 dark:text-white">{plan.name}</h3>
            <div className="flex items-baseline gap-1 mt-1 mb-3">
              <span className="font-semibold text-xl text-neutral-900 dark:text-white">${plan.price}</span>
              <span className="text-[11px] text-neutral-500">/{plan.period}</span>
            </div>
            <ul className="space-y-1.5 mb-4">
              {plan.features.map((f, i) => (
                <li key={i} className="flex items-start gap-1.5 text-[11px] text-neutral-600 dark:text-neutral-400">
                  <svg viewBox="0 0 24 24" className="w-3 h-3 stroke-neutral-900 dark:stroke-white fill-none stroke-2 flex-shrink-0 mt-0.5"><polyline points="20 6 9 17 4 12" /></svg>
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleUpgrade(plan.id)}
              className="w-full py-2 rounded-lg text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:opacity-90 transition-opacity"
            >
              Upgrade
            </button>
          </div>
        ))}
        </div>

      {/* Enterprise + Lifetime */}
      <div className="max-w-7xl mx-auto mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Lifetime */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6">
          <div className="mb-4">
            <span className="text-[9px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 px-2 py-0.5 rounded-full">Once Off</span>
            <h3 className="font-semibold text-sm text-neutral-900 dark:text-white mt-2">{LIFETIME.name}</h3>
            <div className="flex items-baseline gap-1 mt-1 mb-3">
              <span className="font-semibold text-xl text-neutral-900 dark:text-white">${LIFETIME.price}</span>
              <span className="text-[11px] text-neutral-500">/{LIFETIME.period}</span>
            </div>
            <ul className="space-y-1.5 mb-4">
              {LIFETIME.features.map((f, i) => (
                <li key={i} className="flex items-start gap-1.5 text-[11px] text-neutral-600 dark:text-neutral-400">
                  <svg viewBox="0 0 24 24" className="w-3 h-3 stroke-neutral-900 dark:stroke-white fill-none stroke-2 flex-shrink-0 mt-0.5"><polyline points="20 6 9 17 4 12" /></svg>
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <button
            onClick={() => handleUpgrade(LIFETIME.id)}
            className="w-full py-2 rounded-lg text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:opacity-90 transition-opacity"
          >
            Get Lifetime
          </button>
        </div>

        {/* Enterprise */}
        <div className="bg-neutral-900 dark:bg-white rounded-xl p-6 text-white dark:text-neutral-950">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[9px] font-medium bg-white/20 dark:bg-neutral-950/10 text-white dark:text-neutral-950 px-2 py-0.5 rounded-full">For Businesses</span>
              <h3 className="font-semibold text-sm mt-2">{ENTERPRISE.name}</h3>
              <p className="text-[11px] opacity-70 mt-1">Custom pricing tailored to your needs</p>
            </div>
            <button
              onClick={() => window.location.href = 'mailto:enterprise@invoicechaser.com?subject=Enterprise Plan Inquiry'}
              className="px-4 py-2 bg-white dark:bg-neutral-950 text-neutral-950 dark:text-white rounded-lg text-xs font-medium hover:opacity-90 transition-opacity"
            >
              Contact Sales
            </button>
          </div>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3">
            {ENTERPRISE.features.map((f, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[11px] opacity-80">
                <svg viewBox="0 0 24 24" className="w-3 h-3 stroke-current fill-none stroke-2 flex-shrink-0 mt-0.5"><polyline points="20 6 9 17 4 12" /></svg>
                {f}
              </li>
            ))}
          </ul>
        </div>
    </div>
    </div>
  )
}
