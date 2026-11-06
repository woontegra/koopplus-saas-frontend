import { ApiError, apiRequest } from '../api/client'
import type { ApiResult } from '@shared/types'
import { loadTenantId, loadToken } from '../auth/session'

async function wrapRequest<T>(
  path: string,
  options: { method?: string; body?: unknown; token?: string | null; tenantId?: string | null }
): Promise<ApiResult<T>> {
  try {
    const data = await apiRequest<T>(path, {
      method: options.method,
      body: options.body,
      token: options.token,
      tenantId: options.tenantId
    })
    return { success: true, data }
  } catch (error) {
    if (error instanceof ApiError) {
      return { success: false, error: error.message }
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'İstek başarısız oldu'
    }
  }
}

/** Tenant + oturum gerektiren istek. */
export async function desktopRequest<T>(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<ApiResult<T>> {
  const token = loadToken()
  const tenantId = loadTenantId()
  if (!token || !tenantId) {
    return { success: false, error: 'Oturum veya kooperatif seçimi eksik.' }
  }
  return wrapRequest<T>(path, { ...options, token, tenantId })
}

/** Yalnızca oturum (tenant şart değil) — cooperatives list, auth own-*. */
export async function desktopAuthRequest<T>(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<ApiResult<T>> {
  const token = loadToken()
  if (!token) {
    return { success: false, error: 'Oturum gerekli.' }
  }
  return wrapRequest<T>(path, { ...options, token, tenantId: loadTenantId() })
}

/** Public (şifre sıfırlama vb.). */
export async function desktopPublicRequest<T>(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<ApiResult<T>> {
  return wrapRequest<T>(path, options)
}

export function requireAuthContext(): ApiResult<{ token: string; tenantId: string }> {
  const token = loadToken()
  const tenantId = loadTenantId()
  if (!token || !tenantId) {
    return { success: false, error: 'Oturum veya kooperatif seçimi eksik.' }
  }
  return { success: true, data: { token, tenantId } }
}
