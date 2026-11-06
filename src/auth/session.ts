const TOKEN_KEY = 'koopplus.saas.accessToken'
const TENANT_KEY = 'koopplus.saas.tenantId'
const REMEMBER_EMAIL_KEY = 'koopplus.saas.rememberEmail'
const SUPPORT_KEY = 'koopplus.saas.support'

export function loadToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function saveToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
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
  clearTenantId()
  clearSupportSession()
}
