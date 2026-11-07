/**
 * Platform paneli API — /api/platform/*
 * Aynı oturum JWT (loadToken); yetki User.isPlatformAdmin ile sunucuda doğrulanır.
 */
import { ApiError, apiRequest } from '../api/client'
import { apiUrl } from '../api/config'
import { loadToken } from '../auth/session'

export type PlatformTenantStatus = 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED'
export type PlatformAnnouncementKind = 'INFO' | 'WARNING' | 'MAINTENANCE'
export type PlatformUserRole = 'ADMIN' | 'STAFF' | 'VIEWER'

export type PlatformAdmin = { id: string; email: string; fullName: string }

export type PlatformPage<T> = {
  page: number
  pageSize: number
  total: number
  items: T[]
}

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
  partnerCount?: number | null
  userCount: number
  lastUserLoginAt: string | null
  usageExpiresAt: string | null
  demoExpiresAt?: string | null
  createdAt: string
}

export type PlatformTenantSettings = {
  cooperativeName: string
  taxId: string
  authorizedPerson: string
  phone: string
  email: string
  address: string
  city: string
  district: string
}

export type PlatformUsageExtension = {
  id: string
  oldExpiresAt: string | null
  newExpiresAt: string | null
  daysAdded: number
  note: string | null
  adminId?: string | null
  createdAt: string
}

export type PlatformEmailLog = {
  id: string
  toEmail: string
  kind: string
  subject: string
  success: boolean
  error: string | null
  createdAt: string
}

export type PlatformTenantDetail = {
  id: string
  name: string
  status: PlatformTenantStatus
  isDemo: boolean
  kind: 'DEMO' | 'YEARLY'
  partnerCount: number | null
  memberCount: number
  userCount: number
  documentCount: number
  lastUserLoginAt: string | null
  usageExpiresAt: string | null
  demoExpiresAt: string | null
  daysLeft: number | null
  suspensionReason: string | null
  platformNotes: string | null
  maxUsers: number | null
  maxMembers: number | null
  licenseKey: string
  licenseActivatedAt: string | null
  licenseStatus: 'PENDING' | 'ACTIVATED' | string
  settings: PlatformTenantSettings | null
  extensions: PlatformUsageExtension[]
  emailLogs?: PlatformEmailLog[]
  createdAt: string
  updatedAt: string
}

export type PlatformCreateTenantResult = {
  tenant: PlatformTenantDetail
  email?: { ok: boolean; error: string | null }
  admin?: {
    id: string
    email: string
    temporaryPassword: string | null
    temporaryPasswordGenerated?: boolean
    licenseKey?: string
    mustChangePassword?: boolean
  }
}

export type PlatformTenantPatch = {
  name?: string
  platformNotes?: string
  maxUsers?: number | null
  maxMembers?: number | null
  usageExpiresAt?: string | null
  demoExpiresAt?: string | null
  settings?: Partial<PlatformTenantSettings>
}

export type PlatformExtendBody = {
  days?: number
  toDate?: string
  convertToYearly?: boolean
  /** false (varsayılan): örnek verileri sil. true: örnek verileri koru. */
  keepSampleData?: boolean
  note?: string
}

export type PlatformExtendResult = {
  id: string
  isDemo: boolean
  usageExpiresAt: string | null
  demoExpiresAt: string | null
  status: PlatformTenantStatus
  daysAdded: number
  newExpiresAt: string
}

export type PlatformLoginAttempt = {
  id: string
  email: string
  userId: string | null
  success: boolean
  ip: string | null
  userAgent: string | null
  reason: string | null
  createdAt: string
}

export type PlatformCriticalLog = {
  id: string
  action: string
  detail: unknown
  user: { id: string; email: string; fullName: string } | null
  createdAt: string
}

export type PlatformTenantUser = {
  id: string
  email: string
  fullName: string
  role: PlatformUserRole
  isActive: boolean
  mustChangePassword?: boolean
  lastLoginAt?: string | null
}

export type PlatformMembershipRef = {
  tenantId: string
  tenantName: string
  tenantStatus?: PlatformTenantStatus
  role: PlatformUserRole
}

export type PlatformGlobalUser = {
  id: string
  email: string
  fullName: string
  isActive: boolean
  lastLoginAt: string | null
  lastSeenAt: string | null
  loginCount: number
  memberships: PlatformMembershipRef[]
}

