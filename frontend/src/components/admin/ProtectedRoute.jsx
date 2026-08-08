import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function ProtectedRoute({ children, allow }) {
  const { isAuthenticated, user } = useAuth()
  if (!isAuthenticated) return <Navigate to="/admin/login" replace />
  if (allow && !allow.includes(user?.role)) return <Navigate to="/admin/login" replace />
  return children
}
