import { useState, type ReactNode } from 'react'
import { Navigate, NavLink, Route, Routes, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import BrandLogo from '../../components/layout/BrandLogo'
import NavBackdrop from '../../components/layout/NavBackdrop'
import NavMenuButton from '../../components/layout/NavMenuButton'
import { NavChromeProvider, useNavChrome } from '../../context/NavChromeContext'
import {
  IconBell,
  IconBuilding,
  IconChart,
  IconFileText,
  IconHome,
  IconLogout,
  IconSettings,
  IconShield,
  IconUser,
  IconUsers
} from '../../components/ui/icons'
import PlatformAnnouncementsPage from './PlatformAnnouncementsPage'
import PlatformAuditPage from './PlatformAuditPage'
import PlatformOnlinePage from './PlatformOnlinePage'
import PlatformOverviewPage from './PlatformOverviewPage'
import PlatformSettingsPage from './PlatformSettingsPage'
import PlatformSystemPage from './PlatformSystemPage'
import PlatformTenantDetailPage from './PlatformTenantDetailPage'
import PlatformTenantsPage from './PlatformTenantsPage'
import PlatformUsersPage from './PlatformUsersPage'

type NavItem = { to: string; label: string; icon: ReactNode; end?: boolean }

const NAV: NavItem[] = [
  { to: '/platform', label: 'Genel Bakış', icon: <IconHome size={16} />, end: true },
  { to: '/platform/tenants', label: 'Kooperatifler', icon: <IconBuilding size={16} /> },
  { to: '/platform/users', label: 'Kullanıcılar', icon: <IconUsers size={16} /> },
  { to: '/platform/online', label: 'Çevrimiçi', icon: <IconUser size={16} /> },
  { to: '/platform/announcements', label: 'Duyurular', icon: <IconBell size={16} /> },
  { to: '/platform/settings', label: 'Ayarlar', icon: <IconSettings size={16} /> },
  { to: '/platform/system', label: 'Sistem', icon: <IconShield size={16} /> },
  { to: '/platform/audit', label: 'Denetim Kaydı', icon: <IconFileText size={16} /> }
]

/** Eski bağlantılar (/platform?create=1) → kooperatif listesi + oluştur penceresi. */
function OverviewEntry(): JSX.Element {
  const [params] = useSearchParams()
  if (params.get('create') === '1') {
    return <Navigate to="/platform/tenants?create=1" replace />
  }
  return <PlatformOverviewPage />
}

function PlatformShell(): JSX.Element {
  const { user, logout, tenantId, memberships } = useAuth()
  const { navOpen, closeNav } = useNavChrome()
  const navigate = useNavigate()
  const [title] = useState('Platform Paneli')

  const backToCoop = (): void => {
    closeNav()
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
    <div className={`pf-shell${navOpen ? ' is-nav-open' : ''}`}>
      <NavBackdrop />
      <aside id="app-sidebar" className={`pf-sidebar${navOpen ? ' is-open' : ''}`}>
        <div className="pf-sidebar__brand">
          <BrandLogo className="pf-sidebar__logo" variant="onDark" />
          <span className="pf-sidebar__title">
            <IconChart size={13} /> Platform
          </span>
        </div>

        <nav className="pf-sidebar__nav" aria-label="Platform menüsü">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `pf-nav-link${isActive ? ' is-active' : ''}`}
              onClick={closeNav}
            >
              <span className="pf-nav-link__icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="pf-sidebar__foot">
          <div className="pf-sidebar__user">
            <strong>{user?.full_name}</strong>
            <span>{user?.email}</span>
          </div>
          <button type="button" className="pf-sidebar__btn" onClick={backToCoop}>
            Kooperatif ekranı
          </button>
          <button
            type="button"
            className="pf-sidebar__btn"
            onClick={() => {
              closeNav()
              void logout().then(() => navigate('/login', { replace: true }))
            }}
          >
            <IconLogout size={14} /> Çıkış
          </button>
        </div>
      </aside>

      <main className="pf-main">
        <div className="pf-main__topbar">
          <NavMenuButton />
          <span className="pf-main__topbar-title">{title}</span>
        </div>
        <div className="pf-main__inner">
          <Routes>
            <Route path="/" element={<OverviewEntry />} />
            <Route path="tenants" element={<PlatformTenantsPage />} />
            <Route path="tenants/:id" element={<PlatformTenantDetailPage />} />
            <Route path="users" element={<PlatformUsersPage />} />
            <Route path="online" element={<PlatformOnlinePage />} />
            <Route path="announcements" element={<PlatformAnnouncementsPage />} />
            <Route path="settings" element={<PlatformSettingsPage />} />
            <Route path="system" element={<PlatformSystemPage />} />
            <Route path="audit" element={<PlatformAuditPage />} />
            <Route path="*" element={<Navigate to="/platform" replace />} />
          </Routes>
        </div>
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
  return (
    <NavChromeProvider>
      <PlatformShell />
    </NavChromeProvider>
  )
}
