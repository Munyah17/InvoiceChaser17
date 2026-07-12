import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { useTheme } from '../context/ThemeContext'
import { signOut } from '../lib/supabase'
import { canAccessAdmin } from '../utils/rbac'

export default function Sidebar({ isOpen, onClose }) {
  const { user, settings, logout, userRole } = useStore()
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()

  const isAdminUser = canAccessAdmin(userRole)

  // ── Client navigation ────────────────────────────────────────────────────
  const clientNavItems = [
    { path: '/app/dashboard',    label: 'Dashboard',     icon: 'grid' },
    { path: '/app/invoices',     label: 'Invoice Chaser', icon: 'file' },
    { path: '/app/invoice-maker',label: 'Invoice Maker', icon: 'pen-tool' },
    { path: '/app/customers',    label: 'Customers',     icon: 'users' },
    { path: '/app/quotation',    label: 'Quotation',     icon: 'quote' },
    { path: '/app/proforma',     label: 'Proforma',      icon: 'clipboard' },
    { path: '/app/debit-note',   label: 'Debit Note',    icon: 'minus-circle' },
    { path: '/app/credit-note',  label: 'Credit Note',   icon: 'plus-circle' },
    { path: '/app/reminders',    label: 'Reminders',     icon: 'bell' },
    { path: '/app/debtors-creditors', label: 'Debtors & Creditors', icon: 'analytics' },
    { path: '/app/boq',          label: 'BOQ',           icon: 'calculator' },
    { path: '/app/bom',          label: 'BOM',           icon: 'layers' },
    { path: '/app/wallet',       label: 'Wallet',        icon: 'wallet' },
    { path: '/app/api-keys',     label: 'API Keys',      icon: 'api-key' },
    { path: '/app/plans',        label: 'Upgrade Plan',  icon: 'crown' },
    { path: '/app/terms',        label: 'Terms',         icon: 'shield' },
    { path: '/app/profile',      label: 'Profile',       icon: 'user' },
    { path: '/app/settings',     label: 'Settings',      icon: 'settings' },
  ]

  // ── Admin / Super Admin management navigation ────────────────────────────
  // Staff console (business ops) — /app/admin. Both admin and super_admin.
  const staffNavItems = [
    { tab: 'overview',     label: 'Overview',          icon: 'grid' },
    { tab: 'users',        label: 'Users & Clients',   icon: 'users' },
    { tab: 'subscribers',  label: 'Subscriptions',     icon: 'crown' },
    { tab: 'analytics',    label: 'Analytics',         icon: 'analytics' },
    { tab: 'api_keys',     label: 'API Key Oversight', icon: 'api-key' },
    { tab: 'support',      label: 'Support',           icon: 'bell' },
  ]

  // Platform console — /app/console. super_admin only.
  const platformNavItems = [
    { tab: 'overview', label: 'Overview',        icon: 'grid' },
    { tab: 'staff',    label: 'Staff Management', icon: 'user' },
    { tab: 'roles',    label: 'Role Matrix',      icon: 'shield' },
    { tab: 'flags',    label: 'Feature Flags',    icon: 'flag' },
    { tab: 'platform', label: 'Platform Config',  icon: 'settings' },
  ]

  const adminAccountItems = [
    { path: '/app/profile',  label: 'My Profile', icon: 'user' },
    { path: '/app/settings', label: 'Settings',   icon: 'settings' },
  ]

  // ── Icons ────────────────────────────────────────────────────────────────
  const icons = {
    grid: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
    file: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
      </svg>
    ),
    'pen-tool': (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/>
      </svg>
    ),
    users: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
    bell: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
      </svg>
    ),
    settings: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
      </svg>
    ),
    calculator: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/>
      </svg>
    ),
    layers: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>
      </svg>
    ),
    crown: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/>
      </svg>
    ),
    quote: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/>
      </svg>
    ),
    clipboard: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
      </svg>
    ),
    shield: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
    'minus-circle': (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/>
      </svg>
    ),
    'plus-circle': (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
      </svg>
    ),
    user: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
    ),
    lock: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
      </svg>
    ),
    wallet: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/>
      </svg>
    ),
    'api-key': (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
      </svg>
    ),
    analytics: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
      </svg>
    ),
    flag: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>
      </svg>
    ),
    'client-access': (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <path d="M23 11l-4 4-2-2"/>
      </svg>
    ),
  }

  const userInitial = settings?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'
  const displayName = settings?.full_name || user?.email?.split('@')[0] || 'User'
  const displayEmail = settings?.email || user?.email || ''

  const handleLogout = async () => {
    await signOut()
    logout()
    navigate('/login')
  }

  const handleNavClick = () => {
    if (onClose) onClose()
  }

  // Active state for admin tab links
  const currentAdminTab = new URLSearchParams(location.search).get('tab') || 'overview'
  const isTabActive = (basePath, tab) => location.pathname === basePath && currentAdminTab === tab
  const isSuper = userRole === 'super_admin'

  return (
    <aside
      className={`fixed top-0 left-0 w-[200px] h-screen bg-neutral-950 flex flex-col z-50 border-r border-neutral-800 transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
    >
      {/* Logo + close button */}
      <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-neutral-800 flex-shrink-0">
        <div className="w-6 h-6 bg-white rounded-md flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-neutral-950">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
        </div>
        <span className="font-semibold text-white text-xs tracking-tight flex-1 truncate">InvoiceChaser</span>
        <button
          onClick={onClose}
          className="lg:hidden text-neutral-500 hover:text-white transition-colors p-0.5"
          aria-label="Close menu"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* ── ADMIN / SUPER ADMIN NAV ──────────────────────────────────── */}
      {isAdminUser ? (
        <nav className="flex-1 px-3 py-3 flex flex-col gap-0.5 overflow-y-auto overscroll-y-contain">
          {/* Role badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 mb-1">
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
              userRole === 'super_admin'
                ? 'bg-white text-neutral-950'
                : 'bg-blue-500/20 text-blue-400'
            }`}>
              {userRole === 'super_admin' ? 'Super Admin' : 'Admin'}
            </span>
          </div>

          <div className="px-2.5 pb-1 text-[9px] font-bold text-neutral-600 uppercase tracking-widest">Staff Console</div>

          {staffNavItems.map((item) => {
            const isActive = isTabActive('/app/admin', item.tab)
            return (
              <Link
                key={`admin-${item.tab}`}
                to={`/app/admin?tab=${item.tab}`}
                onClick={handleNavClick}
                className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-white text-neutral-950'
                    : 'text-neutral-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="w-3.5 h-3.5 flex-shrink-0">{icons[item.icon]}</span>
                <span className="truncate">{item.label}</span>
              </Link>
            )
          })}

          {/* Platform console — super_admin only */}
          {isSuper && (
            <>
              <div className="px-2.5 pb-1 pt-3 text-[9px] font-bold text-neutral-600 uppercase tracking-widest">Platform Console</div>
              {platformNavItems.map((item) => {
                const isActive = isTabActive('/app/console', item.tab)
                return (
                  <Link
                    key={`console-${item.tab}`}
                    to={`/app/console?tab=${item.tab}`}
                    onClick={handleNavClick}
                    className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-white text-neutral-950'
                        : 'text-neutral-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span className="w-3.5 h-3.5 flex-shrink-0">{icons[item.icon]}</span>
                    <span className="truncate">{item.label}</span>
                  </Link>
                )
              })}
            </>
          )}

          <div className="px-2.5 pb-1 pt-3 text-[9px] font-bold text-neutral-600 uppercase tracking-widest">Tools</div>

          <Link
            to="/app/client-access"
            onClick={handleNavClick}
            className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
              location.pathname === '/app/client-access'
                ? 'bg-blue-600 text-white'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="w-3.5 h-3.5 flex-shrink-0">{icons['client-access']}</span>
            <span className="truncate">Client Access</span>
          </Link>

          <div className="px-2.5 pb-1 pt-3 text-[9px] font-bold text-neutral-600 uppercase tracking-widest">Account</div>

          {adminAccountItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={handleNavClick}
                className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-white text-neutral-950'
                    : 'text-neutral-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="w-3.5 h-3.5 flex-shrink-0">{icons[item.icon]}</span>
                <span className="truncate">{item.label}</span>
              </Link>
            )
          })}
        </nav>
      ) : (
        /* ── CLIENT NAV ──────────────────────────────────────────────── */
        <nav className="flex-1 px-3 py-3 flex flex-col gap-0.5 overflow-y-auto overscroll-y-contain">
          {clientNavItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={handleNavClick}
                className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-white text-neutral-950'
                    : 'text-neutral-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="w-3.5 h-3.5 flex-shrink-0">{icons[item.icon]}</span>
                <span className="truncate">{item.label}</span>
              </Link>
            )
          })}
        </nav>
      )}

      {/* Bottom: theme + sign out + user card */}
      <div className="px-3 py-3 border-t border-neutral-800 space-y-2 flex-shrink-0">
        <button
          onClick={toggleTheme}
          className="flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-md text-neutral-400 hover:text-white hover:bg-white/5 transition-all text-xs font-medium"
        >
          {theme === 'dark' ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 flex-shrink-0">
              <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 flex-shrink-0">
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
            </svg>
          )}
          {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </button>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-md text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all text-xs font-medium"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 flex-shrink-0">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Sign Out
        </button>

        <Link
          to={isAdminUser ? '/app/admin?tab=overview' : '/app/profile'}
          onClick={handleNavClick}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-md bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-colors"
        >
          <div className="w-6 h-6 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-[10px] font-semibold text-neutral-300 flex-shrink-0">
            {userInitial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] text-white font-medium truncate">{displayName}</div>
            <div className="text-[9px] text-neutral-500 truncate">{displayEmail}</div>
          </div>
        </Link>
      </div>
    </aside>
  )
}
