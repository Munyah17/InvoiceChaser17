import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, Suspense, lazy } from 'react'
import { useStore } from './store/useStore'
import { onAuthStateChange, supabase } from './lib/supabase'
import { ProtectedRoute, AdminRoute } from './components/ProtectedRoute'
import { ThemeProvider } from './context/ThemeContext'
import AppLayout from './components/AppLayout'

// Eagerly load tiny public pages — they must render before auth resolves
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'

// Lazy-load everything else so the initial JS bundle stays small
const RegisterPage       = lazy(() => import('./pages/RegisterPage'))
const PricingPage        = lazy(() => import('./pages/PricingPage'))
const PaymentSuccessPage = lazy(() => import('./pages/PaymentSuccessPage'))
const PaymentFailurePage = lazy(() => import('./pages/PaymentFailurePage'))
const PayInvoicePage     = lazy(() => import('./pages/PayInvoicePage'))
const RequestDemoPage    = lazy(() => import('./pages/RequestDemoPage'))
const CheckoutPage       = lazy(() => import('./pages/CheckoutPage'))
const Dashboard          = lazy(() => import('./pages/Dashboard'))
const InvoicesPage       = lazy(() => import('./pages/InvoicesPage'))
const CustomersPage      = lazy(() => import('./pages/CustomersPage'))
const RemindersPage      = lazy(() => import('./pages/RemindersPage'))
const BOQPage            = lazy(() => import('./pages/BOQPage'))
const BOMPage            = lazy(() => import('./pages/BOMPage'))
const PlansPage          = lazy(() => import('./pages/PlansPage'))
const SettingsPage       = lazy(() => import('./pages/SettingsPage'))
const TermsPage          = lazy(() => import('./pages/TermsPage'))
const QuotationPage      = lazy(() => import('./pages/QuotationPage'))
const ProformaPage       = lazy(() => import('./pages/ProformaPage'))
const InvoiceMakerPage   = lazy(() => import('./pages/InvoiceMakerPage'))
const DebitNotePage      = lazy(() => import('./pages/DebitNotePage'))
const CreditNotePage     = lazy(() => import('./pages/CreditNotePage'))
const AdminPage          = lazy(() => import('./pages/AdminPage'))
const ClientAccessPage   = lazy(() => import('./pages/ClientAccessPage'))
const ProfilePage        = lazy(() => import('./pages/ProfilePage'))
const WalletPage         = lazy(() => import('./pages/WalletPage'))
const APIKeysPage        = lazy(() => import('./pages/APIKeysPage'))

// QuickBooks Phase 1 - Accounting Features
const AccountsPage       = lazy(() => import('./pages/AccountsPage'))
const VendorsPage        = lazy(() => import('./pages/VendorsPage'))
const ExpensesPage       = lazy(() => import('./pages/ExpensesPage'))
const BillsPage          = lazy(() => import('./pages/BillsPage'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="w-7 h-7 border-2 border-neutral-300 dark:border-neutral-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function App() {
  const { setUser, setSession, loadRole } = useStore()

  useEffect(() => {
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
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/payment-success" element={<PaymentSuccessPage />} />
            <Route path="/payment-failure" element={<PaymentFailurePage />} />
            <Route path="/pay/:invoiceNumber" element={<PayInvoicePage />} />
            <Route path="/request-demo" element={<RequestDemoPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />

            {/* Protected routes */}
            <Route path="/app" element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/app/dashboard" replace />} />
              <Route path="dashboard"     element={<Dashboard />} />
              <Route path="invoices"      element={<InvoicesPage />} />
              <Route path="customers"     element={<CustomersPage />} />
              <Route path="reminders"     element={<RemindersPage />} />
              <Route path="boq"           element={<BOQPage />} />
              <Route path="bom"           element={<BOMPage />} />
              <Route path="plans"         element={<PlansPage />} />
              <Route path="settings"      element={<SettingsPage />} />
              <Route path="terms"         element={<TermsPage />} />
              <Route path="quotation"     element={<QuotationPage />} />
              <Route path="proforma"      element={<ProformaPage />} />
              <Route path="invoice-maker" element={<InvoiceMakerPage />} />
              <Route path="debit-note"    element={<DebitNotePage />} />
              <Route path="credit-note"   element={<CreditNotePage />} />
              <Route path="profile"       element={<ProfilePage />} />
              <Route path="wallet"        element={<WalletPage />} />
              <Route path="api-keys"      element={<APIKeysPage />} />

              {/* QuickBooks Phase 1 - Accounting Routes */}
              <Route path="accounts"      element={<AccountsPage />} />
              <Route path="vendors"       element={<VendorsPage />} />
              <Route path="expenses"      element={<ExpensesPage />} />
              <Route path="bills"         element={<BillsPage />} />

              <Route path="admin"         element={<AdminRoute><AdminPage /></AdminRoute>} />
              <Route path="client-access" element={<AdminRoute><ClientAccessPage /></AdminRoute>} />
            </Route>

            {/* Redirect bare /admin → /app/admin */}
            <Route path="/admin" element={<Navigate to="/app/admin" replace />} />

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
