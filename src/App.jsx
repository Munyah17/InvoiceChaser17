import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useStore } from './store/useStore'
import { onAuthStateChange, getCurrentUser } from './lib/supabase'
import { ProtectedRoute, AdminRoute } from './components/ProtectedRoute'

// Pages
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import Dashboard from './pages/Dashboard'
import InvoicesPage from './pages/InvoicesPage'
import CustomersPage from './pages/CustomersPage'
import RemindersPage from './pages/RemindersPage'
import SettingsPage from './pages/SettingsPage'
import AdminPage from './pages/AdminPage'

// Layout
import AppLayout from './components/AppLayout'

function App() {
  const { setUser, setSession } = useStore()

  useEffect(() => {
    // Check for existing session
    getCurrentUser().then(({ user }) => {
      if (user) setUser(user)
    })

    // Listen for auth changes
    const { data: { subscription } } = onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        setUser(session.user)
        setSession(session)
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setSession(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [setUser, setSession])

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        
        {/* Protected routes */}
        <Route path="/app" element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/app/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="invoices" element={<InvoicesPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="reminders" element={<RemindersPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        
        {/* Admin route */}
        <Route path="/admin" element={
          <AdminRoute>
            <AdminPage />
          </AdminRoute>
        } />
        
        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
