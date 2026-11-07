/** Access token yalnızca bellek — localStorage'a yazılmaz. */
let memoryAccessToken: string | null = null

const TENANT_KEY = 'koopplus.saas.tenantId'
const REMEMBER_EMAIL_KEY = 'koopplus.saas.rememberEmail'
const SUPPORT_KEY = 'koopplus.saas.support'
const LAST_ACTIVITY_KEY = 'koopplus.saas.lastActivityAt'
/** Eski localStorage jetonlarını bir kez temizle (cookie geçişi). */
const LEGACY_ACCESS_KEY = 'koopplus.saas.accessToken'
const LEGACY_REFRESH_KEY = 'koopplus.saas.refreshToken'

function scrubLegacyTokens(): void {
  try {
    localStorage.removeItem(LEGACY_ACCESS_KEY)
    localStorage.removeItem(LEGACY_REFRESH_KEY)
  } catch {
    /* ignore */
  }
}

scrubLegacyTokens()

export function loadToken(): string | null {
  return memoryAccessToken
}

export function saveToken(token: string): void {
  memoryAccessToken = token
  scrubLegacyTokens()
}

export function clearToken(): void {
  memoryAccessToken = null
}

/** Refresh httpOnly cookie'de; istemci gövdesinde tutulmaz. */
export function loadRefreshToken(): string | null {
  return null
}

export function saveRefreshToken(_token: string): void {
  scrubLegacyTokens()
}

export function clearRefreshToken(): void {
  scrubLegacyTokens()
}

export function loadLastActivityAt(): number {
  try {
    const raw = localStorage.getItem(LAST_ACTIVITY_KEY)
    const n = raw ? Number(raw) : NaN
    return Number.isFinite(n) ? n : Date.now()
  } catch {
    return Date.now()
  }
}

export function saveLastActivityAt(at: number): void {
  try {
    localStorage.setItem(LAST_ACTIVITY_KEY, String(at))
  } catch {
    /* ignore */
  }
}

export function clearLastActivityAt(): void {
  try {
    localStorage.removeItem(LAST_ACTIVITY_KEY)
  } catch {
    /* ignore */
  }
}

export function loadTenantId(): string | null {
  try {
    return localStorage.getItem(TENANT_KEY)
  } catch {
    return null
  }
}

export function saveTenantId(tenantId: string): void {
  localStorage.setItem(TENANT_KEY, tenantId)
}

export function clearTenantId(): void {
  localStorage.removeItem(TENANT_KEY)
}

export function loadRememberedEmail(): string | null {
  try {
    return localStorage.getItem(REMEMBER_EMAIL_KEY)
  } catch {
    return null
  }
}

export function saveRememberedEmail(email: string): void {
  localStorage.setItem(REMEMBER_EMAIL_KEY, email)
}

export function clearRememberedEmail(): void {
  localStorage.removeItem(REMEMBER_EMAIL_KEY)
}

/** Platform "Destek modu" (impersonate) durumu — yalnız banner için; yetki token'dadır. */
export type SupportSession = {
  tenantId: string
  tenantName: string
  startedAt: string
}

export function loadSupportSession(): SupportSession | null {
  try {
    const raw = localStorage.getItem(SUPPORT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<SupportSession>
    if (!parsed || typeof parsed.tenantId !== 'string') return null
    return {
      tenantId: parsed.tenantId,
      tenantName: String(parsed.tenantName ?? ''),
      startedAt: String(parsed.startedAt ?? '')
    }
  } catch {
    return null
  }
}

export function saveSupportSession(session: SupportSession): void {
  localStorage.setItem(SUPPORT_KEY, JSON.stringify(session))
}

export function clearSupportSession(): void {
  localStorage.removeItem(SUPPORT_KEY)
}

export function clearSession(): void {
  clearToken()
  clearRefreshToken()
  clearTenantId()
  clearSupportSession()
  clearLastActivityAt()
}
