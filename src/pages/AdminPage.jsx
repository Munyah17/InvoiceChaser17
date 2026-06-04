import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatDate } from '../utils/dateFormat'

function generateApiKey(prefix) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let key = prefix + '_'
  for (let i = 0; i < 32; i++) key += chars.charAt(Math.floor(Math.random() * chars.length))
  return key
}

export default function AdminPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [apiKeys, setApiKeys] = useState({ oneWay: [], biDir: [] })
  const [newKeyName, setNewKeyName] = useState('')
  const [keyType, setKeyType] = useState('oneWay')

  // Real metrics
  const [metrics, setMetrics] = useState({ totalUsers: 0, revenue: 0, activeSubs: 0, totalInvoices: 0 })
  const [usersList, setUsersList] = useState([])
  const [enterpriseRequests, setEnterpriseRequests] = useState([])
  const [metricsLoading, setMetricsLoading] = useState(true)

  const navigate = useNavigate()

  const fetchMetrics = async () => {
    setMetricsLoading(true)
    try {
      // Total users
      const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true })

      // Revenue from completed payments
      const { data: payments } = await supabase.from('payments').select('amount').eq('status', 'completed')
      const totalRevenue = (payments || []).reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)

      // Active subscriptions
      const { count: subCount } = await supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active')

      // Total invoices
      const { count: invCount } = await supabase.from('invoices').select('*', { count: 'exact', head: true })

      setMetrics({
        totalUsers: userCount || 0,
        revenue: totalRevenue,
        activeSubs: subCount || 0,
        totalInvoices: invCount || 0,
      })

      // Users list with plans
      const { data: users } = await supabase
        .from('profiles')
        .select('id, email, full_name, plan, created_at')
        .order('created_at', { ascending: false })
        .limit(50)
      setUsersList(users || [])

      // Enterprise requests
      const { data: requests } = await supabase
        .from('enterprise_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
      setEnterpriseRequests(requests || [])
    } catch (err) {
      console.error('Metrics fetch error:', err)
    } finally {
      setMetricsLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated) fetchMetrics()
  }, [isAuthenticated])

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      const { data: userData } = await supabase.from('users').select('is_admin').eq('id', data.user.id).single()
      if (!userData?.is_admin) throw new Error('Access denied. Admin privileges required.')
      setIsAuthenticated(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const createApiKey = () => {
    if (!newKeyName.trim()) return
    const key = generateApiKey(keyType === 'oneWay' ? 'ic_ow' : 'ic_bd')
    const entry = { id: Date.now(), name: newKeyName, key, created: new Date().toISOString(), status: 'active' }
    if (keyType === 'oneWay') {
      setApiKeys(prev => ({ ...prev, oneWay: [...prev.oneWay, entry] }))
    } else {
      setApiKeys(prev => ({ ...prev, biDir: [...prev.biDir, entry] }))
    }
    setNewKeyName('')
  }

  const revokeKey = (type, id) => {
    if (type === 'oneWay') {
      setApiKeys(prev => ({ ...prev, oneWay: prev.oneWay.map(k => k.id === id ? { ...k, status: 'revoked' } : k) }))
    } else {
      setApiKeys(prev => ({ ...prev, biDir: prev.biDir.map(k => k.id === id ? { ...k, status: 'revoked' } : k) }))
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center p-6">
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-neutral-900 dark:bg-white rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white dark:fill-neutral-950">
                <path d="M12 2L2 7l10 5 10-5M2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <h1 className="font-semibold text-xl text-neutral-900 dark:text-white">Admin Login</h1>
            <p className="text-neutral-500 text-xs mt-2">Access the admin dashboard</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-3">
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@invoicechaser.com" className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white text-sm outline-none" />
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white text-sm outline-none" />
            {error && <p className="text-red-500 text-xs">{error}</p>}
            <button type="submit" disabled={loading} className="w-full py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">{loading ? 'Signing in...' : 'Sign in as Admin'}</button>
          </form>
          <p className="text-center text-xs text-neutral-500 mt-6"><button onClick={() => navigate('/app/dashboard')} className="font-medium hover:underline">Back to Dashboard</button></p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-6 animate-fade-in">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="font-semibold text-xl text-neutral-900 dark:text-white">Admin Dashboard</h1>
            <p className="text-xs text-neutral-500 mt-0.5">Manage users, API keys, and enterprise accounts</p>
          </div>
          <button onClick={() => navigate('/app/dashboard')} className="px-3 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">Back to App</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-neutral-200 dark:border-neutral-800 pb-1">
          {['overview', 'api-keys', 'enterprise'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors relative ${activeTab === tab ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'}`}>
              {tab === 'api-keys' ? 'API Keys' : tab === 'enterprise' ? 'Enterprise' : 'Overview'}
              {tab === 'enterprise' && enterpriseRequests.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {enterpriseRequests.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: 'Total Users', value: metrics.totalUsers, sub: 'Active accounts' },
                { label: 'Total Revenue', value: `$${metrics.revenue.toFixed(2)}`, sub: 'All time' },
                { label: 'Active Subs', value: metrics.activeSubs, sub: 'Paying customers' },
                { label: 'Total Invoices', value: metrics.totalInvoices, sub: 'Platform-wide' },
              ].map(item => (
                <div key={item.label} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
                  <div className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">{item.label}</div>
                  <div className="font-semibold text-2xl text-neutral-900 dark:text-white">{metricsLoading ? '…' : item.value}</div>
                  <div className="text-xs text-neutral-500 mt-1">{item.sub}</div>
                </div>
              ))}
            </div>
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-200 dark:border-neutral-800">
                <span className="font-semibold text-sm text-neutral-900 dark:text-white">Users</span>
                <span className="text-xs text-neutral-500">{usersList.length} users</span>
              </div>
              {usersList.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-10 h-10 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-3">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-neutral-400 fill-none stroke-2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
                  </div>
                  <p className="text-sm font-medium text-neutral-900 dark:text-white">No users yet</p>
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead><tr className="bg-neutral-50 dark:bg-neutral-800/50">
                    <th className="px-4 py-2 text-left font-semibold text-neutral-500 uppercase">Email</th>
                    <th className="px-4 py-2 text-left font-semibold text-neutral-500 uppercase">Plan</th>
                    <th className="px-4 py-2 text-left font-semibold text-neutral-500 uppercase">Joined</th>
                  </tr></thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {usersList.map(u => (
                      <tr key={u.id}>
                        <td className="px-4 py-2 text-neutral-900 dark:text-white">{u.email}</td>
                        <td className="px-4 py-2"><span className="capitalize">{u.plan || 'free'}</span></td>
                        <td className="px-4 py-2 text-neutral-500">{formatDate(u.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {activeTab === 'api-keys' && (
          <div className="space-y-6">
            {/* Create Key */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-3">Create New API Key</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input type="text" value={newKeyName} onChange={e => setNewKeyName(e.target.value)} placeholder="Key name (e.g. Buildit Integration)" className="px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white text-xs outline-none" />
                <select value={keyType} onChange={e => setKeyType(e.target.value)} className="px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white text-xs outline-none">
                  <option value="oneWay">One-way (Read-only catalog)</option>
                  <option value="biDir">Bi-directional (Real-time sync)</option>
                </select>
                <button onClick={createApiKey} className="px-3 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-lg text-xs font-medium hover:opacity-90 transition-opacity">Generate Key</button>
              </div>
              <div className="mt-3 text-[10px] text-neutral-500 dark:text-neutral-400">
                <p><strong>One-way:</strong> Hardware partners push their catalog to your platform. Read-only for InvoiceChaser users.</p>
                <p className="mt-1"><strong>Bi-directional:</strong> Full real-time sync. Partners can list products, update stock, and receive orders.</p>
              </div>
            </div>

            {/* One-way Keys */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-neutral-200 dark:border-neutral-800">
                <span className="text-sm font-semibold text-neutral-900 dark:text-white">One-way API Keys</span>
                <span className="text-[10px] text-neutral-500 ml-2">Read-only catalog integration</span>
              </div>
              {apiKeys.oneWay.length === 0 ? (
                <div className="p-6 text-center text-xs text-neutral-500">No one-way keys created yet</div>
              ) : (
                <table className="w-full">
                  <thead><tr className="bg-neutral-50 dark:bg-neutral-800/50"><th className="px-4 py-2 text-left text-[10px] font-semibold text-neutral-500 uppercase">Name</th><th className="px-4 py-2 text-left text-[10px] font-semibold text-neutral-500 uppercase">Key</th><th className="px-4 py-2 text-left text-[10px] font-semibold text-neutral-500 uppercase">Created</th><th className="px-4 py-2 text-left text-[10px] font-semibold text-neutral-500 uppercase">Status</th><th className="px-4 py-2 text-right text-[10px] font-semibold text-neutral-500 uppercase"></th></tr></thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {apiKeys.oneWay.map(k => (
                      <tr key={k.id}><td className="px-4 py-2 text-xs text-neutral-900 dark:text-white">{k.name}</td><td className="px-4 py-2 text-xs font-mono text-neutral-500">{k.key.slice(0, 20)}...</td><td className="px-4 py-2 text-xs text-neutral-500">{formatDate(k.created)}</td><td className="px-4 py-2"><span className={`text-[10px] px-2 py-0.5 rounded-full ${k.status === 'active' ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'}`}>{k.status}</span></td><td className="px-4 py-2 text-right"><button onClick={() => revokeKey('oneWay', k.id)} className="text-xs text-red-500 hover:text-red-600">Revoke</button></td></tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Bi-directional Keys */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-neutral-200 dark:border-neutral-800">
                <span className="text-sm font-semibold text-neutral-900 dark:text-white">Bi-directional API Keys</span>
                <span className="text-[10px] text-neutral-500 ml-2">Real-time sync with order flow</span>
              </div>
              {apiKeys.biDir.length === 0 ? (
                <div className="p-6 text-center text-xs text-neutral-500">No bi-directional keys created yet</div>
              ) : (
                <table className="w-full">
                  <thead><tr className="bg-neutral-50 dark:bg-neutral-800/50"><th className="px-4 py-2 text-left text-[10px] font-semibold text-neutral-500 uppercase">Name</th><th className="px-4 py-2 text-left text-[10px] font-semibold text-neutral-500 uppercase">Key</th><th className="px-4 py-2 text-left text-[10px] font-semibold text-neutral-500 uppercase">Created</th><th className="px-4 py-2 text-left text-[10px] font-semibold text-neutral-500 uppercase">Status</th><th className="px-4 py-2 text-right text-[10px] font-semibold text-neutral-500 uppercase"></th></tr></thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {apiKeys.biDir.map(k => (
                      <tr key={k.id}><td className="px-4 py-2 text-xs text-neutral-900 dark:text-white">{k.name}</td><td className="px-4 py-2 text-xs font-mono text-neutral-500">{k.key.slice(0, 20)}...</td><td className="px-4 py-2 text-xs text-neutral-500">{formatDate(k.created)}</td><td className="px-4 py-2"><span className={`text-[10px] px-2 py-0.5 rounded-full ${k.status === 'active' ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'}`}>{k.status}</span></td><td className="px-4 py-2 text-right"><button onClick={() => revokeKey('biDir', k.id)} className="text-xs text-red-500 hover:text-red-600">Revoke</button></td></tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {activeTab === 'enterprise' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-2">Enterprise Requests</h3>
              <p className="text-xs text-neutral-500 mb-4">Users who selected the Enterprise plan during registration.</p>
              {enterpriseRequests.length === 0 ? (
                <div className="text-center py-8 text-xs text-neutral-500">No enterprise requests yet</div>
              ) : (
                <table className="w-full text-xs">
                  <thead><tr className="bg-neutral-50 dark:bg-neutral-800/50">
                    <th className="px-4 py-2 text-left font-semibold text-neutral-500 uppercase">Name</th>
                    <th className="px-4 py-2 text-left font-semibold text-neutral-500 uppercase">Email</th>
                    <th className="px-4 py-2 text-left font-semibold text-neutral-500 uppercase">Company</th>
                    <th className="px-4 py-2 text-left font-semibold text-neutral-500 uppercase">Submitted</th>
                  </tr></thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {enterpriseRequests.map(r => (
                      <tr key={r.id}>
                        <td className="px-4 py-2 text-neutral-900 dark:text-white">{r.name}</td>
                        <td className="px-4 py-2 text-neutral-500">{r.email}</td>
                        <td className="px-4 py-2 text-neutral-500">{r.company || '—'}</td>
                        <td className="px-4 py-2 text-neutral-500">{formatDate(r.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
