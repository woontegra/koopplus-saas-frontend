import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { getNavGroupsForRole } from '../../config/navigation'
import { roleLabel, useAuth } from '../../auth/AuthContext'
import { useNavChrome } from '../../context/NavChromeContext'
import { IconLogout, NavIcon } from '../ui/icons'
import BrandLogo from './BrandLogo'
import { useAskDialog } from '../../hooks/useAskDialog'

export default function Sidebar(): JSX.Element {
  const { user, logout } = useAuth()
  const { navOpen, closeNav } = useNavChrome()
  const ask = useAskDialog()
  const groups = getNavGroupsForRole(user?.role)
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async (): Promise<void> => {
    if (
      !(await ask.confirm('Oturumu kapatmak istiyor musunuz?', {
        title: 'Oturumu Kapat',
        confirmLabel: 'Çıkış Yap',
        variant: 'danger'
      }))
    ) {
      return
    }

    setLoggingOut(true)
    try {
      await logout()
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <aside id="app-sidebar" className={`sidebar${navOpen ? ' is-open' : ''}`}>
      <div className="sidebar__brand">
        <BrandLogo className="sidebar__brand-logo" />
      </div>

      <nav className="sidebar__nav">
        {groups.map((group) => (
          <div key={group.title} className="sidebar__group">
            <div className="sidebar__group-title">{group.title}</div>
            {group.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  `sidebar__item${isActive ? ' sidebar__item--active' : ''}`
                }
                title={item.description}
                onClick={closeNav}
              >
                <NavIcon name={item.icon} size={18} />
                <span className="sidebar__item-copy">
                  <span className="sidebar__item-label">{item.label}</span>
                </span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {user && (
        <div className="sidebar__footer">
          <div className="sidebar__user">
            <div className="sidebar__user-avatar" aria-hidden>
              {user.full_name.trim().charAt(0).toLocaleUpperCase('tr-TR')}
            </div>
            <div className="sidebar__user-meta">
              <div className="sidebar__user-name">{user.full_name}</div>
              <div className="sidebar__user-role">{roleLabel(user.role)}</div>
            </div>
          </div>
          <button
            type="button"
            className="sidebar__logout"
            disabled={loggingOut}
            onClick={() => void handleLogout()}
          >
            <IconLogout size={14} className="sidebar__logout-icon" />
            <span>{loggingOut ? 'Çıkış yapılıyor...' : 'Çıkış Yap'}</span>
          </button>
        </div>
      )}
    </aside>
  )
}
