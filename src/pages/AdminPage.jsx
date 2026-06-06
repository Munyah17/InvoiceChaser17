import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import { formatDate } from '../utils/dateFormat'
import { canAccessAdmin } from '../utils/rbac'

// Tabs — super_admin sees everything; admin sees business ops (no platform config / feature flags / roles)
const SUPER_TABS = [
  { id: 'overview',      label: 'Overview' },
  { id: 'subscribers',   label: 'Subscribers' },
  { id: 'users',         label: 'Users' },
  { id: 'analytics',     label: 'Analytics' },
  { id: 'api_keys',      label: 'API Keys' },
  { id: 'staff',         label: 'Staff' },
  { id: 'flags',         label: 'Feature Flags' },
  { id: 'roles',         label: 'Roles' },
  { id: 'platform',      label: 'Platform' },
]

const ADMIN_TABS = [
  { id: 'overview',      label: 'Overview' },
  { id: 'subscribers',   label: 'Subscribers' },
  { id: 'users',         label: 'Users' },
  { id: 'analytics',     label: 'Analytics' },
  { id: 'api_keys',      label: 'API Keys' },
  { id: 'support',       label: 'Support' },
]

// ── Role privilege matrix ──────────────────────────────────────────────────
// Grouped for readability in the UI
const ROLE_MATRIX = [
  // ─ Client features
  { group: 'Client Features',
    privilege: 'All invoicing, BOQ/BOM, quotation, document tools', super_admin: true, admin: true,  client: true  },
  { group: 'Client Features',
    privilege: 'Automated payment reminders',                        super_admin: true, admin: true,  client: true  },
  { group: 'Client Features',
    privilege: 'Wallet top-up, withdrawal, transaction history',     super_admin: true, admin: true,  client: true  },
  { group: 'Client Features',
    privilege: 'Generate & manage own API keys',                     super_admin: true, admin: false, client: true  },
  { group: 'Client Features',
    privilege: 'Unlimited usage — no plan caps',                     super_admin: true, admin: true,  client: false },

  // ─ Client management
  { group: 'Client Management',
    privilege: 'View all client accounts & plans',                   super_admin: true, admin: true,  client: false },
  { group: 'Client Management',
    privilege: 'Create new client accounts',                         super_admin: true, admin: true,  client: false },
  { group: 'Client Management',
    privilege: 'Edit client profile, plan & status',                 super_admin: true, admin: true,  client: false },
  { group: 'Client Management',
    privilege: 'Delete client accounts',                             super_admin: true, admin: true,  client: false },
  { group: 'Client Management',
    privilege: 'Suspend / unsuspend client accounts',                super_admin: true, admin: true,  client: false },
  { group: 'Client Management',
    privilege: 'Manage client API keys (view, pause, revoke)',        super_admin: true, admin: true,  client: false },
  { group: 'Client Management',
    privilege: 'View client wallet balances & transactions',         super_admin: true, admin: true,  client: false },

  // ─ Business & Revenue
  { group: 'Business & Revenue',
    privilege: 'View all subscriptions & their status',              super_admin: true, admin: true,  client: false },
  { group: 'Business & Revenue',
    privilege: 'View MRR, ARR & revenue analytics',                  super_admin: true, admin: true,  client: false },
  { group: 'Business & Revenue',
    privilege: 'View individual payment amounts',                    super_admin: true, admin: true,  client: false },
  { group: 'Business & Revenue',
    privilege: 'View user growth & churn metrics',                   super_admin: true, admin: true,  client: false },
  { group: 'Business & Revenue',
    privilege: 'Escalate issues to super admin',                     super_admin: true, admin: true,  client: false },
  { group: 'Business & Revenue',
    privilege: 'Communicate between admin staff members',            super_admin: true, admin: true,  client: false },

  // ─ Staff management (super_admin only)
  { group: 'Staff Management',
    privilege: 'Create & invite Admin accounts',                     super_admin: true, admin: false, client: false },
  { group: 'Staff Management',
    privilege: 'Edit or deactivate Admin accounts',                  super_admin: true, admin: false, client: false },
  { group: 'Staff Management',
    privilege: 'Create & manage other Super Admin accounts',         super_admin: true, admin: false, client: false },
  { group: 'Staff Management',
    privilege: 'Assign & change staff roles',                        super_admin: true, admin: false, client: false },

  // ─ Platform & Infrastructure (super_admin only)
  { group: 'Platform & Infrastructure',
    privilege: 'Toggle platform feature flags',                      super_admin: true, admin: false, client: false },
  { group: 'Platform & Infrastructure',
    privilege: 'Send platform-wide announcements',                   super_admin: true, admin: false, client: false },
  { group: 'Platform & Infrastructure',
    privilege: 'View & rotate platform integration keys (Stripe, Resend)', super_admin: true, admin: false, client: false },
  { group: 'Platform & Infrastructure',
    privilege: 'View Supabase project config',                       super_admin: true, admin: false, client: false },
  { group: 'Platform & Infrastructure',
    privilege: 'Database schema & migration access',                 super_admin: true, admin: false, client: false },
  { group: 'Platform & Infrastructure',
    privilege: 'Enable / disable maintenance mode',                  super_admin: true, admin: false, client: false },
  { group: 'Platform & Infrastructure',
    privilege: 'Lifetime access — no subscription required',         super_admin: true, admin: false, client: false },
]

const PLAN_COLOR = {
  free:         'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400',
  starter:      'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  professional: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400',
  business:     'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  lifetime:     'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  enterprise:   'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  super_admin:  'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950',
}

