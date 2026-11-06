const PLATFORM_TOKEN_KEY = 'koopplus.saas.platformToken'

export function loadPlatformToken(): string | null {
  try {
    return localStorage.getItem(PLATFORM_TOKEN_KEY)
  } catch {
    return null
  }
}

export function savePlatformToken(token: string): void {
  localStorage.setItem(PLATFORM_TOKEN_KEY, token)
}

export function clearPlatformToken(): void {
  localStorage.removeItem(PLATFORM_TOKEN_KEY)
}
