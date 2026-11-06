import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'

export default function RequireAuth({ children }: { children: JSX.Element }): JSX.Element {
  const { ready, bootError, token, user, retryBootstrap, logout } = useAuth()
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

  return children
}
