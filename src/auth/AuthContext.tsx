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
import { ApiError, silentRefreshAccessToken } from '../api/client'
import type { AccessBlock, AuthMembership, AuthUser, MembershipRole } from '../api/types'
import {
  clearSession,
  clearTenantId,
  loadRememberedEmail,
  loadRefreshToken,
  loadTenantId,
  loadToken,
  saveRememberedEmail,
  clearRememberedEmail,
  saveRefreshToken,
  saveTenantId,
  saveToken,
  clearRefreshToken
} from './session'

/** Masaüstü Sidebar/AppLayout uyumu: full_name + role (aktif kooperatif rolü). */
export type AuthContextUser = AuthUser & {
  full_name: string
  role: MembershipRole
  has_security_question: boolean
}

/** Masaüstü ile aynı rol etiketleri. */
export function roleLabel(role: MembershipRole): string {
  switch (role) {
    case 'ADMIN':
      return 'Yönetici'
    case 'STAFF':
      return 'İşlem Yetkilisi'
    case 'VIEWER':
      return 'Sadece Görüntüleme'
    default:
      return role
  }
}

type AuthContextValue = {
  ready: boolean
  bootError: string | null
  token: string | null
  user: AuthContextUser | null
  memberships: AuthMembership[]
  tenantId: string | null
  activeMembership: AuthMembership | null
  activeRole: MembershipRole | null
  /** Süresi dolmuş / askıya alınmış kooperatif — giriş sonrası engel ekranı. */
  accessBlock: AccessBlock | null
  rememberedEmail: string | null
  canWrite: boolean
  isAdmin: boolean
  canManageInterest: boolean
  canManageUsers: boolean
  retryBootstrap: () => Promise<void>
  /** meRequest + güvenlik durumu — PasswordSection / kooperatif oluşturma sonrası. */
  refreshSession: () => Promise<void>
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
  const [accessBlock, setAccessBlock] = useState<AccessBlock | null>(null)
  const [hasSecurityQuestion, setHasSecurityQuestion] = useState(true)
  const [rememberedEmail, setRememberedEmail] = useState<string | null>(loadRememberedEmail())

  const applySession = useCallback(
    (
      nextToken: string,
      nextUser: AuthUser,
      nextMemberships: AuthMembership[],
      nextAccessBlock?: AccessBlock | null,
      nextRefresh?: string | null
    ) => {
      const nextTenant = resolveTenantId(nextMemberships, loadTenantId())
      saveToken(nextToken)
      if (nextRefresh) {
        saveRefreshToken(nextRefresh)
      }
      if (nextTenant) {
        saveTenantId(nextTenant)
      } else {
        clearTenantId()
      }
      setToken(nextToken)
      setUser(nextUser)
      setMemberships(nextMemberships)
      setTenantId(nextTenant)
      setAccessBlock(nextAccessBlock ?? null)
      setBootError(null)
    },
    []
  )

  const resetSession = useCallback(() => {
    clearSession()
    setToken(null)
    setUser(null)
    setMemberships([])
    setTenantId(null)
    setAccessBlock(null)
    setHasSecurityQuestion(true)
  }, [])

  const loadSecurityStatus = useCallback(async (): Promise<void> => {
    try {
      const res = await window.api?.auth?.getOwnSecurityStatus?.()
      if (res?.success && res.data) {
        setHasSecurityQuestion(Boolean(res.data.has_security_question))
      }
    } catch {
      /* backend hazır değilse uyarı gösterme */
    }
  }, [])

  const bootstrapSession = useCallback(async (): Promise<void> => {
    let existing = loadToken()
    if (!existing && !loadRefreshToken()) {
      setReady(true)
      setBootError(null)
      return
    }

    setReady(false)
    setBootError(null)
    try {
      if (!existing && loadRefreshToken()) {
        existing = (await silentRefreshAccessToken()) ?? null
      }
      if (!existing) {
        resetSession()
        setReady(true)
        return
      }
      try {
        const me = await meRequest(existing)
        applySession(existing, me.user, me.memberships, me.accessBlock)
        await loadSecurityStatus()
      } catch (error) {
        if (error instanceof ApiError && error.status === 401 && loadRefreshToken()) {
          const next = await silentRefreshAccessToken()
          if (next) {
            const me = await meRequest(next)
            applySession(next, me.user, me.memberships, me.accessBlock)
            await loadSecurityStatus()
            return
          }
        }
        throw error
      }
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
  }, [applySession, loadSecurityStatus, resetSession])

  useEffect(() => {
    void bootstrapSession()
  }, [bootstrapSession])

  // Başka sekmeden gelen access token güncellemesi
  useEffect(() => {
    const onStorage = (ev: StorageEvent): void => {
      if (ev.key === 'koopplus.saas.accessToken' && ev.newValue) {
        setToken(ev.newValue)
      }
      if (ev.key === 'koopplus.saas.accessToken' && ev.newValue === null) {
        setToken(null)
        setUser(null)
        setMemberships([])
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const refreshSession = useCallback(async (): Promise<void> => {
    const existing = token ?? loadToken()
    if (!existing) return
    try {
      const me = await meRequest(existing)
      applySession(existing, me.user, me.memberships, me.accessBlock)
      await loadSecurityStatus()
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        resetSession()
      }
    }
  }, [applySession, loadSecurityStatus, resetSession, token])

  const login = useCallback(
    async (email: string, password: string, remember: boolean) => {
      const data = await loginRequest(email.trim(), password)
      applySession(data.token, data.user, data.memberships, data.accessBlock, data.refreshToken)
      await loadSecurityStatus()
      if (remember) {
        saveRememberedEmail(email.trim().toLowerCase())
        setRememberedEmail(email.trim().toLowerCase())
      } else {
        clearRememberedEmail()
        setRememberedEmail(null)
      }
    },
    [applySession, loadSecurityStatus]
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
      clearRefreshToken()
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

  const contextUser = useMemo<AuthContextUser | null>(
    () =>
      user
        ? {
            ...user,
            full_name: user.fullName,
            role: activeRole ?? 'VIEWER',
            has_security_question: hasSecurityQuestion
          }
        : null,
    [user, activeRole, hasSecurityQuestion]
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      bootError,
      token,
      user: contextUser,
      memberships,
      tenantId,
      activeMembership,
      activeRole,
      accessBlock,
      rememberedEmail,
      canWrite,
      isAdmin,
      canManageInterest: isAdmin,
      canManageUsers: isAdmin,
      retryBootstrap: bootstrapSession,
      refreshSession,
      login,
      logout,
      selectTenant,
      clearTenant
    }),
    [
      ready,
      bootError,
      token,
      contextUser,
      memberships,
      tenantId,
      activeMembership,
      activeRole,
      accessBlock,
      canWrite,
      isAdmin,
      rememberedEmail,
      bootstrapSession,
      refreshSession,
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
