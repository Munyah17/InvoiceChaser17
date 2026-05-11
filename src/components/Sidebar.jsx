import { Link, useLocation } from 'react-router-dom'
import { useStore } from '../store/useStore'

export default function Sidebar() {
  const { user, settings } = useStore()
  const location = useLocation()

  const navItems = [
    { path: '/app/dashboard', label: 'Dashboard', icon: 'grid' },
    { path: '/app/invoices', label: 'Invoices', icon: 'file' },
    { path: '/app/customers', label: 'Customers', icon: 'users' },
    { path: '/app/reminders', label: 'Reminders', icon: 'bell' },
    { path: '/app/settings', label: 'Settings', icon: 'settings' },
  ]

  const icons = {
    grid: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
    file: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
    users: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
    bell: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 01-3.46 0" />
      </svg>
    ),
    settings: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
      </svg>
    ),
  }

  const userInitial = settings?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'
  const displayName = settings?.full_name || user?.email?.split('@')[0] || 'User'
  const displayEmail = settings?.email || user?.email || ''

  return (
    <aside className="fixed top-0 left-0 w-[220px] h-screen bg-slate-900 flex flex-col z-10 border-r border-slate-800">
      <div className="flex items-center gap-3 p-5 border-b border-slate-800">
        <div className="w-8 h-8 bg-gradient-to-br from-brand to-brand-hover rounded-xl flex items-center justify-center flex-shrink-0 shadow-glow">
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        </div>
        <span className="font-display font-bold text-white text-base">InvoiceChaser</span>
      </div>

      <nav className="flex-1 p-4 flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-brand to-brand-hover text-white shadow-glow'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="w-5 h-5 flex-shrink-0">{icons[item.icon]}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-800/50 border border-slate-700">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-light to-brand/30 border border-brand/30 flex items-center justify-center text-sm font-bold text-brand flex-shrink-0">
            {userInitial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-white font-medium truncate">{displayName}</div>
            <div className="text-xs text-slate-400 truncate">{displayEmail}</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
