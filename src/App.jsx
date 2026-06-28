import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useStore } from './store/useStore'
import { onAuthStateChange, supabase } from './lib/supabase'
import { ProtectedRoute, AdminRoute } from './components/ProtectedRoute'
import { ThemeProvider } from './context/ThemeContext'

// Pages
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import PricingPage from './pages/PricingPage'
import PaymentSuccessPage from './pages/PaymentSuccessPage'
import PaymentFailurePage from './pages/PaymentFailurePage'
import CheckoutPage from './pages/CheckoutPage'
import Dashboard from './pages/Dashboard'
import InvoicesPage from './pages/InvoicesPage'
import CustomersPage from './pages/CustomersPage'
import RemindersPage from './pages/RemindersPage'
import BOQPage from './pages/BOQPage'
import BOMPage from './pages/BOMPage'
import PlansPage from './pages/PlansPage'
import SettingsPage from './pages/SettingsPage'
import TermsPage from './pages/TermsPage'
import QuotationPage from './pages/QuotationPage'
import ProformaPage from './pages/ProformaPage'
import InvoiceMakerPage from './pages/InvoiceMakerPage'
import DebitNotePage from './pages/DebitNotePage'
import CreditNotePage from './pages/CreditNotePage'
import AdminPage from './pages/AdminPage'
import ClientAccessPage from './pages/ClientAccessPage'
import ProfilePage from './pages/ProfilePage'
import WalletPage from './pages/WalletPage'
import APIKeysPage from './pages/APIKeysPage'

// Layout
import AppLayout from './components/AppLayout'

function App() {
  const { setUser, setSession, loadRole } = useStore()

  useEffect(() => {
    // Check for existing session
    const ensureUserRecord = async (user) => {
      await supabase.from('users').upsert(
        { id: user.id, email: user.email },
        { onConflict: 'id', ignoreDuplicates: true }
      )
    }

    const restoreSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        await ensureUserRecord(session.user)
        setUser(session.user)
        setSession(session)
        await loadRole()
      }
    }
    restoreSession()

    // Listen for auth changes
    const { data: { subscription } } = onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN') {
        await ensureUserRecord(session.user)
        setUser(session.user)
        setSession(session)
        loadRole()
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setSession(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [setUser, setSession, loadRole])

  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/payment-success" element={<PaymentSuccessPage />} />
        <Route path="/payment-failure" element={<PaymentFailurePage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        
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
          <Route path="boq" element={<BOQPage />} />
          <Route path="bom" element={<BOMPage />} />
          <Route path="plans" element={<PlansPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="terms" element={<TermsPage />} />
          <Route path="quotation" element={<QuotationPage />} />
          <Route path="proforma" element={<ProformaPage />} />
          <Route path="invoice-maker" element={<InvoiceMakerPage />} />
          <Route path="debit-note" element={<DebitNotePage />} />
          <Route path="credit-note" element={<CreditNotePage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="wallet" element={<WalletPage />} />
          <Route path="api-keys" element={<APIKeysPage />} />
          <Route path="admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
          <Route path="client-access" element={<AdminRoute><ClientAccessPage /></AdminRoute>} />
        </Route>
        
        {/* Redirect bare /admin → /app/admin (removes old standalone login gate) */}
        <Route path="/admin" element={<Navigate to="/app/admin" replace />} />
        
        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
