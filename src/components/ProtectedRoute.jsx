import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { supabase } from '../lib/supabase'
import { resolveRole, canAccessAdmin, isSuperAdmin } from '../utils/rbac'

export function ProtectedRoute({ children }) {
  const { setUser, setSession } = useStore()
  const navigate = useNavigate()
  const [isAuth, setIsAuth] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setUser(session.user)
        setSession(session)
        setIsAuth(true)
      } else {
        navigate('/login')
      }
      setLoading(false)
    }

    checkAuth()
  }, [navigate, setUser, setSession])

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-neutral-300">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuth) {
    return null
  }

  return children
}

export function AdminRoute({ children }) {
  const { user, userRole } = useStore()
  const navigate = useNavigate()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        navigate('/login')
        return
      }

      // Prefer already-loaded role from store
      let role = userRole

      // Fallback: fetch from profiles then users (legacy)
      if (!role) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (profileData?.role) {
          role = profileData.role
        } else {
          const { data: userData } = await supabase
            .from('users')
            .select('is_admin')
            .eq('id', user.id)
            .single()
          role = resolveRole(null, userData?.is_admin)
        }
      }

      if (!canAccessAdmin(role)) {
        navigate('/app/dashboard')
      } else {
        setIsAdmin(true)
      }
      setLoading(false)
    }

    checkAdminStatus()
  }, [user, userRole, navigate])

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-neutral-300">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return children
}

export function SuperAdminRoute({ children }) {
  const { user, userRole } = useStore()
  const navigate = useNavigate()
  const [isSuper, setIsSuper] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkSuperAdmin = async () => {
      if (!user) {
        navigate('/login')
        return
      }

      let role = userRole
      if (!role) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        role = profileData?.role
      }

      if (!isSuperAdmin(role)) {
        navigate('/app/dashboard')
      } else {
        setIsSuper(true)
      }
      setLoading(false)
    }

    checkSuperAdmin()
  }, [user, userRole, navigate])

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-neutral-300">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isSuper) {
    return null
  }

  return children
}