export type PlatformOnlineUser = {
  id: string
  email: string
  fullName: string
  lastSeenAt: string | null
  lastSeenIp: string | null
  memberships: Array<{ tenantId: string; tenantName: string; role: PlatformUserRole }>
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

export type PlatformAnnouncement = {
  id: string
  title: string
  body: string
  kind: PlatformAnnouncementKind
  startsAt: string
  endsAt: string
  allTenants: boolean
  tenantIds: string[]
  createdAt?: string
}

export type PlatformAnnouncementInput = {
  title: string
  body: string
  kind: PlatformAnnouncementKind
  startsAt: string
  endsAt: string
  allTenants: boolean
  tenantIds?: string[]
}

export type PlatformContactSettings = {
  phone: string
  email: string
  whatsapp: string | null
}

export type PlatformOverview = {
  cards: {
    total: number
    yearlyActive: number
    demoActive: number
    suspended: number
    archived: number
    expiringSoon: number
    expired: number
    memberTotal: number
    userTotal: number
  }
  logins: {
    uniqueToday: number
    uniqueLast7Days: number
    uniqueLast30Days: number
    onlineNow: number
  }
  charts: {
    dailyLogins: Array<{ date: string; count: number }>
    monthlyTenants: Array<{ month: string; count: number }>
    topActive: Array<{
      id: string
      name: string
      lastUserLoginAt: string
      memberCount: number
      rank: number
    }>
  }
  alerts: {
    expiringSoon: Array<{
      id: string
      name: string
      daysLeft: number
      expiresAt: string
      isDemo: boolean
    }>
    expired: Array<{ id: string; name: string; status: PlatformTenantStatus; expiresAt: string | null }>
    inactive14d: Array<{ id: string; name: string; lastUserLoginAt: string | null }>
    failedLogins: Array<{ email: string; failures: number }>
  }
  generatedAt: string
}

export type PlatformSystemHealth = {
  server: {
    ok: boolean
    uptimeSec: number
    node: string
    platform: string
    loadAvg: number[]
  }
  database: { ok: boolean; sizeBytes: number | null }
  pdf: { ok: boolean; executablePath: string | null; error: string | null }
  smtp?: {
    configured: boolean
    ok: boolean
    host: string | null
    port: number
    secure: boolean
    from: string | null
    error: string | null
  }
  volume: { path: string; freeBytes: number | null; totalBytes: number | null }
  version: { commit: string | null; service: string }
  generatedAt: string
}

export type PlatformPdfProbe = {
  pdfOk: boolean
  executablePath?: string | null
  error?: string | null
}

export type NewTenantAdmin = { fullName: string; email: string; password: string }

export type PlatformImpersonateResult = {
  token: string
  tenantId?: string
  tenantName?: string
  tenant?: { id: string; name: string }
}

function req<T>(path: string, method: string, body?: unknown): Promise<T> {
  return apiRequest<T>(path, { method, body, token: loadToken() })
}

function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue
    sp.set(k, String(v))
  }
  const s = sp.toString()
  return s ? `?${s}` : ''
}

function tid(id: string): string {
  return encodeURIComponent(id)
}

/** Liste yanıtı dizi veya sayfalı nesne olabilir — her zaman sayfalı nesneye çevirir. */
function toPage<T>(raw: T[] | Partial<PlatformPage<T>> | null | undefined): PlatformPage<T> {
  if (Array.isArray(raw)) return { page: 1, pageSize: raw.length, total: raw.length, items: raw }
  const items = Array.isArray(raw?.items) ? raw.items : []
  return {
    page: raw?.page ?? 1,
    pageSize: raw?.pageSize ?? items.length,
    total: raw?.total ?? items.length,
    items
  }
}

function normalizeTenant(t: PlatformTenant): PlatformTenant {
  return {
    ...t,
    memberCount: t.memberCount ?? t.partnerCount ?? 0,
    lastUserLoginAt: t.lastUserLoginAt ?? (t as { lastLogin?: string | null }).lastLogin ?? null
  }
}

export function platformMe(token?: string | null): Promise<{ admin: PlatformAdmin }> {
  return apiRequest('/api/platform/me', { method: 'GET', token: token ?? loadToken() })
}

