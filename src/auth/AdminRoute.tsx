import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

/** Masaüstü MainApp AdminRoute — simplified UI faiz sayfası. */
export default function AdminRoute({ children }: { children: JSX.Element }): JSX.Element {
  const { isAdmin } = useAuth()
  if (!isAdmin) return <Navigate to="/" replace />
  return children
}
