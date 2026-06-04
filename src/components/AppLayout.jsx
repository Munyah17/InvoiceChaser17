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
    <div className="min-h-screen bg-neutral-50 dark:bg-[#0a0a0f]">
      <Sidebar />
      <main className="ml-[200px] p-6 max-w-[1600px]">
        <Outlet />
      </main>
    </div>
  )
}
