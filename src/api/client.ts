import { apiUrl } from './config'
import type { ApiEnvelope } from './types'

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
}

function mapHttpError(status: number, fallback: string): string {
  // Backend'in `error` alanı yoksa yedek; varsa her zaman payload.error kullanılır.
  if (status === 401) return 'Oturum geçersiz veya süresi dolmuş. Lütfen tekrar giriş yapın.'
  if (status === 403) return 'Bu işlem için yetkiniz yok.'
  if (status === 404) return 'İstenen kaynak bulunamadı.'
  if (status >= 500) return fallback || 'Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.'
  return fallback
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json'
  }

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`
  }
  if (options.tenantId) {
    headers['X-Tenant-Id'] = options.tenantId
  }

  let response: Response
  try {
    response = await fetch(apiUrl(path), {
      method: options.method ?? (options.body !== undefined ? 'POST' : 'GET'),
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined
    })
  } catch {
    throw new ApiError(
      'Sunucuya bağlanılamadı. İnternet bağlantınızı veya API adresini kontrol edin.',
      0
    )
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

  return payload.data
}
