/**
 * Platform paneli API — /api/platform/*
 * Aynı oturum JWT (loadToken); yetki User.isPlatformAdmin ile sunucuda doğrulanır.
 */
import { ApiError, apiRequest } from '../api/client'
import { apiUrl } from '../api/config'
import { loadToken } from '../auth/session'

export type PlatformTenantStatus = 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED'

export type PlatformAdmin = { id: string; email: string; fullName: string }

export type PlatformSummary = {
  tenantCount: number
  activeCount: number
  suspendedCount: number
  archivedCount: number
  demoCount?: number
  expiringSoonCount?: number
  userCount?: number
  memberCount?: number
}

export type PlatformTenant = {
  id: string
  name: string
  status: PlatformTenantStatus
  isDemo?: boolean
  memberCount: number
  userCount: number
  lastUserLoginAt: string | null
  usageExpiresAt: string | null
  demoExpiresAt?: string | null
  createdAt: string
}

export type PlatformTenantUser = {
  id: string
  email: string
  fullName: string
  role: 'ADMIN' | 'STAFF' | 'VIEWER'
  isActive: boolean
  mustChangePassword?: boolean
  lastLoginAt?: string | null
}

export type PlatformAuditEntry = {
  id: string
  adminId: string | null
  adminEmail?: string | null
  tenantId: string | null
  tenantName?: string | null
  action: string
  detail: unknown
  createdAt: string
}

export type NewTenantAdmin = { fullName: string; email: string; password: string }

function req<T>(path: string, method: string, body?: unknown): Promise<T> {
  return apiRequest<T>(path, { method, body, token: loadToken() })
}

export function platformMe(token?: string | null): Promise<{ admin: PlatformAdmin }> {
  return apiRequest('/api/platform/me', { method: 'GET', token: token ?? loadToken() })
}

export const platformApi = {
  summary: () => req<PlatformSummary>('/api/platform/summary', 'GET'),

  listTenants: async (params: { search?: string; status?: string } = {}) => {
    const qs = new URLSearchParams()
    if (params.search?.trim()) qs.set('search', params.search.trim())
    if (params.status) qs.set('status', params.status)
    // Büyük sayfa: panel tüm kooperatifleri tek istekte ister
    qs.set('pageSize', '200')
    const q = qs.toString()
    const raw = await req<
      PlatformTenant[] | { items?: PlatformTenant[]; page?: number; total?: number }
    >(`/api/platform/tenants${q ? `?${q}` : ''}`, 'GET')
    const rows = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : []
    return rows.map((t) => ({
      ...t,
      memberCount: t.memberCount ?? (t as { partnerCount?: number }).partnerCount ?? 0,
      lastUserLoginAt:
        t.lastUserLoginAt ?? (t as { lastLogin?: string | null }).lastLogin ?? null
    }))
  },

  createTenant: (body: { name: string; usageExpiresAt?: string | null; admin: NewTenantAdmin }) =>
    req<PlatformTenant>('/api/platform/tenants', 'POST', body),

  createDemoTenant: (body: { name: string; days: number; admin: NewTenantAdmin }) =>
    req<PlatformTenant>('/api/platform/tenants/demo', 'POST', body),

  setStatus: (id: string, status: PlatformTenantStatus) =>
    req<PlatformTenant>(`/api/platform/tenants/${encodeURIComponent(id)}/status`, 'PATCH', {
      status
    }),

  setUsageExpiry: (id: string, usageExpiresAt: string | null) =>
    req<PlatformTenant>(`/api/platform/tenants/${encodeURIComponent(id)}/usage-expiry`, 'PATCH', {
      usageExpiresAt
    }),

  deleteTenant: (id: string, confirmName: string) =>
    req<{ deleted: boolean }>(`/api/platform/tenants/${encodeURIComponent(id)}`, 'DELETE', {
      confirmName
    }),

  listUsers: (id: string) =>
    req<PlatformTenantUser[]>(`/api/platform/tenants/${encodeURIComponent(id)}/users`, 'GET'),

  createUser: (
    id: string,
    body: {
      fullName: string
      email: string
      password: string
      role: PlatformTenantUser['role']
      mustChangePassword?: boolean
    }
  ) => req<PlatformTenantUser>(`/api/platform/tenants/${encodeURIComponent(id)}/users`, 'POST', body),

  updateUser: (
    id: string,
    userId: string,
    body: Partial<Pick<PlatformTenantUser, 'fullName' | 'email' | 'role' | 'isActive'>>
  ) =>
    req<PlatformTenantUser>(
      `/api/platform/tenants/${encodeURIComponent(id)}/users/${encodeURIComponent(userId)}`,
      'PATCH',
      body
    ),

  resetUserPassword: (
    id: string,
    userId: string,
    body: { newPassword: string; mustChangePassword?: boolean }
  ) =>
    req<{ changed: boolean }>(
      `/api/platform/tenants/${encodeURIComponent(id)}/users/${encodeURIComponent(userId)}/password`,
      'POST',
      body
    ),

  impersonate: (id: string) =>
    req<{ token: string; tenantId?: string; tenantName?: string }>(
      `/api/platform/tenants/${encodeURIComponent(id)}/impersonate`,
      'POST',
      {}
    ),

  audit: (limit = 200) => req<PlatformAuditEntry[]>(`/api/platform/audit?limit=${limit}`, 'GET'),

  restoreTenant: (
    id: string,
    body: {
      fileName: string
      contentBase64: string
      password?: string
      documentsZipBase64?: string
    }
  ) =>
    req<Record<string, unknown>>(
      `/api/platform/tenants/${encodeURIComponent(id)}/restore`,
      'POST',
      body
    ),

  restoreJob: (id: string, jobId: string) =>
    req<{
      status: 'queued' | 'running' | 'completed' | 'failed'
      error?: string
      processed?: number
      total?: number
    }>(
      `/api/platform/tenants/${encodeURIComponent(id)}/restore/jobs/${encodeURIComponent(jobId)}`,
      'GET'
    )
}