export const platformApi = {
  // ---- Genel bakış ----
  overview: () => req<PlatformOverview>('/api/platform/overview', 'GET'),

  summary: () => req<PlatformSummary>('/api/platform/summary', 'GET'),

  // ---- Kooperatifler ----
  listTenantsPage: async (
    params: { search?: string; status?: string; demo?: string; page?: number; pageSize?: number } = {}
  ): Promise<PlatformPage<PlatformTenant>> => {
    const raw = await req<PlatformTenant[] | Partial<PlatformPage<PlatformTenant>>>(
      `/api/platform/tenants${qs({
        search: params.search?.trim(),
        status: params.status,
        demo: params.demo,
        page: params.page,
        pageSize: params.pageSize ?? 200
      })}`,
      'GET'
    )
    const page = toPage(raw)
    return { ...page, items: page.items.map(normalizeTenant) }
  },

  listTenants: async (params: { search?: string; status?: string } = {}): Promise<PlatformTenant[]> =>
    (await platformApi.listTenantsPage({ ...params, pageSize: 200 })).items,

  getTenant: (id: string) => req<PlatformTenantDetail>(`/api/platform/tenants/${tid(id)}`, 'GET'),

  patchTenant: (id: string, body: PlatformTenantPatch) =>
    req<PlatformTenantDetail>(`/api/platform/tenants/${tid(id)}`, 'PATCH', body),

  createTenant: (body: { name: string; usageExpiresAt?: string | null; admin: NewTenantAdmin }) =>
    req<PlatformCreateTenantResult>('/api/platform/tenants', 'POST', body),

  createDemoTenant: (body: { name: string; days: number; admin: NewTenantAdmin }) =>
    req<PlatformCreateTenantResult>('/api/platform/tenants/demo', 'POST', body),

  /** SUSPENDED için suspensionReason zorunludur. */
  setStatus: (id: string, status: PlatformTenantStatus, suspensionReason?: string) =>
    req<PlatformTenantDetail>(`/api/platform/tenants/${tid(id)}/status`, 'PATCH', {
      status,
      ...(suspensionReason !== undefined ? { suspensionReason } : {})
    }),

  setUsageExpiry: (id: string, usageExpiresAt: string | null) =>
    req<PlatformTenantDetail>(`/api/platform/tenants/${tid(id)}/usage-expiry`, 'PATCH', {
      usageExpiresAt
    }),

  extendTenant: (id: string, body: PlatformExtendBody) =>
    req<PlatformExtendResult>(`/api/platform/tenants/${tid(id)}/extend`, 'POST', body),

  listExtensions: (id: string) =>
    req<PlatformUsageExtension[]>(`/api/platform/tenants/${tid(id)}/extensions`, 'GET'),

  loginHistory: (id: string, params: { success?: boolean; q?: string; limit?: number } = {}) =>
    req<PlatformLoginAttempt[]>(
      `/api/platform/tenants/${tid(id)}/login-history${qs({
        success: params.success === undefined ? undefined : params.success,
        q: params.q?.trim(),
        limit: params.limit
      })}`,
      'GET'
    ),

  criticalLogs: (id: string, limit = 100) =>
    req<PlatformCriticalLog[]>(`/api/platform/tenants/${tid(id)}/critical-logs${qs({ limit })}`, 'GET'),

  deleteTenant: (id: string, confirmName: string) =>
    req<{ deleted: boolean }>(`/api/platform/tenants/${tid(id)}`, 'DELETE', {
      confirmName
    }),

  impersonate: (id: string) =>
    req<PlatformImpersonateResult>(`/api/platform/tenants/${tid(id)}/impersonate`, 'POST', {}),

  // ---- Kooperatif kullanıcıları ----
  listUsers: (id: string) => req<PlatformTenantUser[]>(`/api/platform/tenants/${tid(id)}/users`, 'GET'),

  createUser: (
    id: string,
    body: {
      fullName: string
      email: string
      password: string
      role: PlatformUserRole
      mustChangePassword?: boolean
    }
  ) => req<unknown>(`/api/platform/tenants/${tid(id)}/users`, 'POST', body),

  updateUser: (
    id: string,
    userId: string,
    body: Partial<Pick<PlatformTenantUser, 'fullName' | 'email' | 'role' | 'isActive'>>
  ) => req<PlatformTenantUser>(`/api/platform/tenants/${tid(id)}/users/${tid(userId)}`, 'PATCH', body),

  resetUserPassword: (
    id: string,
    userId: string,
    body: { newPassword: string; mustChangePassword?: boolean }
  ) =>
    req<{ reset?: boolean; temporaryPassword?: string }>(
      `/api/platform/tenants/${tid(id)}/users/${tid(userId)}/password`,
      'POST',
      body
    ),

  // ---- Global kullanıcılar / çevrimiçi ----
  listAllUsers: async (
    params: { q?: string; page?: number; pageSize?: number } = {}
  ): Promise<PlatformPage<PlatformGlobalUser>> =>
    toPage(
      await req<PlatformGlobalUser[] | Partial<PlatformPage<PlatformGlobalUser>>>(
        `/api/platform/users${qs({ q: params.q?.trim(), page: params.page, pageSize: params.pageSize })}`,
        'GET'
      )
    ),

  listOnline: () => req<PlatformOnlineUser[]>('/api/platform/online', 'GET'),

  revokeSessions: (userId: string) =>
    req<{ userId: string; tokenVersion: number }>(
      `/api/platform/users/${tid(userId)}/revoke-sessions`,
      'POST',
      {}
    ),

  // ---- Duyurular ----
  listAnnouncements: () => req<PlatformAnnouncement[]>('/api/platform/announcements', 'GET'),

  createAnnouncement: (body: PlatformAnnouncementInput) =>
    req<PlatformAnnouncement>('/api/platform/announcements', 'POST', body),

  deleteAnnouncement: (id: string) =>
    req<{ deleted: boolean }>(`/api/platform/announcements/${tid(id)}`, 'DELETE'),

  // ---- Sistem ----
  systemHealth: () => req<PlatformSystemHealth>('/api/platform/system/health', 'GET'),

  sendTestEmail: (to: string) =>
    req<{ ok: boolean; error: string | null }>('/api/platform/system/test-email', 'POST', { to }),

  getContactSettings: () => req<PlatformContactSettings>('/api/platform/settings/contact', 'GET'),

  updateContactSettings: (body: { phone: string; email: string; whatsapp: string | null }) =>
    req<PlatformContactSettings>('/api/platform/settings/contact', 'PATCH', body),

  regenerateLicense: (id: string) =>
    req<PlatformTenantDetail>(`/api/platform/tenants/${tid(id)}/license/regenerate`, 'POST', {}),

  resendWelcomeEmail: (id: string) =>
    req<{
      email: { ok: boolean; error: string | null }
      admin: { email: string; temporaryPassword: string | null; licenseKey: string }
      tenant: PlatformTenantDetail
    }>(`/api/platform/tenants/${tid(id)}/welcome-email`, 'POST', {}),

  pdfHealth: () => req<PlatformPdfProbe>('/api/platform/health/pdf', 'GET'),

  // ---- Denetim ----
  auditLogs: async (
    params: { tenantId?: string; adminId?: string; action?: string; page?: number; pageSize?: number } = {}
  ): Promise<PlatformPage<PlatformAuditEntry>> =>
    toPage(
      await req<PlatformAuditEntry[] | Partial<PlatformPage<PlatformAuditEntry>>>(
        `/api/platform/audit-logs${qs(params)}`,
        'GET'
      )
    ),

  audit: async (limit = 200): Promise<PlatformAuditEntry[]> =>
    (await platformApi.auditLogs({ pageSize: limit })).items,

  // ---- Yedek / geri yükleme ----
  restoreTenant: (
    id: string,
    body: {
      fileName: string
      contentBase64: string
      password?: string
      documentsZipBase64?: string
    }
  ) => req<Record<string, unknown>>(`/api/platform/tenants/${tid(id)}/restore`, 'POST', body),

  restoreJob: (id: string, jobId: string) =>
    req<{
      status: 'queued' | 'running' | 'completed' | 'failed'
      error?: string
      processed?: number
      total?: number
    }>(`/api/platform/tenants/${tid(id)}/restore/jobs/${tid(jobId)}`, 'GET')
}

/** Kooperatif tarafı: aktif duyurular (X-Tenant-Id ile). */
export type TenantAnnouncement = {
  id: string
  title: string
  body: string
  kind: PlatformAnnouncementKind
  startsAt: string
  endsAt: string
}

export function fetchTenantAnnouncements(tenantId: string): Promise<TenantAnnouncement[]> {
  return apiRequest<TenantAnnouncement[]>('/api/auth/announcements', {
    method: 'GET',
    token: loadToken(),
    tenantId
  })
}

export function sendHeartbeat(tenantId: string): Promise<{ ok: boolean }> {
  return apiRequest<{ ok: boolean }>('/api/auth/heartbeat', {
    method: 'POST',
    body: {},
    token: loadToken(),
    tenantId
  })
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
