import { ApiError, apiRequest } from '../api/client'
import type { ApiResult } from '@shared/types'
import { loadTenantId, loadToken } from '../auth/session'

export async function desktopRequest<T>(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<ApiResult<T>> {
  const token = loadToken()
  const tenantId = loadTenantId()
  if (!token || !tenantId) {
    return { success: false, error: 'Oturum veya kooperatif seçimi eksik.' }
  }

  try {
    const data = await apiRequest<T>(path, {
      method: options.method,
      body: options.body,
      token,
      tenantId
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

export function requireAuthContext(): ApiResult<{ token: string; tenantId: string }> {
  const token = loadToken()
  const tenantId = loadTenantId()
  if (!token || !tenantId) {
    return { success: false, error: 'Oturum veya kooperatif seçimi eksik.' }
  }
  return { success: true, data: { token, tenantId } }
}
