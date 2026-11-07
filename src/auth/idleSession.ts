/** 60 dk hareketsizlik → oturum kapanır; 1 dk önce uyarı. */
export const IDLE_TIMEOUT_MS = 60 * 60 * 1000
export const IDLE_WARNING_MS = 60 * 1000

export const SESSION_CHANNEL = 'koopplus.saas.session'

export type SessionBroadcast =
  | { type: 'activity'; at: number }
  | { type: 'logout' }
  | { type: 'tokens'; access: string; refresh: string | null }
  | { type: 'continue'; at: number }

/** Uyarı penceresinin açılacağı an (son aktivite + idle − uyarı). */
export function idleWarningAt(lastActivityAt: number): number {
  return lastActivityAt + IDLE_TIMEOUT_MS - IDLE_WARNING_MS
}

/** Oturumun kapanacağı an. */
export function idleExpiresAt(lastActivityAt: number): number {
  return lastActivityAt + IDLE_TIMEOUT_MS
}

export function shouldShowIdleWarning(lastActivityAt: number, now = Date.now()): boolean {
  return now >= idleWarningAt(lastActivityAt) && now < idleExpiresAt(lastActivityAt)
}

export function isIdleExpired(lastActivityAt: number, now = Date.now()): boolean {
  return now >= idleExpiresAt(lastActivityAt)
}

/** Access JWT exp (saniye) → yenileme zamanı (ms). Exp yoksa 12 dk sonra dene. */
export function nextSilentRefreshAt(accessToken: string, now = Date.now()): number {
  const expSec = readJwtExp(accessToken)
  if (expSec == null) return now + 12 * 60_000
  const refreshAt = expSec * 1000 - 60_000
  return Math.max(now + 5_000, refreshAt)
}

export function readJwtExp(token: string): number | null {
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    const json = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
    const payload = JSON.parse(json) as { exp?: unknown }
    return typeof payload.exp === 'number' ? payload.exp : null
  } catch {
    return null
  }
}
