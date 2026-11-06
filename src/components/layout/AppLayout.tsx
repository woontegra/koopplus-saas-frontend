import { Outlet, useLocation } from 'react-router-dom'
import { useCallback, useEffect, useState } from 'react'
import type { Settings } from '@shared/types'
import { useAuth } from '../../auth/AuthContext'
import { useCooperatives } from '../../context/CooperativeContext'
import { getPageTitle } from '../../config/navigation'
import AppHeader from './AppHeader'
import Sidebar from './Sidebar'
import AppFooter from './AppFooter'
import { useProtectNativeTyping } from '../../hooks/useAppKeyboard'

export interface AppLayoutContext {
  settings: Settings | null
  reloadSettings: () => void
}

export default function AppLayout(): JSX.Element {
  const location = useLocation()
  const { user, logout } = useAuth()
  const { currentId, dataEpoch } = useCooperatives()
  const [settings, setSettings] = useState<Settings | null>(null)

  const reloadSettings = useCallback(() => {
    window.api.settings.get().then((result) => {
      if (result.success && result.data) {
        setSettings(result.data)
      }
    })
  }, [])

  useEffect(() => {
    reloadSettings()
  }, [reloadSettings, dataEpoch])

  const pageTitle = getPageTitle(location.pathname)
  useProtectNativeTyping()

  if (!user) {
    return <div className="auth-loading">Oturum doğrulanıyor...</div>
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <AppHeader
          settings={settings}
          pageTitle={pageTitle}
          user={user}
          onLogout={() => {
            logout().catch(() => undefined)
          }}
        />
        <main className="workspace__content">
          <Outlet
            key={currentId ?? 'none'}
            context={{ settings, reloadSettings } satisfies AppLayoutContext}
          />
        </main>
        <AppFooter settings={settings} />
      </div>
    </div>
  )
}
