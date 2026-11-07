import { apiUrl } from './config'
import type { ApiEnvelope } from './types'
import { loadToken, saveToken } from '../auth/session'
import { SESSION_CHANNEL, type SessionBroadcast } from '../auth/idleSession'

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

type RequestOptions = {
  method?: string
  body?: unknown
  token?: string | null
  tenantId?: string | null
  /** 401'de sessiz yenileme denemesini atla (refresh/login uçları). */
  skipAuthRefresh?: boolean
}

type ActivityListener = () => void

const activityListeners = new Set<ActivityListener>()

export function onApiActivity(listener: ActivityListener): () => void {
  activityListeners.add(listener)
  return () => activityListeners.delete(listener)
}

function notifyApiActivity(): void {
  for (const listener of activityListeners) {
    try {
      listener()
    } catch {
      /* ignore */
    }
  }
}

function mapHttpError(status: number, fallback: string): string {
  if (status === 401) return 'Oturum geçersiz veya süresi dolmuş. Lütfen tekrar giriş yapın.'
  if (status === 403) return 'Bu işlem için yetkiniz yok.'
  if (status === 404) return 'İstenen kaynak bulunamadı.'
  if (status >= 500) return fallback || 'Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.'
  return fallback
}

let refreshInFlight: Promise<string | null> | null = null

function broadcastTokens(access: string): void {
  try {
    const ch = new BroadcastChannel(SESSION_CHANNEL)
    const msg: SessionBroadcast = { type: 'tokens', access, refresh: null }
    ch.postMessage(msg)
    ch.close()
  } catch {
    /* ignore */
  }
}

/** Tek seferlik sessiz access yenileme — httpOnly cookie + credentials. */
export async function silentRefreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight
  refreshInFlight = (async () => {
    try {
      const headers: Record<string, string> = {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
      const response = await fetch(apiUrl('/api/auth/refresh'), {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({})
      })
      const payload = (await response.json()) as ApiEnvelope<{ token: string }>
      if (!response.ok || !payload || payload.success !== true) return null
      saveToken(payload.data.token)
      broadcastTokens(payload.data.token)
      return payload.data.token
    } catch {
      return null
    } finally {
      refreshInFlight = null
    }
  })()
  return refreshInFlight
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json'
  }

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }
  const token = options.token !== undefined ? options.token : loadToken()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  if (options.tenantId) {
    headers['X-Tenant-Id'] = options.tenantId
  }

  let response: Response
  try {
    response = await fetch(apiUrl(path), {
      method: options.method ?? (options.body !== undefined ? 'POST' : 'GET'),
      headers,
      credentials: 'include',
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined
    })
  } catch {
    throw new ApiError(
      'Sunucuya bağlanılamadı. İnternet bağlantınızı veya API adresini kontrol edin.',
      0
    )
  }

  if (response.status === 401 && !options.skipAuthRefresh && !path.includes('/api/auth/refresh')) {
    const next = await silentRefreshAccessToken()
    if (next) {
      return apiRequest<T>(path, { ...options, token: next, skipAuthRefresh: true })
    }
  }

  let payload: ApiEnvelope<T> | null = null
  try {
    payload = (await response.json()) as ApiEnvelope<T>
  } catch {
    payload = null
  }

  if (!response.ok) {
    const message =
      payload && payload.success === false && payload.error
        ? payload.error
        : mapHttpError(response.status, 'İstek başarısız oldu')
    throw new ApiError(message, response.status)
  }

  if (!payload || payload.success !== true) {
    throw new ApiError(
      payload && payload.success === false ? payload.error : 'Beklenmeyen API yanıtı',
      response.status
    )
  }

  notifyApiActivity()
  return payload.data
}
