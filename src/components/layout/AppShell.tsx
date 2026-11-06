import { useEffect, useState } from 'react'
import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { canSeeAdminOnly, roleLabel } from '../../auth/roles'
import { navGroups, pageTitles } from '../../config/navigation'
import MemberDebtTablePage from '../../pages/MemberDebtTablePage'
import SimpleMemberDetailPage from '../../pages/member/SimpleMemberDetailPage'
import SimpleMembersPage from '../../pages/member/SimpleMembersPage'
import PlaceholderPage from '../../pages/PlaceholderPage'
import AppHeader from './AppHeader'

function resolvePageTitle(pathname: string): string {
  if (pathname === '/uyeler' || pathname.startsWith('/uyeler/')) {
    return pathname === '/uyeler' ? 'Üyeler' : 'Üye Detayı'
  }
  if (pathname === '/uye-borc-tablosu' || pathname.startsWith('/uye-borc-tablosu/')) {
    return 'Üye Borç Tablosu'
  }
  return pageTitles[pathname] ?? 'KoopPlus'
}

const MOBILE_BREAKPOINT = 768

function useIsMobileShell(): boolean {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches : false
  )

  useEffect(() => {
    const media = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`)
    const onChange = (): void => setIsMobile(media.matches)
    onChange()
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  return isMobile
}

export default function AppShell(): JSX.Element {
  const location = useLocation()
  const { activeRole, activeMembership, user } = useAuth()
  const pageTitle = resolvePageTitle(location.pathname)
  const isMobile = useIsMobileShell()
  const [navOpen, setNavOpen] = useState(false)

  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.adminOnly || canSeeAdminOnly(activeRole))
    }))
    .filter((group) => group.items.length > 0)

  useEffect(() => {
    setNavOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!isMobile) {
      setNavOpen(false)
    }
  }, [isMobile])

  useEffect(() => {
    if (!navOpen) return

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setNavOpen(false)
      }
    }

    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [navOpen])

  const closeNav = (): void => setNavOpen(false)
  const toggleNav = (): void => setNavOpen((open) => !open)

  return (
    <div className={navOpen ? 'app-shell app-shell--nav-open' : 'app-shell'}>
      <button
        type="button"
        className="sidebar-overlay"
        aria-label="Menüyü kapat"
        tabIndex={navOpen ? 0 : -1}
        onClick={closeNav}
      />

      <aside
        id="app-sidebar"
        className={navOpen ? 'sidebar sidebar--open' : 'sidebar'}
        aria-hidden={isMobile && !navOpen ? true : undefined}
      >
        <div className="sidebar__brand">
          <div className="sidebar__logo">
            <span className="sidebar__logo-mark">K+</span>
            <div className="sidebar__logo-text">
              <strong>KoopPlus</strong>
              <span>SaaS</span>
            </div>
          </div>
          {isMobile ? (
            <button
              type="button"
              className="sidebar__close"
              aria-label="Menüyü kapat"
              onClick={closeNav}
            >
              ×
            </button>
          ) : null}
        </div>

        <nav className="sidebar__nav">
          {visibleGroups.map((group) => (
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
                      onClick={closeNav}
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
          <div className="sidebar__user">
            <strong>{user?.fullName ?? 'Kullanıcı'}</strong>
            <span className="sidebar__user-role">
              {activeRole ? roleLabel(activeRole) : '—'}
              {activeMembership ? ` · ${activeMembership.tenant.name}` : ''}
            </span>
          </div>
          <span>Woontegra</span>
        </div>
      </aside>

      <div className="app-main">
        <AppHeader
          pageTitle={pageTitle}
          navOpen={navOpen}
          onToggleNav={toggleNav}
          showNavToggle={isMobile}
        />
        <div className="workspace">
          <div className="workspace__content">
            <Routes>
              <Route path="/" element={<PlaceholderPage title="Yönetim Paneli" />} />
              <Route path="/uyeler" element={<SimpleMembersPage />} />
              <Route path="/uyeler/:id" element={<SimpleMemberDetailPage />} />
              <Route path="/uye-borc-tablosu" element={<MemberDebtTablePage />} />
              <Route path="/uye-borc-tablosu/:partnerId" element={<MemberDebtTablePage />} />
              <Route path="*" element={<PlaceholderPage title={pageTitle} />} />
            </Routes>
          </div>
        </div>
      </div>
    </div>
  )
}
