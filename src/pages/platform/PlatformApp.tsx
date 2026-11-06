import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import BrandLogo from '../../components/layout/BrandLogo'
import { IconLogout } from '../../components/ui/icons'
import { PlatformAuthProvider, RequirePlatform, usePlatformAuth } from '../../platform/PlatformAuthContext'
import PlatformDashboardPage from './PlatformDashboardPage'
import PlatformLoginPage from './PlatformLoginPage'

function PlatformShell(): JSX.Element {
  const { admin, logout } = usePlatformAuth()
  const navigate = useNavigate()

  return (
    <div className="platform-shell">
      <header className="platform-header">
        <div className="platform-header__brand">
          <BrandLogo className="platform-header__logo" />
          <span className="platform-header__title">Platform Yönetimi</span>
        </div>
        <div className="platform-header__user">
          <div className="platform-header__user-meta">
            <strong>{admin?.fullName}</strong>
            <span>{admin?.email}</span>
          </div>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => {
              logout()
              navigate('/platform/login', { replace: true })
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

/** /platform/* — tenant uygulamasından ayrı; yalnız platform JWT. */
export default function PlatformApp(): JSX.Element {
  return (
    <PlatformAuthProvider>
      <Routes>
        <Route path="/login" element={<PlatformLoginPage />} />
        <Route
          path="/*"
          element={
            <RequirePlatform>
              <PlatformShell />
            </RequirePlatform>
          }
        />
      </Routes>
    </PlatformAuthProvider>
  )
}
