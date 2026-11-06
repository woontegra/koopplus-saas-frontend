import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { navGroups, pageTitles } from '../../config/navigation'
import AppHeader from './AppHeader'
import PlaceholderPage from '../../pages/PlaceholderPage'

export default function AppShell(): JSX.Element {
  const location = useLocation()
  const pageTitle = pageTitles[location.pathname] ?? 'KoopPlus'

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <div className="sidebar__logo">
            <span className="sidebar__logo-mark">K+</span>
            <div className="sidebar__logo-text">
              <strong>KoopPlus</strong>
              <span>SaaS</span>
            </div>
          </div>
        </div>

        <nav className="sidebar__nav">
          {navGroups.map((group) => (
            <div key={group.title} className="sidebar__group">
              <div className="sidebar__group-title">{group.title}</div>
              <ul className="sidebar__list">
                {group.items.map((item) => (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      end={item.end}
                      className={({ isActive }) =>
                        isActive ? 'sidebar__link sidebar__link--active' : 'sidebar__link'
                      }
                      title={item.description}
                    >
                      <span className="sidebar__link-label">{item.label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="sidebar__footer">
          <span>Woontegra</span>
        </div>
      </aside>

      <div className="app-main">
        <AppHeader pageTitle={pageTitle} />
        <div className="workspace">
          <div className="workspace__content">
            <Routes>
              <Route path="/" element={<PlaceholderPage title="Yönetim Paneli" />} />
              <Route path="*" element={<PlaceholderPage title={pageTitle} />} />
            </Routes>
          </div>
        </div>
      </div>
    </div>
  )
}