const DEFAULT_FLAGS = [
  { id: 'wallet',          label: 'Wallet & Credits',        description: 'Allow users to top up and spend wallet credits', enabled: true },
  { id: 'boq_bom',         label: 'BOQ / BOM Tools',         description: 'Bill of Quantities and Bill of Materials modules', enabled: true },
  { id: 'quotations',      label: 'Quotation Builder',       description: 'Create and send professional quotations', enabled: true },
  { id: 'proforma',        label: 'Proforma Invoices',       description: 'Generate proforma invoices for advance payments', enabled: true },
  { id: 'debit_credit',    label: 'Debit / Credit Notes',    description: 'Issue debit and credit notes to customers', enabled: true },
  { id: 'reminders',       label: 'Auto Reminders',          description: 'Automated email follow-ups on overdue invoices', enabled: true },
  { id: 'paynow',          label: 'Paynow (Zimbabwe)',       description: 'Enable Paynow payment gateway for ZWL transactions', enabled: true },
  { id: 'stripe',          label: 'Stripe Payments',         description: 'Enable Stripe for international card payments', enabled: true },
  { id: 'maintenance',     label: 'Maintenance Mode',        description: 'Take the platform offline for maintenance', enabled: false },
  { id: 'new_user_reg',    label: 'New Registrations',       description: 'Allow new users to sign up', enabled: true },
]

