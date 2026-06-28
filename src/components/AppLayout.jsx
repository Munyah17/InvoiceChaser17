import { useState, useRef, useEffect } from 'react'
import { Outlet, Link, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useStore } from '../store/useStore'
import { signOut } from '../lib/supabase'

export default function AppLayout() {
  const { user, settings, logout } = useStore()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [avatarOpen, setAvatarOpen] = useState(false)
  const avatarRef = useRef(null)

  const userInitial = settings?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'
  const displayName = settings?.full_name || user?.email?.split('@')[0] || 'User'

  const handleLogout = async () => {
    setAvatarOpen(false)
    await signOut()
    logout()
    navigate('/login')
  }

  // Close avatar dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target)) {
        setAvatarOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#0a0a0f] overflow-x-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Mobile backdrop — sits above content, below sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="lg:ml-[200px] min-h-screen flex flex-col overflow-x-hidden">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-neutral-950 border-b border-neutral-800 sticky top-0 z-30">
          {/* Hamburger */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-neutral-400 hover:text-white transition-colors p-1 -ml-1"
            aria-label="Open menu"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-5 h-5">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          {/* Logo emblem only — no text */}
          <div className="flex-1 flex items-center">
            <div className="w-6 h-6 bg-white rounded flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-neutral-950">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
          </div>

          {/* Right side: notifications + avatar */}
          <div className="flex items-center gap-2">
            {/* Notifications bell */}
            <button className="relative text-neutral-400 hover:text-white transition-colors p-1">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 01-3.46 0" />
              </svg>
            </button>

            {/* Avatar dropdown */}
            <div ref={avatarRef} className="relative">
              <button
                onClick={() => setAvatarOpen(v => !v)}
                className="w-8 h-8 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-[11px] font-semibold text-white hover:border-neutral-500 transition-colors"
                aria-label="Account menu"
              >
                {userInitial}
              </button>

              {avatarOpen && (
                <div className="absolute right-0 top-10 w-52 bg-neutral-900 border border-neutral-800 rounded-xl shadow-xl z-50 overflow-hidden">
                  {/* User info */}
                  <div className="px-4 py-3 border-b border-neutral-800">
                    <div className="text-xs font-semibold text-white truncate">{displayName}</div>
                    <div className="text-[10px] text-neutral-500 truncate">{user?.email}</div>
                  </div>

                  <div className="py-1">
                    <Link
                      to="/app/profile"
                      onClick={() => setAvatarOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs text-neutral-300 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                      </svg>
                      My Profile
                    </Link>

                    <Link
                      to="/app/settings"
                      onClick={() => setAvatarOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs text-neutral-300 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                        <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
                      </svg>
                      Settings
                    </Link>

                    <button
                      className="flex items-center gap-2.5 w-full px-4 py-2 text-xs text-neutral-300 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
                      </svg>
                      Notifications
                      <span className="ml-auto text-[9px] bg-neutral-800 text-neutral-500 px-1.5 py-0.5 rounded-full">0</span>
                    </button>
                  </div>

                  <div className="border-t border-neutral-800 py-1">
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2.5 w-full px-4 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                      </svg>
                      Log Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 p-4 lg:p-6 w-full overflow-x-hidden min-w-0 overscroll-contain">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