/** Geri yükleme işini başlatır ve tamamlanana kadar yoklar (hata → exception). */
export async function platformRestoreAndWait(
  tenantId: string,
  body: Parameters<typeof platformApi.restoreTenant>[1]
): Promise<void> {
  const started = await platformApi.restoreTenant(tenantId, body)
  const jobId = String(started.job_id ?? started.jobId ?? '')
  if (!jobId) return
  const deadline = Date.now() + 30 * 60_000
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 600))
    const job = await platformApi.restoreJob(tenantId, jobId)
    if (job.status === 'completed') return
    if (job.status === 'failed') throw new ApiError(job.error ?? 'Geri yükleme başarısız.', 500)
  }
  throw new ApiError('Geri yükleme zaman aşımına uğradı.', 504)
}

/** Yedeği blob olarak indirir (platform JWT). */
export async function platformDownloadBackup(
  tenantId: string,
  password?: string
): Promise<{ blob: Blob; fileName: string }> {
  const token = loadToken()
  let response: Response
  try {
    response = await fetch(apiUrl(`/api/platform/tenants/${encodeURIComponent(tenantId)}/backup`), {
      method: 'POST',
      headers: {
        Accept: '*/*',
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(password ? { password } : {})
    })
  } catch {
    throw new ApiError('Sunucuya bağlanılamadı.', 0)
  }
  if (!response.ok) {
    let message = 'Yedek alınamadı'
    try {
      const payload = (await response.json()) as { error?: string }
      if (payload?.error) message = payload.error
    } catch {
      /* ignore */
    }
    throw new ApiError(message, response.status)
  }
  const disposition = response.headers.get('Content-Disposition') || ''
  const utf = /filename\*=UTF-8''([^;]+)/i.exec(disposition)
  const plain = /filename="?([^";]+)"?/i.exec(disposition)
  let fileName = 'koopplus-backup.json'
  try {
    fileName = utf?.[1] ? decodeURIComponent(utf[1].trim()) : (plain?.[1]?.trim() ?? fileName)
  } catch {
    /* ignore */
  }
  return { blob: await response.blob(), fileName }
}

export function platformErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  return error instanceof Error ? error.message : 'İşlem başarısız'
}
