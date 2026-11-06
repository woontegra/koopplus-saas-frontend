import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'

export default function RequireTenant({ children }: { children: JSX.Element }): JSX.Element {
  const { tenantId, memberships } = useAuth()
  const location = useLocation()

  if (!tenantId) {
    if (memberships.length === 0) {
      return <Navigate to="/login" replace />
    }
    return (
      <Navigate
        to="/kooperatifler"
        replace
        state={{ from: location.pathname, reason: 'tenant-required' }}
      />
    )
  }

  return children
}
