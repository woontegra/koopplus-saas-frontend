import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { roleLabel } from '../../auth/roles'

type AppHeaderProps = {
  pageTitle: string
}

export default function AppHeader({ pageTitle }: AppHeaderProps): JSX.Element {
  const { user, activeMembership, activeRole, logout, clearTenant, memberships } = useAuth()
  const [loggingOut, setLoggingOut] = useState(false)

  const now = new Date()
  const dayNumber = String(now.getDate())
  const monthYear = now.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })
  const weekday = now.toLocaleDateString('tr-TR', { weekday: 'long' })
  const periodLabel = now.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })
  const coopName = activeMembership?.tenant.name ?? 'KoopPlus SaaS'

  const handleLogout = async (): Promise<void> => {
    setLoggingOut(true)
    try {
      await logout()
    } finally {
      setLoggingOut(false)
    }
  }

  const handleSwitchTenant = (): void => {
    clearTenant()
  }

  return (
    <header className="app-header">
      <div className="app-header__main">
        <div className="app-header__brand">
          <div className="app-header__brand-icon" aria-hidden>
            K+
          </div>
          <div className="app-header__brand-text">
            <div className="app-header__coop">{coopName}</div>
            <div className="app-header__program">{pageTitle}</div>
          </div>
        </div>

        <div className="app-header__meta" title={now.toLocaleDateString('tr-TR')}>
          <div className="app-header__clock">
            <span className="app-header__day">{dayNumber}</span>
            <div className="app-header__date-block">
              <span className="app-header__date">{monthYear}</span>
              <span className="app-header__weekday">{weekday}</span>
            </div>
          </div>
          <div className="app-header__period">
            <span className="app-header__period-label">Aktif dönem</span>
            <strong>{periodLabel}</strong>
          </div>
        </div>

        <div className="app-header__session">
          <div className="app-header__session-text">
            <strong>{user?.fullName ?? '—'}</strong>
            <span>
              {activeRole ? roleLabel(activeRole) : '—'}
              {user?.email ? ` · ${user.email}` : ''}
            </span>
          </div>
          {memberships.length > 1 ? (
            <Link
              to="/kooperatifler"
              className="app-header__session-btn"
              onClick={handleSwitchTenant}
            >
              Kooperatif değiştir
            </Link>
          ) : null}
          <button
            type="button"
            className="app-header__session-btn app-header__session-btn--danger"
            onClick={() => void handleLogout()}
            disabled={loggingOut}
          >
            {loggingOut ? 'Çıkış…' : 'Çıkış'}
          </button>
        </div>
      </div>
    </header>
  )
}
