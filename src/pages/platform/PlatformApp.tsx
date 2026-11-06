import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import BrandLogo from '../../components/layout/BrandLogo'
import { IconLogout } from '../../components/ui/icons'
import PlatformDashboardPage from './PlatformDashboardPage'

function PlatformShell(): JSX.Element {
  const { user, logout, tenantId, memberships } = useAuth()
  const navigate = useNavigate()

  const backToCoop = (): void => {
    if (tenantId) {
      navigate('/', { replace: true })
      return
    }
    if (memberships.length > 1) {
      navigate('/kooperatifler', { replace: true })
      return
    }
    if (memberships.length === 1) {
      navigate('/', { replace: true })
      return
    }
    navigate('/kooperatifler', { replace: true })
  }

  return (
    <div className="platform-shell">
      <header className="platform-header">
        <div className="platform-header__brand">
          <BrandLogo className="platform-header__logo" />
          <span className="platform-header__title">Platform Yönetimi</span>
        </div>
        <div className="platform-header__user">
          <div className="platform-header__user-meta">
            <strong>{user?.full_name}</strong>
            <span>{user?.email}</span>
          </div>
          <button type="button" className="btn btn-sm" onClick={backToCoop}>
            Kooperatif ekranı
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => {
              void logout().then(() => navigate('/login', { replace: true }))
            }}
          >
            <IconLogout size={14} /> Çıkış
          </button>
        </div>
      </header>
      <main className="platform-main">
        <Routes>
          <Route path="/" element={<PlatformDashboardPage />} />
          <Route path="*" element={<Navigate to="/platform" replace />} />
        </Routes>
      </main>
    </div>
  )
}

/** /platform/* — aynı oturum JWT; yalnız isPlatformAdmin. */
export default function PlatformApp(): JSX.Element {
  const { user } = useAuth()
  if (!user?.isPlatformAdmin) {
    return <Navigate to="/" replace />
  }
  return <PlatformShell />
}
