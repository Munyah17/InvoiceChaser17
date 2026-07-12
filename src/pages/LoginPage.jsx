import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { signIn } from '../lib/supabase'
import { useStore } from '../store/useStore'
import Button from '../components/Button'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { setUser, setSession, loadRole } = useStore()

  const rawRedirect = searchParams.get('redirect')
  const redirectUrl = rawRedirect?.startsWith('/') ? rawRedirect : null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!email || !password) {
      setError('Please fill in all fields')
      setLoading(false)
      return
    }

    const { data, error: signInError } = await signIn(email, password)

    if (signInError) {
      setError('Invalid email or password.')
      setLoading(false)
      return
    }

    setUser(data.user)
    setSession(data.session)

    // Load role and route to the right dashboard
    const role = await loadRole()
    if (redirectUrl) {
      navigate(redirectUrl)
    } else if (role === 'super_admin') {
      navigate('/app/console')   // platform console
    } else if (role === 'admin') {
      navigate('/app/admin')     // staff console
    } else {
      navigate('/app/dashboard')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 flex items-center justify-center p-6">
      <div className="w-full max-w-5xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          {/* Left: Login Form */}
          <div>
            <div className="mb-6">
              <div className="w-14 h-14 bg-neutral-950 dark:bg-white rounded-2xl flex items-center justify-center mb-4">
                <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white dark:fill-neutral-950">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              <h1 className="font-display font-bold text-3xl text-neutral-950 dark:text-white">Sign in to InvoiceChaser</h1>
              <p className="text-neutral-500 dark:text-neutral-400 mt-1">Enter your credentials to access the dashboard</p>
            </div>

            <div className="bg-neutral-100 dark:bg-neutral-900/50 backdrop-blur-sm border border-neutral-300 dark:border-neutral-700/50 rounded-3xl p-8 shadow">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-2">Email</label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-950 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-200 dark:focus:ring-neutral-700 transition-all"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-300">Password</label>
                    <Link to="/reset-password" className="text-sm text-neutral-600 dark:text-neutral-300 hover:underline">Forgot your password?</Link>
                  </div>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-950 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-200 dark:focus:ring-neutral-700 transition-all"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" className="rounded border-neutral-300 text-neutral-900 focus:ring-0" />
                    <span className="text-sm text-neutral-600 dark:text-neutral-300">Remember me</span>
                  </label>
                </div>

                {error && (
                  <div className="p-3 bg-red-900/50 border border-red-700/50 rounded-md text-sm text-red-400">{error}</div>
                )}

                <Button
                  variant="primary"
                  className="w-full font-semibold text-base py-3"
                  disabled={loading}
                >
                  {loading ? 'Signing in…' : 'Sign In'}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Don't have an account? <Link to={`/register${redirectUrl !== '/app/dashboard' ? `?redirect=${encodeURIComponent(redirectUrl)}` : ''}`} className="font-medium text-neutral-900 dark:text-white hover:underline">Create account</Link></p>
              </div>
            </div>
          </div>

          {/* Right: Info Panel (Laravel-style) */}
          <aside className="hidden md:block">
            <div className="h-full rounded-3xl overflow-hidden shadow-lg">
              <div className="h-full bg-gradient-to-br from-neutral-900 to-neutral-700 p-8 text-white flex flex-col justify-between">
                <div>
                  <h2 className="font-display text-2xl font-bold mb-2">Welcome to InvoiceChaser</h2>
                  <p className="opacity-90 mb-6">A familiar dashboard experience. Manage invoices, reminders, and payments from one place.</p>
                  <ul className="space-y-3 text-sm opacity-90">
                    <li>• Quick access to invoices and customers</li>
                    <li>• Automated reminders and payment tracking</li>
                    <li>• Secure payments via Stripe and local gateways</li>
                  </ul>
                </div>
                <div className="mt-6 text-sm opacity-90">
                  <div className="mb-2">Need help?</div>
                  <div className="flex flex-col gap-2">
                    <a href="/support" className="underline">Contact support</a>
                    <a href="/docs" className="underline">Documentation</a>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
