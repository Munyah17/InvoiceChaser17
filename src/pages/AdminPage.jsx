import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signIn } from '../lib/supabase'
import { useStore } from '../store/useStore'
import Input from '../components/Input'
import Button from '../components/Button'
import Toast from '../components/Toast'

export default function AdminPage() {
  const { user } = useStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data, error } = await signIn(email, password)
      if (error) throw error
      
      // Check if user is admin
      if (data.user.user_metadata?.role === 'admin') {
        setIsAuthenticated(true)
        setToast({ message: 'Welcome, Admin!', type: 'success' })
      } else {
        throw new Error('Access denied. Admin privileges required.')
      }
    } catch (err) {
      setError(err.message)
      setToast({ message: err.message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
        
        <div className="bg-white rounded-xl border border-slate-200 p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <h1 className="font-display font-bold text-2xl text-slate-900">Admin Login</h1>
            <p className="text-slate-500 text-sm mt-2">Access the admin dashboard</p>
          </div>

          <form onSubmit={handleLogin}>
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@invoicechaser.com"
              required
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
            
            {error && (
              <p className="text-red-600 text-sm mb-4">{error}</p>
            )}

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign in as Admin'}
            </Button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            <button onClick={() => navigate('/app/dashboard')} className="text-green-600 font-medium hover:underline">
              Back to Dashboard
            </button>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 animate-fade-in">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="max-w-6xl mx-auto">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="font-display font-bold text-3xl text-slate-900">Admin Dashboard</h1>
            <p className="text-slate-500 mt-1">Manage users, subscriptions, and platform revenue</p>
          </div>
          <Button variant="default" onClick={() => navigate('/app/dashboard')}>
            Back to App
          </Button>
        </div>

        {/* Admin Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.06em] mb-2">Total Users</div>
            <div className="font-display font-bold text-3xl text-slate-900">0</div>
            <div className="text-sm text-slate-400 mt-1">Active accounts</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.06em] mb-2">Total Revenue</div>
            <div className="font-display font-bold text-3xl text-slate-900">$0</div>
            <div className="text-sm text-slate-400 mt-1">All time</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.06em] mb-2">Active Subscriptions</div>
            <div className="font-display font-bold text-3xl text-slate-900">0</div>
            <div className="text-sm text-slate-400 mt-1">Paying customers</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.06em] mb-2">Total Invoices</div>
            <div className="font-display font-bold text-3xl text-slate-900">0</div>
            <div className="text-sm text-slate-400 mt-1">Platform-wide</div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-8">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <span className="font-display font-semibold text-lg text-slate-900">Users</span>
            <span className="text-sm text-slate-500">0 users</span>
          </div>
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <svg viewBox="0 0 24 24" className="w-6 h-6 stroke-slate-400 fill-none stroke-1.5">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
              </svg>
            </div>
            <p className="font-medium text-slate-900">No users yet</p>
            <p className="text-sm text-slate-500 mt-1">Users will appear here when they sign up</p>
          </div>
        </div>

        {/* Note */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-amber-600 fill-none stroke-2 flex-shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div>
              <div className="font-semibold text-amber-800 mb-1">Admin Panel Status</div>
              <p className="text-sm text-amber-700">This is a placeholder admin panel. Connect to Supabase to enable real user management, subscription tracking, and revenue analytics.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
