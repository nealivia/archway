import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function ProtectedRoute({ children, allow, loginPath = '/admin/login' }) {
  const { isAuthenticated, user } = useAuth()
  if (!isAuthenticated) return <Navigate to={loginPath} replace />
  if (allow && !allow.includes(user?.role)) return <Navigate to={loginPath} replace />
  return children
}
