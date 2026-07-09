import { useStore } from '../store/useStore'
import { supabase } from '../lib/supabase'
import { useState } from 'react'

export default function ModeSelector() {
  const { user, userRole } = useStore()
  const [userMode, setUserMode] = useState(user?.user_metadata?.mode || 'business')
  const [changing, setChanging] = useState(false)

  const handleModeChange = async (newMode) => {
    if (changing) return

    setChanging(true)
    try {
      // Update user metadata in Supabase
      const { error } = await supabase.auth.updateUser({
        data: { mode: newMode },
      })

      if (error) {
        alert(`Error changing mode: ${error.message}`)
        setChanging(false)
        return
      }

      setUserMode(newMode)
      window.location.reload() // Reload to apply mode-specific UI changes
    } catch (err) {
      console.error('Mode change error:', err)
      alert('Failed to change mode')
      setChanging(false)
    }
  }

  // Only show mode selector if user is accountant or super_admin
  if (userRole !== 'super_admin' && userRole !== 'admin') {
    return null
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
      <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase">Mode:</span>
      <div className="flex gap-1">
        <button
          onClick={() => handleModeChange('business')}
          disabled={changing}
          className={`px-3 py-1 text-xs font-medium rounded-lg transition ${
            userMode === 'business'
              ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950'
              : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-600'
          } disabled:opacity-50`}
        >
          Business
        </button>
        <button
          onClick={() => handleModeChange('accountant')}
          disabled={changing}
          className={`px-3 py-1 text-xs font-medium rounded-lg transition ${
            userMode === 'accountant'
              ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950'
              : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-600'
          } disabled:opacity-50`}
        >
          Accountant
        </button>
      </div>
    </div>
  )
}
