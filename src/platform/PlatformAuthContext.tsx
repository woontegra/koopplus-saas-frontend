import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { ApiError } from '../api/client'
import { platformLogin, platformMe, type PlatformAdmin } from './platformApi'
import { clearPlatformToken, loadPlatformToken, savePlatformToken } from './platformSession'

type PlatformAuthValue = {
  ready: boolean
  token: string | null
  admin: PlatformAdmin | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const Ctx = createContext<PlatformAuthValue | null>(null)

/** Tenant AuthContext'ten tamamen bağımsız; yalnız /platform altında bağlanır. */
export function PlatformAuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [ready, setReady] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [admin, setAdmin] = useState<PlatformAdmin | null>(null)

  useEffect(() => {
    let active = true
    const existing = loadPlatformToken()
    if (!existing) {
      setReady(true)
      return
    }
    platformMe(existing)
      .then((me) => {
        if (!active) return
        setToken(existing)
        setAdmin(me.admin)
      })
      .catch((err) => {
        if (!active) return
        // Tenant JWT veya süresi dolmuş platform JWT → reddedilir.
        if (err instanceof ApiError && err.status !== 0 && err.status < 500) {
          clearPlatformToken()
        } else {
          setToken(existing)
        }
      })
      .finally(() => {
        if (active) setReady(true)
      })
    return () => {
      active = false
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const data = await platformLogin(email.trim(), password)
    savePlatformToken(data.token)
    setToken(data.token)
    setAdmin(data.admin)
  }, [])

  const logout = useCallback(() => {
    clearPlatformToken()
    setToken(null)
    setAdmin(null)
  }, [])

  const value = useMemo(
    () => ({ ready, token, admin, login, logout }),
    [ready, token, admin, login, logout]
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function usePlatformAuth(): PlatformAuthValue {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('usePlatformAuth yalnızca PlatformAuthProvider içinde kullanılabilir')
  return ctx
}

/** Yalnız platform JWT + doğrulanmış admin. Tenant kullanıcıları /platform/login'e düşer. */
export function RequirePlatform({ children }: { children: JSX.Element }): JSX.Element {
  const { ready, token, admin } = usePlatformAuth()
  const location = useLocation()
  if (!ready) {
    return (
      <div className="auth-loading" role="status">
        Platform oturumu kontrol ediliyor…
      </div>
    )
  }
  if (!token || !admin) {
    return <Navigate to="/platform/login" replace state={{ from: location.pathname }} />
  }
  return children
}
