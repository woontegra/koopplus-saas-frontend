const TOKEN_KEY = 'koopplus.saas.accessToken'
const TENANT_KEY = 'koopplus.saas.tenantId'
const REMEMBER_EMAIL_KEY = 'koopplus.saas.rememberEmail'

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

export function clearSession(): void {
  clearToken()
  clearTenantId()
}