function Stat({ label, value, sub, highlight }) {
  return (
    <div className={`rounded-xl border p-4 lg:p-5 ${highlight ? 'bg-neutral-900 dark:bg-white border-neutral-900 dark:border-white' : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800'}`}>
      <div className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${highlight ? 'text-neutral-400 dark:text-neutral-500' : 'text-neutral-500 dark:text-neutral-400'}`}>{label}</div>
      <div className={`font-bold text-xl lg:text-2xl ${highlight ? 'text-white dark:text-neutral-950' : 'text-neutral-900 dark:text-white'}`}>{value}</div>
      {sub && <div className={`text-[11px] mt-0.5 ${highlight ? 'text-neutral-400 dark:text-neutral-600' : 'text-neutral-400'}`}>{sub}</div>}
    </div>
  )
}

function generateApiKey(prefix) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let key = prefix + '_'
  for (let i = 0; i < 32; i++) key += chars.charAt(Math.floor(Math.random() * chars.length))
  return key
}

export default function AdminPage() {
  const navigate = useNavigate()
  const { userRole } = useStore()

  const [authed, setAuthed]               = useState(false)
  const [loginEmail, setLoginEmail]       = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError]       = useState('')
  const [loginLoading, setLoginLoading]   = useState(false)

  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading]     = useState(true)

  const [metrics, setMetrics] = useState({
    totalUsers: 0, newUsersToday: 0, newUsersThisWeek: 0,
    totalRevenue: 0, revenueThisMonth: 0, mrr: 0, arr: 0,
    activeSubs: 0, trialSubs: 0, cancelledSubs: 0,
    planBreakdown: {},
  })
  const [usersList, setUsersList]     = useState([])
  const [subsList, setSubsList]       = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [editingUser, setEditingUser] = useState(null)
  const [savingUser, setSavingUser]   = useState(false)

  const [apiKeys, setApiKeys]             = useState({ oneWay: [], biDir: [] })
  const [newKeyName, setNewKeyName]       = useState('')
  const [keyType, setKeyType]             = useState('oneWay')
  const [clientApiKeys, setClientApiKeys] = useState([])
  const [staffList, setStaffList]         = useState([])
  const [newStaff, setNewStaff]           = useState({ email: '', name: '', role: 'admin' })
  const [savingStaff, setSavingStaff]     = useState(false)
  const [staffMsg, setStaffMsg]           = useState(null)
  const [escalations, setEscalations]     = useState([])
  const [escalationText, setEscalationText] = useState('')

  const [flags, setFlags] = useState(DEFAULT_FLAGS)

  const [announcement, setAnnouncement] = useState('')
  const [announcementSent, setAnnouncementSent] = useState(false)

  useEffect(() => {
    if (canAccessAdmin(userRole)) setAuthed(true)
  }, [userRole])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const now        = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      const weekStart  = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).toISOString()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

      const [
        { count: totalUsers },
        { count: newToday },
        { count: newWeek },
        { data: payments },
        { data: monthPayments },
        { data: subs },
        { data: users },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', todayStart),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', weekStart),
        supabase.from('payments').select('amount, created_at').eq('status', 'completed'),
        supabase.from('payments').select('amount').eq('status', 'completed').gte('created_at', monthStart),
        supabase.from('subscriptions').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, email, name, full_name, plan, role, is_protected, created_at').order('created_at', { ascending: false }).limit(200),
      ])

      const totalRevenue     = (payments || []).reduce((s, p) => s + parseFloat(p.amount || 0), 0)
      const revenueThisMonth = (monthPayments || []).reduce((s, p) => s + parseFloat(p.amount || 0), 0)

      const activeSubs    = (subs || []).filter(s => s.status === 'active').length
      const trialSubs     = (subs || []).filter(s => s.status === 'trial').length
      const cancelledSubs = (subs || []).filter(s => s.status === 'cancelled').length

      const PLAN_MRR = { starter: 9, professional: 19, business: 49, enterprise: 199 }
      const mrr = (subs || []).filter(s => s.status === 'active')
        .reduce((s, sub) => s + (PLAN_MRR[sub.plan] || 0), 0)
      const arr = mrr * 12

      const planBreakdown = {}
      ;(users || []).forEach(u => {
        const p = u.plan || 'free'
        planBreakdown[p] = (planBreakdown[p] || 0) + 1
      })

      setMetrics({ totalUsers: totalUsers || 0, newUsersToday: newToday || 0, newUsersThisWeek: newWeek || 0, totalRevenue, revenueThisMonth, mrr, arr, activeSubs, trialSubs, cancelledSubs, planBreakdown })
      setUsersList(users || [])
      setSubsList(subs || [])

      // Load client API keys
      const { data: cKeys } = await supabase
        .from('api_keys')
        .select('id, user_id, name, publishable_key, secret_key_prefix, status, total_requests, total_charged, last_used_at, created_at')
        .order('created_at', { ascending: false })
        .limit(100)
      setClientApiKeys(cKeys || [])

      // Load staff (admin + super_admin roles)
      const { data: staff } = await supabase
        .from('profiles')
        .select('id, email, full_name, name, role, is_protected, created_at')
        .in('role', ['admin', 'super_admin'])
        .order('created_at', { ascending: true })
      setStaffList(staff || [])
    } catch (err) {
      console.error('Admin fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { if (authed) fetchAll() }, [authed, fetchAll])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoginError('')
    setLoginLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword })
      if (error) throw error
      const { data: row } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
      if (!['admin', 'super_admin'].includes(row?.role)) throw new Error('Access denied — staff accounts only.')
      setAuthed(true)
    } catch (err) { setLoginError(err.message) }
    finally { setLoginLoading(false) }
  }

  const handleUpdateUserPlan = async (userId, newPlan) => {
    setSavingUser(userId)
    await supabase.from('profiles').update({ plan: newPlan, updated_at: new Date().toISOString() }).eq('id', userId)
    setUsersList(prev => prev.map(u => u.id === userId ? { ...u, plan: newPlan } : u))
    setSavingUser(null)
    setEditingUser(null)
  }

  const handleSuspendUser = async (userId) => {
    if (!confirm('Suspend this user? They will not be able to log in.')) return
    await supabase.auth.admin.updateUserById(userId, { ban_duration: '876000h' }).catch(() => {})
    alert('User suspended.')
  }

  const toggleFlag = (id) => {
    setFlags(prev => prev.map(f => f.id === id ? { ...f, enabled: !f.enabled } : f))
  }

  const fmt = (n) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const filteredUsers = usersList.filter(u =>
    !searchQuery ||
    (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.full_name || u.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  // ── Login gate ───────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center p-6">
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-8 w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-neutral-900 dark:bg-white rounded-xl flex items-center justify-center mx-auto mb-3">
              <svg viewBox="0 0 24 24" className="w-6 h-6 stroke-white dark:stroke-neutral-950 fill-none stroke-2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
            </div>
            <h1 className="font-semibold text-lg text-neutral-900 dark:text-white">Platform Admin</h1>
            <p className="text-xs text-neutral-500 mt-1">InvoiceChaser Operations Portal</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-3">
            <input type="email" required value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="admin@invoicechaser.com"
              className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white text-sm outline-none" />
            <input type="password" required value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="••••••••"
              className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white text-sm outline-none" />
            {loginError && <p className="text-red-500 text-xs">{loginError}</p>}
            <button type="submit" disabled={loginLoading}
              className="w-full py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
              {loginLoading ? 'Signing in…' : 'Access Portal'}
            </button>
          </form>
          <p className="text-center mt-4">
            <button onClick={() => navigate('/app/dashboard')} className="text-xs text-neutral-500 hover:underline">← Back to app</button>
          </p>
        </div>
      </div>
    )
  }

  // ── Admin Portal ─────────────────────────────────────────────────────────
  return (
    <div className="animate-fade-in w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <div className="w-6 h-6 bg-neutral-900 dark:bg-white rounded flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-white dark:stroke-neutral-950 fill-none stroke-2">
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
              </svg>
            </div>
            <h1 className="font-semibold text-lg text-neutral-900 dark:text-white">Platform Admin</h1>
            <span className="text-[9px] font-bold bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 px-2 py-0.5 rounded-full uppercase tracking-wider">
              Super Admin
            </span>
            <span className="text-[9px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-2.5 h-2.5">
                <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z"/>
              </svg>
              Lifetime Access
            </span>
          </div>
          <p className="text-xs text-neutral-500">Full platform control · Permanent owner access · No subscription required</p>
        </div>
        <button
          onClick={fetchAll}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 self-start"
        >
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none stroke-2">
            <path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
          Refresh
        </button>
      </div>

      {/* Tabs — scrollable on mobile */}
      {(() => {
        const tabs = userRole === 'super_admin' ? SUPER_TABS : ADMIN_TABS
        return (
          <div className="flex gap-0.5 mb-6 border-b border-neutral-200 dark:border-neutral-800 overflow-x-auto">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-3 py-2 text-xs font-medium rounded-t transition-colors -mb-px border-b-2 whitespace-nowrap flex-shrink-0
                  ${activeTab === t.id
                    ? 'border-neutral-900 dark:border-white text-neutral-900 dark:text-white'
                    : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )
      })()}

      {/* ── OVERVIEW ─────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat label="MRR" value={loading ? '…' : fmt(metrics.mrr)} sub="Monthly recurring revenue" highlight />
            <Stat label="ARR" value={loading ? '…' : fmt(metrics.arr)} sub="Annualised recurring revenue" />
            <Stat label="Total Revenue" value={loading ? '…' : fmt(metrics.totalRevenue)} sub="All time completed payments" />
            <Stat label="This Month" value={loading ? '…' : fmt(metrics.revenueThisMonth)} sub="Revenue current month" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat label="Total Users" value={loading ? '…' : metrics.totalUsers} sub="All registered accounts" />
            <Stat label="Active Subs" value={loading ? '…' : metrics.activeSubs} sub={`${metrics.trialSubs} trial · ${metrics.cancelledSubs} cancelled`} />
            <Stat label="New Today" value={loading ? '…' : metrics.newUsersToday} sub="Signups since midnight" />
            <Stat label="New This Week" value={loading ? '…' : metrics.newUsersThisWeek} sub="Current calendar week" />
          </div>

          {/* Plan breakdown */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
            <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-4">Users by Plan</h3>
            <div className="flex flex-wrap gap-3">
              {Object.entries(metrics.planBreakdown).sort((a, b) => b[1] - a[1]).map(([plan, count]) => (
                <div key={plan} className="flex items-center gap-2 bg-neutral-50 dark:bg-neutral-800 rounded-lg px-3 py-2">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${PLAN_COLOR[plan] || PLAN_COLOR.free}`}>{plan}</span>
                  <span className="text-sm font-bold text-neutral-900 dark:text-white">{count}</span>
                  <span className="text-[10px] text-neutral-400">users</span>
                </div>
              ))}
              {Object.keys(metrics.planBreakdown).length === 0 && !loading && (
                <p className="text-xs text-neutral-400">No data yet</p>
              )}
            </div>
          </div>

          {/* Recent signups */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-200 dark:border-neutral-800">
              <span className="font-semibold text-sm text-neutral-900 dark:text-white">Recent Signups</span>
              <button onClick={() => setActiveTab('users')} className="text-xs text-neutral-500 hover:underline">View all →</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[400px]">
                <thead><tr className="bg-neutral-50 dark:bg-neutral-800/50">
                  <th className="px-4 py-2 text-left font-semibold text-neutral-500 uppercase">Email</th>
                  <th className="px-4 py-2 text-left font-semibold text-neutral-500 uppercase">Plan</th>
                  <th className="px-4 py-2 text-left font-semibold text-neutral-500 uppercase">Joined</th>
                </tr></thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {usersList.slice(0, 8).map(u => (
                    <tr key={u.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30">
                      <td className="px-4 py-2 text-neutral-900 dark:text-white">{u.email}</td>
                      <td className="px-4 py-2">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${PLAN_COLOR[u.plan || 'free'] || PLAN_COLOR.free}`}>{u.plan || 'free'}</span>
                      </td>
                      <td className="px-4 py-2 text-neutral-500">{formatDate(u.created_at)}</td>
                    </tr>
                  ))}
                  {usersList.length === 0 && !loading && (
                    <tr><td colSpan={3} className="px-4 py-8 text-center text-neutral-400">No users yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── SUBSCRIBERS ──────────────────────────────────────────────────── */}
      {activeTab === 'subscribers' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Stat label="Active Subscriptions" value={metrics.activeSubs} sub="Paying now" highlight />
            <Stat label="Trials" value={metrics.trialSubs} sub="In trial period" />
            <Stat label="Cancelled" value={metrics.cancelledSubs} sub="Churned" />
          </div>
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <span className="font-semibold text-sm text-neutral-900 dark:text-white">All Subscriptions</span>
              <span className="text-xs text-neutral-500">{subsList.length} total</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[520px]">
                <thead><tr className="bg-neutral-50 dark:bg-neutral-800/50">
                  <th className="px-4 py-2 text-left font-semibold text-neutral-500 uppercase">User ID</th>
                  <th className="px-4 py-2 text-left font-semibold text-neutral-500 uppercase">Plan</th>
                  <th className="px-4 py-2 text-left font-semibold text-neutral-500 uppercase">Status</th>
                  <th className="px-4 py-2 text-left font-semibold text-neutral-500 uppercase">Stripe ID</th>
                  <th className="px-4 py-2 text-left font-semibold text-neutral-500 uppercase">Period End</th>
                </tr></thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {subsList.map(s => (
                    <tr key={s.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30">
                      <td className="px-4 py-2 font-mono text-neutral-500">{s.user_id?.slice(0, 8)}…</td>
                      <td className="px-4 py-2">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${PLAN_COLOR[s.plan || 'free'] || PLAN_COLOR.free}`}>{s.plan}</span>
                      </td>
                      <td className="px-4 py-2">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full
                          ${s.status === 'active' ? 'bg-emerald-100 text-emerald-700' : s.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 font-mono text-neutral-400 text-[10px]">{s.stripe_subscription_id ? s.stripe_subscription_id.slice(0, 14) + '…' : '—'}</td>
                      <td className="px-4 py-2 text-neutral-500">{s.current_period_end ? formatDate(s.current_period_end) : '—'}</td>
                    </tr>
                  ))}
                  {subsList.length === 0 && !loading && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-neutral-400">No subscriptions yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── USERS ────────────────────────────────────────────────────────── */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <input
                type="text"
                placeholder="Search by email or name…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white outline-none"
              />
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-neutral-400 fill-none stroke-2 absolute left-2.5 top-2.5">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>
            <span className="text-xs text-neutral-500">{filteredUsers.length} users</span>
          </div>
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[500px]">
                <thead><tr className="bg-neutral-50 dark:bg-neutral-800/50">
                  <th className="px-4 py-2 text-left font-semibold text-neutral-500 uppercase">User</th>
                  <th className="px-4 py-2 text-left font-semibold text-neutral-500 uppercase">Plan</th>
                  <th className="px-4 py-2 text-left font-semibold text-neutral-500 uppercase">Role</th>
                  <th className="px-4 py-2 text-left font-semibold text-neutral-500 uppercase">Joined</th>
                  <th className="px-4 py-2 text-right font-semibold text-neutral-500 uppercase">Actions</th>
                </tr></thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {filteredUsers.map(u => (
                    <tr key={u.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30">
                      <td className="px-4 py-2">
                        <div className="font-medium text-neutral-900 dark:text-white">{u.full_name || u.name || '—'}</div>
                        <div className="text-neutral-400">{u.email}</div>
                      </td>
                      <td className="px-4 py-2">
                        {editingUser === u.id ? (
                          <select
                            defaultValue={u.plan || 'free'}
                            onChange={e => handleUpdateUserPlan(u.id, e.target.value)}
                            disabled={savingUser === u.id}
                            className="px-2 py-1 text-[10px] border border-neutral-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none"
                          >
                            {['free','starter','professional','business','lifetime','enterprise'].map(p => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>
                        ) : (
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${PLAN_COLOR[u.plan || 'free'] || PLAN_COLOR.free}`}>{u.plan || 'free'}</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-neutral-500 capitalize">{u.role || 'user'}</td>
                      <td className="px-4 py-2 text-neutral-500">{formatDate(u.created_at)}</td>
                      <td className="px-4 py-2 text-right">
                        {!u.is_protected ? (
                          <div className="flex items-center justify-end gap-2">
                            {editingUser === u.id ? (
                              <button onClick={() => setEditingUser(null)} className="text-[10px] text-neutral-500 hover:underline">Cancel</button>
                            ) : (
                              <button onClick={() => setEditingUser(u.id)} className="text-[10px] text-neutral-700 dark:text-neutral-300 hover:underline">Edit plan</button>
                            )}
                            <button onClick={() => handleSuspendUser(u.id)} className="text-[10px] text-red-500 hover:underline">Suspend</button>
                          </div>
                        ) : (
                          <span className="text-[9px] text-neutral-400">Protected</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-neutral-400">{searchQuery ? 'No users match that search' : 'No users yet'}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── ANALYTICS ────────────────────────────────────────────────────── */}
      {activeTab === 'analytics' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat label="MRR" value={fmt(metrics.mrr)} sub="Monthly Recurring Revenue" highlight />
            <Stat label="ARR" value={fmt(metrics.arr)} sub="Annualised Recurring Revenue" />
            <Stat label="Total Revenue" value={fmt(metrics.totalRevenue)} sub="All time" />
            <Stat label="This Month" value={fmt(metrics.revenueThisMonth)} sub="Revenue" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
              <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-4">Subscription Health</h3>
              {[
                { label: 'Active', value: metrics.activeSubs, color: 'bg-emerald-500' },
                { label: 'Trial', value: metrics.trialSubs, color: 'bg-amber-400' },
                { label: 'Cancelled', value: metrics.cancelledSubs, color: 'bg-red-400' },
              ].map(item => {
                const total = metrics.activeSubs + metrics.trialSubs + metrics.cancelledSubs || 1
                return (
                  <div key={item.label} className="flex items-center gap-3 mb-3">
                    <div className="w-20 text-xs text-neutral-500">{item.label}</div>
                    <div className="flex-1 bg-neutral-100 dark:bg-neutral-800 rounded-full h-2">
                      <div className={`${item.color} h-2 rounded-full`} style={{ width: `${(item.value / total) * 100}%` }} />
                    </div>
                    <div className="w-8 text-xs font-semibold text-neutral-900 dark:text-white text-right">{item.value}</div>
                  </div>
                )
              })}
            </div>

            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
              <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-4">User Growth</h3>
              <div className="space-y-3">
                {[
                  { label: 'Total Users', value: metrics.totalUsers },
                  { label: 'New Today', value: metrics.newUsersToday },
                  { label: 'New This Week', value: metrics.newUsersThisWeek },
                  { label: 'Conversion Rate', value: metrics.totalUsers ? `${((metrics.activeSubs / metrics.totalUsers) * 100).toFixed(1)}%` : '0%' },
                ].map(item => (
                  <div key={item.label} className="flex justify-between items-center py-1.5 border-b border-neutral-100 dark:border-neutral-800 last:border-b-0">
                    <span className="text-xs text-neutral-500">{item.label}</span>
                    <span className="text-sm font-bold text-neutral-900 dark:text-white">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
            <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-4">Plan Distribution</h3>
            {Object.entries(metrics.planBreakdown).sort((a, b) => b[1] - a[1]).map(([plan, count]) => {
              const pct = metrics.totalUsers ? ((count / metrics.totalUsers) * 100).toFixed(1) : 0
              return (
                <div key={plan} className="flex items-center gap-3 mb-3">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize w-24 text-center ${PLAN_COLOR[plan] || PLAN_COLOR.free}`}>{plan}</span>
                  <div className="flex-1 bg-neutral-100 dark:bg-neutral-800 rounded-full h-2">
                    <div className="bg-neutral-900 dark:bg-white h-2 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-neutral-900 dark:text-white w-8 text-right">{count}</span>
                  <span className="text-[10px] text-neutral-400 w-10 text-right">{pct}%</span>
                </div>
              )
            })}
            {Object.keys(metrics.planBreakdown).length === 0 && !loading && (
              <p className="text-xs text-neutral-400">No data yet</p>
            )}
          </div>
        </div>
      )}

      {/* ── FEATURE FLAGS ────────────────────────────────────────────────── */}
      {activeTab === 'flags' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-xs text-neutral-500">Changes apply platform-wide. Disabled features are hidden from all users.</p>
          </div>
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl divide-y divide-neutral-100 dark:divide-neutral-800">
            {flags.map(flag => (
              <div key={flag.id} className="flex items-center justify-between px-5 py-4 gap-4">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-neutral-900 dark:text-white">{flag.label}</div>
                  <div className="text-xs text-neutral-500 mt-0.5">{flag.description}</div>
                </div>
                <button
                  onClick={() => toggleFlag(flag.id)}
                  className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none
                    ${flag.enabled ? 'bg-neutral-900 dark:bg-white' : 'bg-neutral-200 dark:bg-neutral-700'}`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full shadow transition-transform duration-200
                      ${flag.enabled ? 'translate-x-4 bg-white dark:bg-neutral-950' : 'translate-x-0 bg-white dark:bg-neutral-400'}`}
                  />
                </button>
              </div>
            ))}
          </div>

          {/* Broadcast announcement */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
            <h3 className="font-semibold text-sm text-neutral-900 dark:text-white mb-1">Platform Announcement</h3>
            <p className="text-xs text-neutral-500 mb-3">Broadcast a message shown to all users on next login.</p>
            <textarea
              rows={3}
              value={announcement}
              onChange={e => { setAnnouncement(e.target.value); setAnnouncementSent(false) }}
              placeholder="e.g. We're upgrading our servers on Saturday 2am–4am UTC. Expect brief downtime."
              className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none resize-none"
            />
            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={() => { if (announcement.trim()) setAnnouncementSent(true) }}
                className="px-3 py-1.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-lg text-xs font-medium hover:opacity-90"
              >
                Broadcast
              </button>
              {announcementSent && <span className="text-xs text-emerald-600 dark:text-emerald-400">Announcement queued ✓</span>}
            </div>
          </div>
        </div>
      )}

      {/* ── API KEYS OVERSIGHT ───────────────────────────────────────────── */}
      {activeTab === 'api_keys' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat label="Total Key Pairs" value={clientApiKeys.length} sub="Across all clients" highlight />
            <Stat label="Active Keys" value={clientApiKeys.filter(k => k.status === 'active').length} sub="Currently operational" />
            <Stat label="Paused Keys" value={clientApiKeys.filter(k => k.status === 'paused').length} sub="Low wallet balance" />
            <Stat label="Revoked Keys" value={clientApiKeys.filter(k => k.status === 'revoked').length} sub="Permanently disabled" />
          </div>

          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <span className="font-semibold text-sm text-neutral-900 dark:text-white">All Client API Keys</span>
              <span className="text-xs text-neutral-500">{clientApiKeys.length} total</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[540px]">
                <thead><tr className="bg-neutral-50 dark:bg-neutral-800/50">
                  <th className="px-4 py-2 text-left font-semibold text-neutral-500 uppercase">Key Name</th>
                  <th className="px-4 py-2 text-left font-semibold text-neutral-500 uppercase">Publishable Key</th>
                  <th className="px-4 py-2 text-left font-semibold text-neutral-500 uppercase">Status</th>
                  <th className="px-4 py-2 text-right font-semibold text-neutral-500 uppercase">Requests</th>
                  <th className="px-4 py-2 text-right font-semibold text-neutral-500 uppercase">Charged</th>
                  {userRole === 'super_admin' && <th className="px-4 py-2 text-right font-semibold text-neutral-500 uppercase">Action</th>}
                </tr></thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {clientApiKeys.map(k => (
                    <tr key={k.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30">
                      <td className="px-4 py-2 font-medium text-neutral-900 dark:text-white">{k.name}</td>
                      <td className="px-4 py-2 font-mono text-neutral-400 text-[10px]">{k.publishable_key?.slice(0, 22)}…</td>
                      <td className="px-4 py-2">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase
                          ${k.status === 'active' ? 'bg-emerald-100 text-emerald-700' : k.status === 'paused' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                          {k.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right text-neutral-600 dark:text-neutral-400">{k.total_requests || 0}</td>
                      <td className="px-4 py-2 text-right text-neutral-600 dark:text-neutral-400">${parseFloat(k.total_charged || 0).toFixed(4)}</td>
                      {userRole === 'super_admin' && (
                        <td className="px-4 py-2 text-right">
                          {k.status !== 'revoked' && (
                            <button
                              onClick={async () => {
                                if (!confirm(`Revoke "${k.name}"? This will immediately break any integrations using it.`)) return
                                await supabase.from('api_keys').update({ status: 'revoked' }).eq('id', k.id)
                                setClientApiKeys(prev => prev.map(x => x.id === k.id ? { ...x, status: 'revoked' } : x))
                              }}
                              className="text-[10px] text-red-500 hover:underline"
                            >
                              Revoke
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                  {clientApiKeys.length === 0 && !loading && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-neutral-400">No API keys issued yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── STAFF MANAGEMENT (super_admin only) ──────────────────────────── */}
      {activeTab === 'staff' && userRole === 'super_admin' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat label="Total Staff" value={staffList.length} sub="Admin + Super Admin" highlight />
            <Stat label="Super Admins" value={staffList.filter(s => s.role === 'super_admin').length} sub="Full platform access" />
            <Stat label="Admins" value={staffList.filter(s => s.role === 'admin').length} sub="Business operations" />
            <Stat label="Protected" value={staffList.filter(s => s.is_protected).length} sub="Cannot be deleted" />
          </div>

          {/* Invite new staff */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
            <div className="font-semibold text-sm mb-1 text-neutral-900 dark:text-white">Invite Staff Member</div>
            <p className="text-xs text-neutral-500 mb-4">Creates the account and sends an invite email. Only super admins can create staff.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
              <input
                type="text"
                placeholder="Full name"
                value={newStaff.name}
                onChange={e => setNewStaff(p => ({ ...p, name: e.target.value }))}
                className="px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none"
              />
              <input
                type="email"
                placeholder="staff@invoicechaser.app"
                value={newStaff.email}
                onChange={e => setNewStaff(p => ({ ...p, email: e.target.value }))}
                className="px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none"
              />
              <select
                value={newStaff.role}
                onChange={e => setNewStaff(p => ({ ...p, role: e.target.value }))}
                className="px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none"
              >
                <option value="admin">Admin (Staff)</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
            <div className="flex items-center gap-3">
              <button
                disabled={savingStaff || !newStaff.email.trim() || !newStaff.name.trim()}
                onClick={async () => {
                  setSavingStaff(true)
                  setStaffMsg(null)
                  try {
                    // In production this calls a server-side Edge Function that uses service role to create the user
                    // Here we update the profiles table role for an existing user by email
                    const { data: existing } = await supabase
                      .from('profiles')
                      .select('id')
                      .eq('email', newStaff.email)
                      .single()
                    if (!existing) {
                      setStaffMsg({ type: 'error', text: 'No account found with that email. Ask them to register first.' })
                    } else {
                      await supabase
                        .from('profiles')
                        .update({ role: newStaff.role, full_name: newStaff.name || undefined, updated_at: new Date().toISOString() })
                        .eq('id', existing.id)
                      setStaffMsg({ type: 'success', text: `${newStaff.email} promoted to ${newStaff.role}.` })
                      setNewStaff({ email: '', name: '', role: 'admin' })
                      fetchAll()
                    }
                  } catch { setStaffMsg({ type: 'error', text: 'Something went wrong.' }) }
                  finally { setSavingStaff(false) }
                }}
                className="px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-lg text-xs font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {savingStaff ? 'Saving…' : 'Promote to Staff'}
              </button>
              {staffMsg && (
                <span className={`text-xs ${staffMsg.type === 'error' ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {staffMsg.text}
                </span>
              )}
            </div>
          </div>

          {/* Staff list */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <span className="font-semibold text-sm text-neutral-900 dark:text-white">Current Staff</span>
              <span className="text-xs text-neutral-500">{staffList.length} members</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[400px]">
                <thead><tr className="bg-neutral-50 dark:bg-neutral-800/50">
                  <th className="px-4 py-2 text-left font-semibold text-neutral-500 uppercase">Name / Email</th>
                  <th className="px-4 py-2 text-left font-semibold text-neutral-500 uppercase">Role</th>
                  <th className="px-4 py-2 text-left font-semibold text-neutral-500 uppercase">Since</th>
                  <th className="px-4 py-2 text-right font-semibold text-neutral-500 uppercase">Actions</th>
                </tr></thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {staffList.map(s => (
                    <tr key={s.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30">
                      <td className="px-4 py-2">
                        <div className="font-medium text-neutral-900 dark:text-white">{s.full_name || s.name || '—'}</div>
                        <div className="text-neutral-400">{s.email}</div>
                      </td>
                      <td className="px-4 py-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase
                          ${s.role === 'super_admin' ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'}`}>
                          {s.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-neutral-500">{formatDate(s.created_at)}</td>
                      <td className="px-4 py-2 text-right">
                        {!s.is_protected ? (
                          <div className="flex items-center justify-end gap-3">
                            {s.role === 'admin' && (
                              <button
                                onClick={async () => {
                                  await supabase.from('profiles').update({ role: 'super_admin' }).eq('id', s.id)
                                  setStaffList(prev => prev.map(x => x.id === s.id ? { ...x, role: 'super_admin' } : x))
                                }}
                                className="text-[10px] text-neutral-600 dark:text-neutral-300 hover:underline"
                              >
                                Promote
                              </button>
                            )}
                            <button
                              onClick={async () => {
                                if (!confirm(`Demote ${s.email} to client? They will lose all staff access.`)) return
                                await supabase.from('profiles').update({ role: 'user' }).eq('id', s.id)
                                fetchAll()
                              }}
                              className="text-[10px] text-red-500 hover:underline"
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <span className="text-[9px] text-neutral-400">Protected</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {staffList.length === 0 && !loading && (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-neutral-400">No staff yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── SUPPORT / ESCALATIONS (admin + super_admin) ───────────────────── */}
      {activeTab === 'support' && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
            <div className="font-semibold text-sm mb-1 text-neutral-900 dark:text-white">Escalate to Super Admin</div>
            <p className="text-xs text-neutral-500 mb-4">Flag an issue that requires super admin attention — platform config, a billing dispute, or anything outside your scope.</p>
            <textarea
              rows={3}
              value={escalationText}
              onChange={e => setEscalationText(e.target.value)}
              placeholder="Describe the issue, affected user(s), and what you've already tried…"
              className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none resize-none mb-2"
            />
            <button
              onClick={() => {
                if (!escalationText.trim()) return
                setEscalations(prev => [{
                  id: Date.now(),
                  text: escalationText,
                  author: 'Admin',
                  status: 'open',
                  created_at: new Date().toISOString(),
                }, ...prev])
                setEscalationText('')
              }}
              className="px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-lg text-xs font-medium hover:opacity-90"
            >
              Raise Escalation
            </button>
          </div>

          {/* Open escalations */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <span className="font-semibold text-sm text-neutral-900 dark:text-white">Escalation Log</span>
              <span className="text-xs text-neutral-500">{escalations.filter(e => e.status === 'open').length} open</span>
            </div>
            {escalations.length > 0 ? (
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {escalations.map(e => (
                  <div key={e.id} className="px-5 py-4 flex items-start gap-3">
                    <div className="flex-1">
                      <div className="text-xs text-neutral-900 dark:text-white leading-relaxed">{e.text}</div>
                      <div className="text-[10px] text-neutral-400 mt-1">
                        {e.author} · {new Date(e.created_at).toLocaleString()}
                      </div>
                    </div>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase flex-shrink-0
                      ${e.status === 'open' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {e.status}
                    </span>
                    {e.status === 'open' && userRole === 'super_admin' && (
                      <button
                        onClick={() => setEscalations(prev => prev.map(x => x.id === e.id ? { ...x, status: 'resolved' } : x))}
                        className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline flex-shrink-0"
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center text-xs text-neutral-400">No escalations raised yet</div>
            )}
          </div>
        </div>
      )}

      {/* ── ROLES MATRIX ─────────────────────────────────────────────────── */}
      {activeTab === 'roles' && userRole === 'super_admin' && (
        <div className="space-y-5">
          {/* Role summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                role: 'Super Admin',
                badge: 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950',
                desc: 'Platform owner. Full root access — manages staff, platform config, database, and all credentials. Lifetime access with no subscription.',
                perks: [
                  'Lifetime access — no subscription',
                  'Create / modify / remove Admin and Super Admin accounts',
                  'Full revenue, MRR, ARR & payment visibility',
                  'Feature flags, announcements, maintenance mode',
                  'View Supabase, Stripe & Resend credentials',
                  'Database schema & migration access',
                  'All Admin capabilities',
                ],
              },
              {
                role: 'Admin',
                badge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
                desc: 'Business operations staff. Can run the SaaS day-to-day without the developer. Full client management, revenue visibility, and support — but zero access to platform infrastructure or credentials.',
                perks: [
                  'Create, edit & delete client accounts',
                  'Full subscriber & revenue/analytics visibility',
                  'Manage client API keys (pause / revoke)',
                  'View client wallets & transaction history',
                  'Suspend / unsuspend clients',
                  'Raise escalations to super admin',
                  'Unlimited use of all client features',
                ],
              },
              {
                role: 'Client',
                badge: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
                desc: 'Paying customers. Access to invoicing, BOQ/BOM, quotations, reminders, and API integrations — all scoped to their own data and gated by subscription plan.',
                perks: [
                  'All invoicing & document tools',
                  'Automated payment reminders',
                  'Wallet top-up, withdrawal, transaction history',
                  'Generate own publishable + secret API keys',
                  'Plan-limited usage caps',
                  'Own data only — no cross-tenant access',
                ],
              },
            ].map(r => (
              <div key={r.role} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mb-3 ${r.badge}`}>{r.role}</span>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-4 leading-relaxed">{r.desc}</p>
                <ul className="space-y-1.5">
                  {r.perks.map(p => (
                    <li key={p} className="flex items-start gap-2 text-xs text-neutral-700 dark:text-neutral-300">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3 text-neutral-400 flex-shrink-0 mt-0.5 shrink-0">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Grouped privilege matrix */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-neutral-200 dark:border-neutral-800">
              <span className="font-semibold text-sm text-neutral-900 dark:text-white">Full Privilege Matrix</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[460px]">
                <thead><tr className="bg-neutral-50 dark:bg-neutral-800/50">
                  <th className="px-4 py-2 text-left font-semibold text-neutral-500 uppercase">Privilege</th>
                  <th className="px-4 py-2 text-center font-semibold text-neutral-500 uppercase w-24">Super Admin</th>
                  <th className="px-4 py-2 text-center font-semibold text-neutral-500 uppercase w-20">Admin</th>
                  <th className="px-4 py-2 text-center font-semibold text-neutral-500 uppercase w-20">Client</th>
                </tr></thead>
                <tbody>
                  {(() => {
                    const groups = [...new Set(ROLE_MATRIX.map(r => r.group))]
                    return groups.map(group => (
                      <>
                        <tr key={`g-${group}`} className="bg-neutral-50 dark:bg-neutral-800/30">
                          <td colSpan={4} className="px-4 py-1.5 text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{group}</td>
                        </tr>
                        {ROLE_MATRIX.filter(r => r.group === group).map(row => (
                          <tr key={row.privilege} className="divide-x divide-neutral-100 dark:divide-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 border-t border-neutral-100 dark:border-neutral-800">
                            <td className="px-4 py-2 text-neutral-700 dark:text-neutral-300">{row.privilege}</td>
                            {['super_admin', 'admin', 'client'].map(r => (
                              <td key={r} className="px-4 py-2 text-center">
                                {row[r] ? (
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5 text-emerald-500 mx-auto">
                                    <polyline points="20 6 9 17 4 12"/>
                                  </svg>
                                ) : (
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5 text-neutral-300 dark:text-neutral-700 mx-auto">
                                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                                  </svg>
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </>
                    ))
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── PLATFORM ─────────────────────────────────────────────────────── */}
      {activeTab === 'platform' && (
        <div className="space-y-5">
          {/* Lifetime access card */}
          <div className="bg-neutral-900 dark:bg-white border border-neutral-900 dark:border-white rounded-xl p-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-white/10 dark:bg-neutral-950/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-white dark:text-neutral-950">
                  <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z"/>
                </svg>
              </div>
              <div>
                <div className="text-sm font-bold text-white dark:text-neutral-950 mb-0.5">Lifetime Owner Access</div>
                <div className="text-xs text-neutral-400 dark:text-neutral-600 mb-3">This account holds permanent super admin access — no subscription, no expiry, no billing. Full platform ownership.</div>
                <div className="flex flex-wrap gap-2">
                  {['All Features Unlocked','No Invoice Limits','No Customer Limits','All Modules Active','Platform Management','User Administration'].map(f => (
                    <span key={f} className="text-[10px] font-medium bg-white/10 dark:bg-neutral-950/10 text-white dark:text-neutral-950 px-2 py-0.5 rounded-full">{f}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* API Keys */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
            <h3 className="font-semibold text-sm text-neutral-900 dark:text-white mb-1">API Keys</h3>
            <p className="text-xs text-neutral-500 mb-4">Generate keys for third-party integrations (e.g. Buildit, Xero, Zapier).</p>
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <input
                type="text"
                value={newKeyName}
                onChange={e => setNewKeyName(e.target.value)}
                placeholder="Key name (e.g. Buildit Integration)"
                className="flex-1 px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white text-xs outline-none"
              />
              <select
                value={keyType}
                onChange={e => setKeyType(e.target.value)}
                className="px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white text-xs outline-none"
              >
                <option value="oneWay">One-way (Read-only)</option>
                <option value="biDir">Bi-directional (Sync)</option>
              </select>
              <button
                onClick={() => {
                  if (!newKeyName.trim()) return
                  const key = generateApiKey(keyType === 'oneWay' ? 'ic_ow' : 'ic_bd')
                  const entry = { id: Date.now(), name: newKeyName, key, created: new Date().toISOString(), status: 'active' }
                  setApiKeys(prev => keyType === 'oneWay' ? { ...prev, oneWay: [...prev.oneWay, entry] } : { ...prev, biDir: [...prev.biDir, entry] })
                  setNewKeyName('')
                }}
                className="px-3 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-lg text-xs font-medium hover:opacity-90 whitespace-nowrap"
              >
                Generate
              </button>
            </div>
            {[...apiKeys.oneWay, ...apiKeys.biDir].length === 0 ? (
              <p className="text-xs text-neutral-400 text-center py-4">No API keys yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[420px]">
                  <thead><tr className="bg-neutral-50 dark:bg-neutral-800/50">
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-neutral-500 uppercase">Name</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-neutral-500 uppercase">Key</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-neutral-500 uppercase">Type</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-neutral-500 uppercase">Status</th>
                    <th className="px-3 py-2 text-right text-[10px] font-semibold text-neutral-500 uppercase"></th>
                  </tr></thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {[...apiKeys.oneWay.map(k => ({...k, type:'One-way'})), ...apiKeys.biDir.map(k => ({...k, type:'Bi-dir'}))].map(k => (
                      <tr key={k.id}>
                        <td className="px-3 py-2 text-neutral-900 dark:text-white">{k.name}</td>
                        <td className="px-3 py-2 font-mono text-neutral-400">{k.key.slice(0, 20)}…</td>
                        <td className="px-3 py-2 text-neutral-500">{k.type}</td>
                        <td className="px-3 py-2">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${k.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>{k.status}</span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            onClick={() => setApiKeys(prev => ({
                              oneWay: prev.oneWay.map(x => x.id === k.id ? {...x, status: 'revoked'} : x),
                              biDir:  prev.biDir.map(x => x.id === k.id ? {...x, status: 'revoked'} : x),
                            }))}
                            className="text-[10px] text-red-500 hover:underline"
                          >
                            Revoke
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* System info */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
            <h3 className="font-semibold text-sm text-neutral-900 dark:text-white mb-3">System Info</h3>
            <div className="space-y-0 divide-y divide-neutral-100 dark:divide-neutral-800 text-xs">
              {[
                { label: 'Supabase Project',  value: 'rnfmlzpueghbbhzeosyr' },
                { label: 'Payment Gateways', value: 'Stripe + Paynow (Zimbabwe)' },
                { label: 'Email Provider',   value: 'Resend' },
                { label: 'Frontend Hosting', value: 'Netlify' },
                { label: 'Payments Server',  value: 'Node.js (Railway / Render)' },
                { label: 'Owner Account',    value: 'munyamuzvidziwa19@gmail.com' },
                { label: 'Access Tier',      value: 'Lifetime — permanent, no expiry' },
              ].map(row => (
                <div key={row.label} className="flex justify-between items-center py-2">
                  <span className="text-neutral-500">{row.label}</span>
                  <span className="font-medium text-neutral-900 dark:text-white font-mono text-[10px] text-right max-w-[55%] break-all">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
