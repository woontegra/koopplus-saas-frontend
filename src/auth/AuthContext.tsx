import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react'
import { loginRequest, logoutRequest, meRequest } from '../api/auth'
import { ApiError } from '../api/client'
import type { AuthMembership, AuthUser, MembershipRole } from '../api/types'
import {
  clearSession,
  clearTenantId,
  loadRememberedEmail,
  loadTenantId,
  loadToken,
  saveRememberedEmail,
  clearRememberedEmail,
  saveTenantId,
  saveToken
} from './session'

type AuthContextValue = {
  ready: boolean
  bootError: string | null
  token: string | null
  user: AuthUser | null
  memberships: AuthMembership[]
  tenantId: string | null
  activeMembership: AuthMembership | null
  activeRole: MembershipRole | null
  rememberedEmail: string | null
  /** Masaüstü uyumluluğu: ADMIN | STAFF yazabilir */
  canWrite: boolean
  /** Masaüstü uyumluluğu: yalnızca ADMIN */
  isAdmin: boolean
  canManageInterest: boolean
  canManageUsers: boolean
  retryBootstrap: () => Promise<void>
  login: (email: string, password: string, remember: boolean) => Promise<void>
  logout: () => Promise<void>
  selectTenant: (tenantId: string) => void
  clearTenant: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function resolveTenantId(
  memberships: AuthMembership[],
  preferred: string | null
): string | null {
  if (preferred && memberships.some((m) => m.tenantId === preferred)) {
    return preferred
  }
  if (memberships.length === 1) {
    return memberships[0].tenantId
  }
  return null
}

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [ready, setReady] = useState(false)
  const [bootError, setBootError] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [memberships, setMemberships] = useState<AuthMembership[]>([])
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [rememberedEmail, setRememberedEmail] = useState<string | null>(loadRememberedEmail())

  const applySession = useCallback((nextToken: string, nextUser: AuthUser, nextMemberships: AuthMembership[]) => {
    const nextTenant = resolveTenantId(nextMemberships, loadTenantId())
    saveToken(nextToken)
    if (nextTenant) {
      saveTenantId(nextTenant)
    } else {
      clearTenantId()
    }
    setToken(nextToken)
    setUser(nextUser)
    setMemberships(nextMemberships)
    setTenantId(nextTenant)
    setBootError(null)
  }, [])

  const resetSession = useCallback(() => {
    clearSession()
    setToken(null)
    setUser(null)
    setMemberships([])
    setTenantId(null)
  }, [])

  const bootstrapSession = useCallback(async (): Promise<void> => {
    const existing = loadToken()
    if (!existing) {
      setReady(true)
      setBootError(null)
      return
    }

    setReady(false)
    setBootError(null)
    try {
      const me = await meRequest(existing)
      applySession(existing, me.user, me.memberships)
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        resetSession()
        setBootError(null)
      } else {
        setToken(existing)
        setBootError(
          error instanceof ApiError
            ? error.message
            : 'Oturum doğrulanamadı. Bağlantınızı kontrol edin.'
        )
      }
    } finally {
      setReady(true)
    }
  }, [applySession, resetSession])

  useEffect(() => {
    void bootstrapSession()
  }, [bootstrapSession])

  const login = useCallback(
    async (email: string, password: string, remember: boolean) => {
      const data = await loginRequest(email.trim(), password)
      applySession(data.token, data.user, data.memberships)
      if (remember) {
        saveRememberedEmail(email.trim().toLowerCase())
        setRememberedEmail(email.trim().toLowerCase())
      } else {
        clearRememberedEmail()
        setRememberedEmail(null)
      }
    },
    [applySession]
  )

  const logout = useCallback(async () => {
    const current = token ?? loadToken()
    try {
      if (current) {
        await logoutRequest(current)
      }
    } catch {
      // Çıkışta sunucu hatası olsa da yerel oturum kapanır
    } finally {
      resetSession()
    }
  }, [resetSession, token])

  const selectTenant = useCallback(
    (nextTenantId: string) => {
      const membership = memberships.find((m) => m.tenantId === nextTenantId)
      if (!membership) {
        throw new Error('Bu kooperatife erişim yetkiniz yok')
      }
      saveTenantId(nextTenantId)
      setTenantId(nextTenantId)
    },
    [memberships]
  )

  const clearTenant = useCallback(() => {
    clearTenantId()
    setTenantId(null)
  }, [])

  const activeMembership = useMemo(
    () => memberships.find((m) => m.tenantId === tenantId) ?? null,
    [memberships, tenantId]
  )

  const activeRole = activeMembership?.role ?? null
  const isAdmin = activeRole === 'ADMIN'
  const canWrite = activeRole === 'ADMIN' || activeRole === 'STAFF'

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      bootError,
      token,
      user,
      memberships,
      tenantId,
      activeMembership,
      activeRole,
      rememberedEmail,
      canWrite,
      isAdmin,
      canManageInterest: isAdmin,
      canManageUsers: isAdmin,
      retryBootstrap: bootstrapSession,
      login,
      logout,
      selectTenant,
      clearTenant
    }),
    [
      ready,
      bootError,
      token,
      user,
      memberships,
      tenantId,
      activeMembership,
      activeRole,
      canWrite,
      isAdmin,
      rememberedEmail,
      bootstrapSession,
      login,
      logout,
      selectTenant,
      clearTenant
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth yalnızca AuthProvider içinde kullanılabilir')
  }
  return ctx
}
