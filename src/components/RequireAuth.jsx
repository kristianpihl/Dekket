import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthProvider'

// Wrap a page in this to make it logged-in only. Not logged in → /login,
// and after logging in the user is sent back to where they were headed.
export default function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <p>Laster …</p>
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />

  return children
}
