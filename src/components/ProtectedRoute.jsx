import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { supabase } from '../lib/supabase'
import { resolveRole, canAccessAdmin, isSuperAdmin } from '../utils/rbac'

export function ProtectedRoute({ children }) {
  const { setUser } = useStore()
  const navigate = useNavigate()
  const [isAuth, setIsAuth] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (user && !error) {
        setUser(user)
        setIsAuth(true)
      } else {
        navigate('/login')
      }
      setLoading(false)
    }

    checkAuth()
  }, [navigate, setUser])

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
  const { setUserRole } = useStore()
  const navigate = useNavigate()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAdminStatus = async () => {
      // Always verify identity and role from server — never trust cached localStorage values
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (!user || authError) {
        navigate('/login')
        return
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      let role = profileData?.role
      if (!role) {
        const { data: userData } = await supabase
          .from('users')
          .select('is_admin')
          .eq('id', user.id)
          .single()
        role = resolveRole(null, userData?.is_admin)
      }

      setUserRole(role)

      if (!canAccessAdmin(role)) {
        navigate('/app/dashboard')
      } else {
        setIsAdmin(true)
      }
      setLoading(false)
    }

    checkAdminStatus()
  }, [navigate, setUserRole])

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
  const { setUserRole } = useStore()
  const navigate = useNavigate()
  const [isSuper, setIsSuper] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkSuperAdmin = async () => {
      // Always verify identity and role from server — never trust cached localStorage values
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (!user || authError) {
        navigate('/login')
        return
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      const role = profileData?.role
      setUserRole(role)

      if (!isSuperAdmin(role)) {
        navigate('/app/dashboard')
      } else {
        setIsSuper(true)
      }
      setLoading(false)
    }

    checkSuperAdmin()
  }, [navigate, setUserRole])

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
