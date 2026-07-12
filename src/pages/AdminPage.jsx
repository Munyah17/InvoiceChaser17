import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { authFetch } from '../lib/authFetch'
import { useStore } from '../store/useStore'
import { formatDate } from '../utils/dateFormat'

// All privileged mutations (role/plan/details/suspend/delete/demo) run through
// the service-role-backed /api/admin endpoint. Clients can no longer write
// these fields directly — RLS column grants block it — so this is the ONLY path.
async function adminAction(body) {
  const res = await authFetch('/api/admin', { method: 'POST', body: JSON.stringify(body) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

// Two distinct consoles (see App.jsx routing):
//   mode="admin"   → /app/admin   Staff console — business operations. Both
//                    admin and super_admin can use it.
//   mode="console" → /app/console Super-admin platform console — staff, roles,
//                    feature flags, infrastructure. super_admin ONLY.
const STAFF_OPS_TABS = [
  { id: 'overview',      label: 'Overview' },
  { id: 'subscribers',   label: 'Subscribers' },
  { id: 'users',         label: 'Users' },
  { id: 'demo_requests', label: 'Demo Requests' },
  { id: 'analytics',     label: 'Analytics' },
  { id: 'api_keys',      label: 'API Keys' },
  { id: 'support',       label: 'Support' },
]

const PLATFORM_TABS = [
  { id: 'overview',      label: 'Overview' },
  { id: 'staff',         label: 'Staff' },
  { id: 'roles',         label: 'Roles' },
  { id: 'pricing',       label: 'Pricing' },
  { id: 'flags',         label: 'Feature Flags' },
  { id: 'platform',      label: 'Platform' },
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

export default function AdminPage({ mode = 'admin' }) {
  const navigate = useNavigate()
  const { userRole } = useStore()
  const [searchParams, setSearchParams] = useSearchParams()

  // Which console are we rendering? Platform console is super-admin only and is
  // route-guarded by SuperAdminRoute; this also drives the tab set + chrome.
  const isConsole = mode === 'console'
  const MODE_TABS = isConsole ? PLATFORM_TABS : STAFF_OPS_TABS
  const allowedTabIds = MODE_TABS.map(t => t.id)

  // Sync active tab with URL — sidebar links use ?tab=xxx
  const urlTab = searchParams.get('tab') || 'overview'
  const tabFromUrl = allowedTabIds.includes(urlTab) ? urlTab : 'overview'
  const [activeTab, setActiveTab] = useState(tabFromUrl)

  useEffect(() => {
    const t = searchParams.get('tab') || 'overview'
    setActiveTab(allowedTabIds.includes(t) ? t : 'overview')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, mode])

  const handleTabChange = (tabId) => {
    setSearchParams({ tab: tabId }, { replace: true })
    setActiveTab(tabId)
  }
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
  const [editModal, setEditModal]     = useState(null)
  const [editFormData, setEditFormData] = useState({ name: '', full_name: '', email: '' })

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
  const [demoRequests, setDemoRequests]   = useState([])
  const [demoRequestsLoading, setDemoRequestsLoading] = useState(false)
  const [rejectModal, setRejectModal]     = useState(null)
  const [rejectReason, setRejectReason]   = useState('')
  const [processingDemo, setProcessingDemo] = useState(null)

  const [flags, setFlags] = useState(DEFAULT_FLAGS)

  // ── Pricing editor (super_admin) ──
  const [pricing, setPricing] = useState([])
  const [pricingSaving, setPricingSaving] = useState(false)
  const [pricingMsg, setPricingMsg] = useState(null)

  useEffect(() => {
    if (mode !== 'console') return
    supabase.from('app_pricing').select('*').order('display_order').then(({ data }) => {
      if (data) setPricing(data)
    })
  }, [mode])

  const handleSavePricing = async () => {
    setPricingSaving(true)
    setPricingMsg(null)
    try {
      const payload = pricing.map(p => ({
        plan_key: p.plan_key,
        name: p.name,
        amount_cents: Math.round(Number(p.amount_cents)),
        interval: p.interval,
        active: p.active,
      }))
      const res = await adminAction({ action: 'update-pricing', pricing: payload })
      if (res.pricing) setPricing(res.pricing)
      setPricingMsg({ type: 'success', text: 'Pricing updated. New prices apply to checkout immediately.' })
    } catch (err) {
      setPricingMsg({ type: 'error', text: err.message || 'Failed to update pricing' })
    } finally {
      setPricingSaving(false)
    }
  }

  const [announcement, setAnnouncement] = useState('')
  const [announcementSent, setAnnouncementSent] = useState(false)

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

  useEffect(() => { fetchAll() }, [fetchAll])

  const handleUpdateUserPlan = async (userId, newPlan) => {
    setSavingUser(userId)
    try {
      await adminAction({ action: 'update-plan', userId, newPlan })
      setUsersList(prev => prev.map(u => u.id === userId ? { ...u, plan: newPlan } : u))
    } catch (err) {
      alert(`Failed to update plan: ${err.message}`)
    } finally {
      setSavingUser(null)
      setEditingUser(null)
    }
  }

  const handleSuspendUser = async (userId) => {
    if (!confirm('Suspend this user? They will not be able to log in.')) return
    try {
      await adminAction({ action: 'suspend-user', userId })
      alert('User suspended.')
    } catch (err) {
      alert(`Failed to suspend: ${err.message}`)
    }
  }

  const openEditModal = (user) => {
    setEditModal(user.id)
    setEditFormData({
      name: user.name || '',
      full_name: user.full_name || '',
      email: user.email || '',
    })
  }

  const handleSaveUserDetails = async () => {
    if (!editModal) return
    setSavingUser(editModal)
    try {
      await adminAction({
        action: 'update-details',
        userId: editModal,
        details: { name: editFormData.name, full_name: editFormData.full_name },
      })
      setUsersList(prev => prev.map(u => u.id === editModal ? { ...u, ...editFormData } : u))
      setEditModal(null)
    } catch (err) {
      console.error('Error updating user:', err)
      alert(`Failed to update user: ${err.message}`)
    } finally {
      setSavingUser(null)
    }
  }

  const handleDeleteUser = async (userId) => {
    if (!confirm('Delete this user? This action cannot be undone. All user data will be permanently removed.')) return
    setSavingUser(userId)
    try {
      await adminAction({ action: 'delete-user', userId })
      setUsersList(prev => prev.filter(u => u.id !== userId))
      alert('User deleted.')
    } catch (err) {
      console.error('Error deleting user:', err)
      alert(`Failed to delete user: ${err.message}`)
    } finally {
      setSavingUser(null)
    }
  }

  const toggleFlag = (id) => {
    setFlags(prev => prev.map(f => f.id === id ? { ...f, enabled: !f.enabled } : f))
  }

  const fetchDemoRequests = useCallback(async () => {
    setDemoRequestsLoading(true)
    try {
      const res = await authFetch('/api/admin')
      const data = await res.json()
      if (res.ok) setDemoRequests(data.requests || [])
    } catch (err) {
      console.error('Demo requests fetch error:', err)
    } finally {
      setDemoRequestsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'demo_requests') fetchDemoRequests()
  }, [activeTab, fetchDemoRequests])

  const handleDemoRequestAction = async (id, action, reason = '') => {
    setProcessingDemo(id)
    try {
      // Frontend uses 'approve'/'reject'; the API uses 'approve-demo'/'reject-demo'.
      const apiAction = action === 'reject' ? 'reject-demo' : 'approve-demo'
      const result = await adminAction({
        demoRequestId: id,
        action: apiAction,
        reason: action === 'reject' ? reason : undefined,
      })

      // Refresh demo requests
      await fetchDemoRequests()
      if (action === 'reject') {
        setRejectModal(null)
        setRejectReason('')
      } else if (result.credentials) {
        alert(
          `Demo account created — share these credentials with the requester:\n\n` +
          `Email: ${result.credentials.email}\n` +
          `Temporary password: ${result.credentials.tempPassword}\n` +
          `Expires: ${new Date(result.credentials.expiresAt).toLocaleString()}`
        )
      } else if (result.accountCreated === false) {
        alert(result.message || 'Request approved, but the demo account could not be created.')
      }
    } catch (err) {
      console.error('Demo request action error:', err)
      alert('Failed to process demo request')
    } finally {
      setProcessingDemo(null)
    }
  }

  const fmt = (n) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const filteredUsers = usersList.filter(u =>
    !searchQuery ||
    (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.full_name || u.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  // ── Admin Portal ─────────────────────────────────────────────────────────
  return (
    <div className="animate-fade-in w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${
              userRole === 'super_admin'
                ? 'bg-white dark:bg-neutral-950'
                : 'bg-blue-600'
            }`}>
              <svg viewBox="0 0 24 24" className={`w-3.5 h-3.5 fill-none stroke-2 ${
                userRole === 'super_admin'
                  ? 'stroke-neutral-950 dark:stroke-white'
                  : 'stroke-white'
              }`}>
                {userRole === 'super_admin'
                  ? <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z"/>
                  : <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></>
                }
              </svg>
            </div>
            <h1 className="font-semibold text-lg text-neutral-900 dark:text-white">
              {isConsole ? 'Super Admin Console' : 'Staff Console'}
            </h1>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
              isConsole
                ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950'
                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
            }`}>
              {isConsole ? 'Platform' : 'Business Ops'}
            </span>
          </div>
          <p className="text-xs text-neutral-500 truncate">
            {isConsole
              ? 'Full platform control · Infrastructure · Staff · Roles · Feature flags'
              : 'Business operations · Client management · Revenue visibility · Support'}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start flex-shrink-0">
          {/* Super admins can jump between the two consoles */}
          {userRole === 'super_admin' && (
            <button
              onClick={() => navigate(isConsole ? '/app/admin' : '/app/console')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-lg hover:opacity-90"
            >
              {isConsole ? '→ Staff Console' : '→ Platform Console'}
            </button>
          )}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400">Live</span>
          </div>
          <button
            onClick={fetchAll}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none stroke-2">
              <path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs — scrollable on mobile */}
      {(() => {
        const tabs = MODE_TABS
        return (
          <div className="flex gap-0.5 mb-6 border-b border-neutral-200 dark:border-neutral-800 overflow-x-auto overscroll-x-contain">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => handleTabChange(t.id)}
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
      {activeTab === 'overview' && (() => {
        const churnRate = (metrics.activeSubs + metrics.cancelledSubs) > 0
          ? ((metrics.cancelledSubs / (metrics.activeSubs + metrics.cancelledSubs)) * 100).toFixed(1)
          : '0.0'
        const arpu = metrics.activeSubs > 0
          ? (metrics.mrr / metrics.activeSubs).toFixed(2)
          : '0.00'
        const totalPlanUsers = Object.values(metrics.planBreakdown).reduce((a, b) => a + b, 0) || 1
        const PLAN_BAR_COLOR = {
          free:         'bg-neutral-400',
          starter:      'bg-blue-500',
          professional: 'bg-violet-500',
          business:     'bg-amber-500',
          lifetime:     'bg-emerald-500',
          enterprise:   'bg-red-500',
          super_admin:  'bg-neutral-900 dark:bg-white',
        }

        return (
          <div className="space-y-4">

            {/* ── Hero revenue row ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* MRR hero card */}
              <div className="bg-neutral-950 dark:bg-white rounded-xl p-5 relative overflow-hidden">
                <div className="absolute inset-0 opacity-5"
                  style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 0%, transparent 60%)' }} />
                <div className="relative">
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-1">Monthly Recurring Revenue</div>
                  <div className="font-bold text-3xl text-white dark:text-neutral-950 mb-1">
                    {loading ? '…' : fmt(metrics.mrr)}
                  </div>
                  <div className="flex items-center gap-4 text-[11px]">
                    <span className="text-neutral-400 dark:text-neutral-500">{metrics.activeSubs} active subs</span>
                    <span className="flex items-center gap-1 text-emerald-400 dark:text-emerald-600 font-medium">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3"><polyline points="18 15 12 9 6 15"/></svg>
                      ARPU ${arpu}
                    </span>
                  </div>
                </div>
              </div>

              {/* ARR + secondary metrics 2-col right */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-1">ARR</div>
                  <div className="font-bold text-xl text-neutral-900 dark:text-white">{loading ? '…' : fmt(metrics.arr)}</div>
                  <div className="text-[10px] text-neutral-400 mt-0.5">Annualised</div>
                </div>
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-1">This Month</div>
                  <div className="font-bold text-xl text-neutral-900 dark:text-white">{loading ? '…' : fmt(metrics.revenueThisMonth)}</div>
                  <div className="text-[10px] text-neutral-400 mt-0.5">Revenue</div>
                </div>
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-1">Total Revenue</div>
                  <div className="font-bold text-xl text-neutral-900 dark:text-white">{loading ? '…' : fmt(metrics.totalRevenue)}</div>
                  <div className="text-[10px] text-neutral-400 mt-0.5">All time</div>
                </div>
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-1">Churn Rate</div>
                  <div className={`font-bold text-xl ${parseFloat(churnRate) > 10 ? 'text-red-500' : parseFloat(churnRate) > 5 ? 'text-amber-500' : 'text-emerald-500'}`}>
                    {loading ? '…' : `${churnRate}%`}
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-0.5">Cancelled / total</div>
                </div>
              </div>
            </div>

            {/* ── User metrics row ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-1">Total Users</div>
                <div className="font-bold text-2xl text-neutral-900 dark:text-white">{loading ? '…' : metrics.totalUsers}</div>
                <div className="text-[10px] text-neutral-400 mt-0.5">Registered accounts</div>
              </div>
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-1">Active Subs</div>
                <div className="font-bold text-2xl text-neutral-900 dark:text-white">{loading ? '…' : metrics.activeSubs}</div>
                <div className="text-[10px] text-neutral-400 mt-0.5">{metrics.trialSubs} trial</div>
              </div>
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-1">New Today</div>
                <div className="font-bold text-2xl text-neutral-900 dark:text-white">{loading ? '…' : metrics.newUsersToday}</div>
                <div className="text-[10px] text-neutral-400 mt-0.5">Since midnight</div>
              </div>
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-1">This Week</div>
                <div className="font-bold text-2xl text-neutral-900 dark:text-white">{loading ? '…' : metrics.newUsersThisWeek}</div>
                <div className="text-[10px] text-neutral-400 mt-0.5">New signups</div>
              </div>
            </div>

            {/* ── Middle row: plan breakdown + quick actions ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Plan distribution */}
              <div className="lg:col-span-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Plan Distribution</h3>
                  <span className="text-[10px] text-neutral-400">{metrics.totalUsers} total users</span>
                </div>
                <div className="space-y-3">
                  {Object.entries(metrics.planBreakdown).sort((a, b) => b[1] - a[1]).map(([plan, count]) => {
                    const pct = Math.round((count / totalPlanUsers) * 100)
                    return (
                      <div key={plan}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${PLAN_COLOR[plan] || PLAN_COLOR.free}`}>{plan}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-neutral-900 dark:text-white">{count}</span>
                            <span className="text-[10px] text-neutral-400 w-8 text-right">{pct}%</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${PLAN_BAR_COLOR[plan] || 'bg-neutral-400'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                  {Object.keys(metrics.planBreakdown).length === 0 && !loading && (
                    <p className="text-xs text-neutral-400 py-4 text-center">No users yet</p>
                  )}
                </div>
              </div>

              {/* Quick actions */}
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
                <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-4">Quick Actions</h3>
                <div className="space-y-2">
                  {[
                    { label: 'Manage Users', tab: 'users', icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M12 7a4 4 0 110 8 4 4 0 010-8z', color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' },
                    { label: 'Subscriptions', tab: 'subscribers', icon: 'M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14', color: 'text-violet-500 bg-violet-50 dark:bg-violet-900/20' },
                    { label: 'Analytics', tab: 'analytics', icon: 'M18 20V10M12 20V4M6 20v-6M2 20h20', color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' },
                    { label: 'API Keys', tab: 'api_keys', icon: 'M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4', color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' },
                    ...(userRole === 'super_admin' ? [
                      { label: 'Staff Management', tab: 'staff', icon: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z', color: 'text-slate-500 bg-slate-50 dark:bg-slate-900/20' },
                      { label: 'Feature Flags', tab: 'flags', icon: 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7', color: 'text-orange-500 bg-orange-50 dark:bg-orange-900/20' },
                    ] : []),
                  ].map(a => (
                    <button
                      key={a.tab}
                      onClick={() => handleTabChange(a.tab)}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors group text-left"
                    >
                      <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${a.color}`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                          <path d={a.icon}/>
                        </svg>
                      </div>
                      <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300 group-hover:text-neutral-900 dark:group-hover:text-white flex-1">{a.label}</span>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3 h-3 text-neutral-400">
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Platform health (super_admin only) ── */}
            {userRole === 'super_admin' && (
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
                <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-4">Platform Health</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Auth Service',       status: 'operational', note: 'Supabase Auth' },
                    { label: 'Database',           status: 'operational', note: 'PostgreSQL + RLS' },
                    { label: 'Stripe Payments',    status: 'operational', note: 'Webhook active' },
                    { label: 'Paynow Gateway',     status: 'operational', note: 'ZWL enabled' },
                    { label: 'Email (Resend)',      status: 'unknown',     note: 'API key needed' },
                    { label: 'CDN / Hosting',      status: 'operational', note: 'Netlify + Vercel' },
                    { label: 'RLS Policies',       status: 'operational', note: 'Zero-trust enforced' },
                    { label: 'Cache Headers',      status: 'operational', note: 'no-store on HTML' },
                  ].map(svc => (
                    <div key={svc.label} className="flex items-start gap-2.5">
                      <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${
                        svc.status === 'operational' ? 'bg-emerald-500' :
                        svc.status === 'degraded'    ? 'bg-amber-500' :
                        svc.status === 'down'        ? 'bg-red-500' :
                        'bg-neutral-400'
                      }`} />
                      <div>
                        <div className="text-xs font-medium text-neutral-900 dark:text-white leading-tight">{svc.label}</div>
                        <div className="text-[10px] text-neutral-400">{svc.note}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Recent signups ── */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-200 dark:border-neutral-800">
                <span className="font-semibold text-sm text-neutral-900 dark:text-white">Recent Signups</span>
                <button onClick={() => handleTabChange('users')} className="text-xs text-neutral-500 hover:underline">View all →</button>
              </div>
              <div className="overflow-x-auto overscroll-x-contain">
                <table className="w-full text-xs min-w-[460px]">
                  <thead><tr className="bg-neutral-50 dark:bg-neutral-800/50">
                    <th className="px-4 py-2.5 text-left font-semibold text-neutral-500 uppercase tracking-wider">User</th>
                    <th className="px-4 py-2.5 text-left font-semibold text-neutral-500 uppercase tracking-wider">Plan</th>
                    <th className="px-4 py-2.5 text-left font-semibold text-neutral-500 uppercase tracking-wider">Role</th>
                    <th className="px-4 py-2.5 text-left font-semibold text-neutral-500 uppercase tracking-wider">Joined</th>
                  </tr></thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {usersList.slice(0, 10).map(u => {
                      const initials = (u.full_name || u.name || u.email || 'U').slice(0, 1).toUpperCase()
                      return (
                        <tr key={u.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30">
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-6 h-6 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-[10px] font-semibold text-neutral-700 dark:text-neutral-300 flex-shrink-0">
                                {initials}
                              </div>
                              <div>
                                <div className="font-medium text-neutral-900 dark:text-white">{u.full_name || u.name || '—'}</div>
                                <div className="text-[10px] text-neutral-400">{u.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${PLAN_COLOR[u.plan || 'free'] || PLAN_COLOR.free}`}>{u.plan || 'free'}</span>
                          </td>
                          <td className="px-4 py-2.5 text-neutral-500 capitalize">{u.role || 'user'}</td>
                          <td className="px-4 py-2.5 text-neutral-500">{formatDate(u.created_at)}</td>
                        </tr>
                      )
                    })}
                    {usersList.length === 0 && !loading && (
                      <tr><td colSpan={4} className="px-4 py-8 text-center text-neutral-400">No users yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )
      })()}

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
            <div className="overflow-x-auto overscroll-x-contain">
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
            <div className="overflow-x-auto overscroll-x-contain">
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
                              <>
                                <button onClick={() => setEditingUser(u.id)} className="text-[10px] text-neutral-700 dark:text-neutral-300 hover:underline">Edit plan</button>
                                <button onClick={() => openEditModal(u)} className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline">Edit</button>
                              </>
                            )}
                            <button onClick={() => handleSuspendUser(u.id)} className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline">Suspend</button>
                            <button onClick={() => handleDeleteUser(u.id)} disabled={savingUser === u.id} className="text-[10px] text-red-600 dark:text-red-400 hover:underline disabled:opacity-50">Delete</button>
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

      {/* ── PRICING (super_admin) ────────────────────────────────────────── */}
      {activeTab === 'pricing' && userRole === 'super_admin' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-neutral-200 dark:border-neutral-800">
              <span className="font-semibold text-sm text-neutral-900 dark:text-white">Plan Pricing</span>
              <p className="text-xs text-neutral-500 mt-0.5">Set the price of each paid tier. Changes apply to Stripe &amp; Paynow checkout immediately (price is enforced server-side).</p>
            </div>
            <div className="overflow-x-auto overscroll-x-contain">
              <table className="w-full text-xs min-w-[540px]">
                <thead><tr className="bg-neutral-50 dark:bg-neutral-800/50 text-left">
                  <th className="px-4 py-2 font-semibold text-neutral-500 uppercase">Plan</th>
                  <th className="px-4 py-2 font-semibold text-neutral-500 uppercase">Display name</th>
                  <th className="px-4 py-2 font-semibold text-neutral-500 uppercase text-right">Price (USD)</th>
                  <th className="px-4 py-2 font-semibold text-neutral-500 uppercase">Billing</th>
                  <th className="px-4 py-2 font-semibold text-neutral-500 uppercase text-center">Active</th>
                </tr></thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {pricing.map((p, idx) => (
                    <tr key={p.plan_key}>
                      <td className="px-4 py-2 font-medium text-neutral-900 dark:text-white capitalize">{p.plan_key}</td>
                      <td className="px-4 py-2">
                        <input
                          value={p.name || ''}
                          onChange={e => setPricing(prev => prev.map((x, i) => i === idx ? { ...x, name: e.target.value } : x))}
                          className="w-40 px-2 py-1 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 rounded text-neutral-900 dark:text-white outline-none"
                        />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="inline-flex items-center gap-1">
                          <span className="text-neutral-400">$</span>
                          <input
                            type="number" min="0" step="0.01"
                            value={(Number(p.amount_cents) / 100).toString()}
                            onChange={e => {
                              const cents = Math.round(parseFloat(e.target.value || '0') * 100)
                              setPricing(prev => prev.map((x, i) => i === idx ? { ...x, amount_cents: cents } : x))
                            }}
                            className="w-24 px-2 py-1 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 rounded text-right text-neutral-900 dark:text-white outline-none"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <select
                          value={p.interval}
                          onChange={e => setPricing(prev => prev.map((x, i) => i === idx ? { ...x, interval: e.target.value } : x))}
                          className="px-2 py-1 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 rounded text-neutral-900 dark:text-white outline-none"
                        >
                          <option value="month">Monthly</option>
                          <option value="year">Yearly</option>
                          <option value="once">One-time</option>
                        </select>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={p.active !== false}
                          onChange={e => setPricing(prev => prev.map((x, i) => i === idx ? { ...x, active: e.target.checked } : x))}
                        />
                      </td>
                    </tr>
                  ))}
                  {pricing.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-neutral-400">Loading pricing…</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-neutral-200 dark:border-neutral-800 flex items-center gap-3">
              <button
                onClick={handleSavePricing}
                disabled={pricingSaving || pricing.length === 0}
                className="px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-lg text-xs font-medium hover:opacity-90 disabled:opacity-40"
              >
                {pricingSaving ? 'Saving…' : 'Save pricing'}
              </button>
              {pricingMsg && (
                <span className={`text-xs ${pricingMsg.type === 'error' ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {pricingMsg.text}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── FEATURE FLAGS ────────────────────────────────────────────────── */}
      {activeTab === 'flags' && userRole === 'super_admin' && (
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
            <div className="overflow-x-auto overscroll-x-contain">
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
                    // Look up the existing account (admins may read all profiles),
                    // then promote via the service-role /api/admin endpoint —
                    // role changes are super_admin-only and blocked client-side.
                    const { data: existing } = await supabase
                      .from('profiles')
                      .select('id')
                      .eq('email', newStaff.email)
                      .single()
                    if (!existing) {
                      setStaffMsg({ type: 'error', text: 'No account found with that email. Ask them to register first.' })
                    } else {
                      if (newStaff.name) {
                        await adminAction({ action: 'update-details', userId: existing.id, details: { full_name: newStaff.name } })
                      }
                      await adminAction({ action: 'update-role', userId: existing.id, newRole: newStaff.role })
                      setStaffMsg({ type: 'success', text: `${newStaff.email} promoted to ${newStaff.role}.` })
                      setNewStaff({ email: '', name: '', role: 'admin' })
                      fetchAll()
                    }
                  } catch (err) { setStaffMsg({ type: 'error', text: err.message || 'Something went wrong.' }) }
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
            <div className="overflow-x-auto overscroll-x-contain">
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
                                  try {
                                    await adminAction({ action: 'update-role', userId: s.id, newRole: 'super_admin' })
                                    setStaffList(prev => prev.map(x => x.id === s.id ? { ...x, role: 'super_admin' } : x))
                                  } catch (err) { alert(`Failed: ${err.message}`) }
                                }}
                                className="text-[10px] text-neutral-600 dark:text-neutral-300 hover:underline"
                              >
                                Promote
                              </button>
                            )}
                            <button
                              onClick={async () => {
                                if (!confirm(`Demote ${s.email} to client? They will lose all staff access.`)) return
                                try {
                                  await adminAction({ action: 'update-role', userId: s.id, newRole: 'user' })
                                  fetchAll()
                                } catch (err) { alert(`Failed: ${err.message}`) }
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

      {/* ── DEMO REQUESTS ────────────────────────────────────────────────── */}
      {activeTab === 'demo_requests' && (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
            <span className="font-semibold text-sm text-neutral-900 dark:text-white">Demo Requests</span>
            <span className="text-xs text-neutral-500">{demoRequests.filter(r => r.status === 'pending').length} pending</span>
          </div>
          {demoRequestsLoading ? (
            <div className="py-10 text-center text-xs text-neutral-400">Loading…</div>
          ) : demoRequests.length > 0 ? (
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {demoRequests.map(r => (
                <div key={r.id} className="px-5 py-4 flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-neutral-900 dark:text-white">{r.full_name}</span>
                      <span className="text-xs text-neutral-400">{r.email}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase
                        ${r.status === 'pending' ? 'bg-amber-100 text-amber-700' : r.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-200 text-neutral-600'}`}>
                        {r.status}
                      </span>
                    </div>
                    <div className="text-xs text-neutral-500 mt-1">
                      {r.company_name || '—'} · {r.business_type || '—'} · {r.company_size || '—'}
                    </div>
                    {r.interests?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {r.interests.map(i => (
                          <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">{i}</span>
                        ))}
                      </div>
                    )}
                    {r.message && <div className="text-xs text-neutral-500 mt-2 italic">"{r.message}"</div>}
                    <div className="text-[10px] text-neutral-400 mt-1">{new Date(r.created_at).toLocaleString()}</div>
                  </div>
                  {r.status === 'pending' && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleDemoRequestAction(r.id, 'approve')}
                        disabled={processingDemo === r.id}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 dark:bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {processingDemo === r.id ? 'Processing…' : 'Approve'}
                      </button>
                      <button
                        onClick={() => setRejectModal(r.id)}
                        disabled={processingDemo === r.id}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center text-xs text-neutral-400">No demo requests yet</div>
          )}
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
            <div className="overflow-x-auto overscroll-x-contain">
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
      {activeTab === 'platform' && userRole === 'super_admin' && (
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
              <div className="overflow-x-auto overscroll-x-contain">
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

      {/* ── REJECT DEMO MODAL ────────────────────────────────────────────────── */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 max-w-sm w-full shadow-lg">
            <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800">
              <h3 className="font-semibold text-neutral-900 dark:text-white">Reject Demo Request</h3>
              <p className="text-xs text-neutral-500 mt-1">Provide a reason for rejection (optional)</p>
            </div>
            <div className="px-5 py-4">
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="e.g., Business model doesn't match our target market, or needs follow-up information"
                rows={3}
                className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none focus:border-neutral-400 dark:focus:border-neutral-600 resize-none"
              />
            </div>
            <div className="px-5 py-3 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-2">
              <button
                onClick={() => {
                  setRejectModal(null)
                  setRejectReason('')
                }}
                className="px-3 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDemoRequestAction(rejectModal, 'reject', rejectReason)}
                disabled={processingDemo === rejectModal}
                className="px-3 py-2 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processingDemo === rejectModal ? 'Rejecting…' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT USER MODAL ────────────────────────────────────────────────── */}
      {editModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 max-w-sm w-full max-h-[90vh] overflow-auto shadow-lg">
            <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between sticky top-0 bg-white dark:bg-neutral-900">
              <h3 className="font-semibold text-neutral-900 dark:text-white">Edit User</h3>
              <button onClick={() => setEditModal(null)} className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 text-xl">×</button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-neutral-500 uppercase">Email (Read-only)</label>
                <input
                  type="email"
                  value={editFormData.email}
                  readOnly
                  className="mt-1 w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-500 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-neutral-500 uppercase">Name</label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={e => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Username or display name"
                  className="mt-1 w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none focus:border-neutral-400 dark:focus:border-neutral-600"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-neutral-500 uppercase">Full Name</label>
                <input
                  type="text"
                  value={editFormData.full_name}
                  onChange={e => setEditFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="First and last name"
                  className="mt-1 w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none focus:border-neutral-400 dark:focus:border-neutral-600"
                />
              </div>
            </div>
            <div className="px-5 py-3 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-2">
              <button
                onClick={() => setEditModal(null)}
                className="px-3 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveUserDetails}
                disabled={savingUser === editModal}
                className="px-3 py-2 text-xs font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingUser === editModal ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
