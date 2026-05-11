import { Navigate } from 'react-router-dom'
import { useStore } from '../store/useStore'

export const ProtectedRoute = ({ children }) => {
  const { user } = useStore()
  
  if (!user) {
    return <Navigate to="/login" replace />
  }
  
  return children
}

export const AdminRoute = ({ children }) => {
  const { user } = useStore()
  
  if (!user) {
    return <Navigate to="/login" replace />
  }
  
  // Check if user is admin (you'll need to implement this check based on your user metadata)
  const isAdmin = user.user_metadata?.role === 'admin'
  
  if (!isAdmin) {
    return <Navigate to="/app/dashboard" replace />
  }
  
  return children
}
