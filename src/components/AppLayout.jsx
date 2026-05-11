import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useStore } from '../store/useStore'
import { signOut } from '../lib/supabase'

export default function AppLayout() {
  const { user, logout } = useStore()

  const handleLogout = async () => {
    await signOut()
    logout()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <Sidebar />
      <main className="ml-[220px] p-8">
        <Outlet />
      </main>
    </div>
  )
}
