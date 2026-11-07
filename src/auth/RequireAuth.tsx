import { Navigate, useLocation } from 'react-router-dom'
import AccessBlockedScreen from '../components/auth/AccessBlockedScreen'
import ForcePasswordChange from '../components/auth/ForcePasswordChange'
import LicenseActivation from '../components/auth/LicenseActivation'
import { useAuth } from './AuthContext'

export default function RequireAuth({ children }: { children: JSX.Element }): JSX.Element {
  const {
    ready,
    bootError,
    token,
    user,
    memberships,
    tenantId,
    accessBlock,
    retryBootstrap,
    logout
  } = useAuth()
  const location = useLocation()

  if (!ready) {
    return (
      <div className="auth-loading" role="status">
        Oturum kontrol ediliyor…
      </div>
    )
  }

  if (bootError && token && !user) {
    return (
      <div className="auth-loading auth-loading--error">
        <div className="alert alert-error" role="alert">
          {bootError}
        </div>
        <div className="auth-loading__actions">
          <button type="button" className="app-header__session-btn" onClick={() => void retryBootstrap()}>
            Yeniden dene
          </button>
          <button
            type="button"
            className="app-header__session-btn app-header__session-btn--danger"
            onClick={() => void logout()}
          >
            Çıkış yap
          </button>
        </div>
      </div>
    )
  }

  if (!token || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (user.mustChangePassword) {
    return <ForcePasswordChange />
  }

  // Platform paneli lisans kilidine tabi değil.
  const onPlatform = location.pathname.startsWith('/platform')
  if (!onPlatform && accessBlock && !user.isPlatformAdmin) {
    return <AccessBlockedScreen />
  }

  if (!onPlatform && !user.isPlatformAdmin) {
    const pendingAdmin = memberships.filter(
      (m) => m.role === 'ADMIN' && (m.tenant.licensePending || !m.tenant.licenseActivatedAt)
    )
    const activated = memberships.filter(
      (m) => !(m.tenant.licensePending || !m.tenant.licenseActivatedAt)
    )
    const currentPending =
      !!tenantId && pendingAdmin.some((m) => m.tenantId === tenantId)
    const mustActivate =
      pendingAdmin.length > 0 && (activated.length === 0 || currentPending || !tenantId)
    if (mustActivate) {
      return <LicenseActivation />
    }
  }

  return children
}
