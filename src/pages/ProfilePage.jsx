import { useEffect } from 'react'
import { useStore } from '../store/useStore'
import { Link } from 'react-router-dom'

const PLAN_FEATURES = {
  free: [
    { label: 'Unlimited invoices & quotes', included: true },
    { label: 'Invoice Maker & PDF export', included: true },
    { label: 'Customers management', included: true },
    { label: '1 BOM per week', included: true },
    { label: '1 BOQ AI generation per week', included: true },
    { label: 'Reminders & email chasing', included: false },
    { label: 'Unlimited BOQ generations', included: false },
    { label: 'Priority support', included: false },
  ],
  pro: [
    { label: 'Unlimited invoices & quotes', included: true },
    { label: 'Invoice Maker & PDF export', included: true },
    { label: 'Customers management', included: true },
    { label: 'Unlimited BOMs', included: true },
    { label: 'Unlimited BOQ AI generations', included: true },
    { label: 'Reminders & email chasing', included: true },
    { label: 'Wallet & billing tools', included: true },
    { label: 'Priority support', included: true },
  ],
}

const QUICK_LINKS = [
  { label: 'Invoice Maker', to: '/app/invoice-maker', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { label: 'BOQ Generator', to: '/app/boq', icon: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z' },
  { label: 'Bill of Materials', to: '/app/bom', icon: 'M4 6h16M4 10h16M4 14h16M4 18h16' },
  { label: 'Customers', to: '/app/customers', icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3.87-3.97M16 3.13a4 4 0 010 7.75' },
  { label: 'Quotation', to: '/app/quotation', icon: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z' },
  { label: 'Reminders', to: '/app/reminders', icon: 'M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0' },
]

export default function ProfilePage() {
  const { user, settings, userPlan, loadProfile } = useStore()

  useEffect(() => {
    if (user) loadProfile(user.id)
  }, [user])

  const planLabel = userPlan || 'Free'
  const planKey = (userPlan || 'free').toLowerCase()
  const features = PLAN_FEATURES[planKey] || PLAN_FEATURES.free
  const initials = (settings.full_name || user?.email || 'U').split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase()
  const memberDays = user?.created_at ? Math.floor((Date.now() - new Date(user.created_at).getTime()) / 86400000) : 0

  return (
    <div className="animate-fade-in w-full">
      <h1 className="font-semibold text-lg text-neutral-900 dark:text-white mb-1">Profile</h1>
      <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-5">Your account overview</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left — identity */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-3">
              {initials}
            </div>
            <div className="font-semibold text-sm text-neutral-900 dark:text-white">{settings.full_name || 'Unnamed User'}</div>
            <div className="text-xs text-neutral-500 mb-2">{user?.email}</div>
            <span className="inline-block text-[10px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 px-2 py-0.5 rounded-full capitalize">{planLabel} Plan</span>
          </div>

          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 space-y-3">
            {[
              { label: 'Full Name', value: settings.full_name || '—' },
              { label: 'Company', value: settings.company_name || '—' },
              { label: 'Email', value: user?.email || '—' },
              { label: 'Member Since', value: user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—' },
            ].map(row => (
              <div key={row.label} className="flex justify-between items-center">
                <span className="text-xs text-neutral-500">{row.label}</span>
                <span className="text-xs font-medium text-neutral-900 dark:text-white">{row.value}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-neutral-900 dark:text-white">{memberDays}</div>
              <div className="text-[10px] text-neutral-500 mt-0.5">Days as member</div>
            </div>
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-neutral-900 dark:text-white capitalize">{planLabel}</div>
              <div className="text-[10px] text-neutral-500 mt-0.5">Current plan</div>
            </div>
          </div>

          <Link to="/app/settings" className="block text-center text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:underline">Edit profile in Settings →</Link>
        </div>

        {/* Right — plan + quick access */}
        <div className="space-y-4">
          {/* Plan features */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Your Plan</h3>
              <span className="text-[10px] font-semibold bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-2 py-0.5 rounded-full capitalize">{planLabel}</span>
            </div>
            <div className="space-y-2">
              {features.map(f => (
                <div key={f.label} className="flex items-center gap-2">
                  {f.included ? (
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-emerald-500 fill-none stroke-2 shrink-0"><polyline points="20 6 9 17 4 12" /></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-neutral-300 dark:stroke-neutral-600 fill-none stroke-2 shrink-0"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  )}
                  <span className={`text-xs ${f.included ? 'text-neutral-700 dark:text-neutral-300' : 'text-neutral-400 dark:text-neutral-600'}`}>{f.label}</span>
                </div>
              ))}
            </div>
            {planKey === 'free' && (
              <Link to="/app/plans" className="mt-4 flex items-center justify-center gap-1.5 w-full py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity">
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none stroke-2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                Upgrade to Pro
              </Link>
            )}
          </div>

          {/* Quick access */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
            <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-3">Quick Access</h3>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_LINKS.map(link => (
                <Link key={link.to} to={link.to} className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors group">
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-neutral-400 group-hover:stroke-neutral-700 dark:group-hover:stroke-neutral-300 fill-none stroke-2 shrink-0">
                    <path d={link.icon} />
                  </svg>
                  <span className="text-xs text-neutral-700 dark:text-neutral-300">{link.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div className="bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
            <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-3">Pro Tips</h3>
            <div className="space-y-3">
              {[
                { tip: 'Use the BOQ AI Generator to auto-build a full materials list just by describing your project.', link: '/app/boq', cta: 'Try BOQ →' },
                { tip: 'Add your company logo in Settings — it appears on all your PDF exports.', link: '/app/settings', cta: 'Go to Settings →' },
                { tip: 'Set up payment reminders so InvoiceChaser automatically chases overdue invoices for you.', link: '/app/reminders', cta: 'Set Reminders →' },
              ].map((item, i) => (
                <div key={i} className="flex gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-[9px] font-bold text-neutral-600 dark:text-neutral-400 shrink-0 mt-0.5">{i + 1}</div>
                  <div>
                    <p className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-relaxed">{item.tip}</p>
                    <Link to={item.link} className="text-[10px] font-medium text-neutral-900 dark:text-white hover:underline">{item.cta}</Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
