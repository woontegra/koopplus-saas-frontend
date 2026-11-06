/**
 * Kullanıcılar window.api.users — /api/users (tenant üyeliği, yalnız ADMIN)
 * Backend: GET/POST /, PATCH /:id, POST /:id/password, PATCH /:id/active
 */
import type {
  ApiResult,
  ChangePasswordPayload,
  User,
  UserCreatePayload,
  UserUpdatePayload
} from '@shared/types'
import { desktopRequest, requireAuthContext } from './apiResult'
import { toCuid, toNumericId } from './idMap'

/** Backend TenantUserView (+ olası ek alanlar). */
type SaasUser = {
  id: string | number
  membership_id?: string
  email?: string | null
  full_name: string
  role: User['role']
  is_active: boolean | number
  last_login_at?: string | null
  created_at?: string
  phone?: string | null
}

function authTenant(): ApiResult<{ tenantId: string }> {
  const auth = requireAuthContext()
  if (!auth.success || !auth.data) return { success: false, error: auth.error }
  return { success: true, data: { tenantId: auth.data.tenantId } }
}

function mapUser(tenantId: string, user: SaasUser): User {
  const rawId = String(user.id)
  const id = /^\d+$/.test(rawId) ? Number(rawId) : toNumericId(tenantId, `user:${rawId}`)
  return {
    id,
    username: user.email ?? '',
    full_name: user.full_name,
    role: user.role,
    is_active: user.is_active === true || user.is_active === 1 ? 1 : 0,
    last_login_at: user.last_login_at ?? null,
    created_at: user.created_at ?? '',
    updated_at: user.created_at ?? '',
    email: user.email ?? null,
    phone: user.phone ?? null
  }
}

function resolveUserCuid(tenantId: string, numericId: number): ApiResult<string> {
  const cuid = toCuid(tenantId, numericId)
  if (!cuid) return { success: false, error: 'Kullanıcı kimliği eşlemesi bulunamadı.' }
  return { success: true, data: cuid.startsWith('user:') ? cuid.slice(5) : cuid }
}

function validatePasswordPair(password?: string, confirm?: string): string | null {
  if (!password || password.length < 8) return 'Şifre en az 8 karakter olmalıdır.'
  if (password !== confirm) return 'Şifreler eşleşmiyor.'
  return null
}

export const usersDesktopApi = {
  async list(): Promise<ApiResult<User[]>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const res = await desktopRequest<SaasUser[]>('/api/users')
    if (!res.success || !res.data) return { success: false, error: res.error }
    return {
      success: true,
      data: res.data.map((u) => mapUser(auth.data!.tenantId, u))
    }
  },

  async create(payload: UserCreatePayload): Promise<ApiResult<User>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const pwError = validatePasswordPair(payload.password, payload.password_confirm)
    if (pwError) return { success: false, error: pwError }
    const res = await desktopRequest<SaasUser>('/api/users', {
      method: 'POST',
      body: {
        email: payload.email,
        full_name: payload.full_name,
        password: payload.password,
        role: payload.role
      }
    })
    if (!res.success || !res.data) return { success: false, error: res.error }
    return { success: true, data: mapUser(auth.data.tenantId, res.data) }
  },

  async update(id: number, payload: UserUpdatePayload): Promise<ApiResult<User>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const userId = resolveUserCuid(auth.data.tenantId, id)
    if (!userId.success || !userId.data) return { success: false, error: userId.error }
    const base = `/api/users/${encodeURIComponent(userId.data)}`

    // Şifre doğrulaması: hiçbir değişiklik yapılmadan önce.
    const wantsPassword = Boolean(payload.password || payload.password_confirm)
    if (wantsPassword) {
      const pwError = validatePasswordPair(payload.password, payload.password_confirm)
      if (pwError) return { success: false, error: pwError }
    }

    const res = await desktopRequest<SaasUser>(base, {
      method: 'PATCH',
      body: { email: payload.email, full_name: payload.full_name, role: payload.role }
    })
    if (!res.success || !res.data) return { success: false, error: res.error }
    let current = res.data

    // Aktiflik değiştiyse ayrı uç noktadan (backend: son/kendi yönetici kuralları).
    const nextActive = payload.is_active === 1
    const currentActive = current.is_active === true || current.is_active === 1
    if (nextActive !== currentActive) {
      const act = await desktopRequest<SaasUser>(`${base}/active`, {
        method: 'PATCH',
        body: { isActive: nextActive }
      })
      if (!act.success || !act.data) return { success: false, error: act.error }
      current = act.data
    }

    if (wantsPassword) {
      const pw = await desktopRequest<unknown>(`${base}/password`, {
        method: 'POST',
        body: { newPassword: payload.password }
      })
      if (!pw.success) return { success: false, error: pw.error }
    }
    return { success: true, data: mapUser(auth.data.tenantId, current) }
  },

  async changePassword(id: number, payload: ChangePasswordPayload): Promise<ApiResult<User>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const userId = resolveUserCuid(auth.data.tenantId, id)
    if (!userId.success || !userId.data) return { success: false, error: userId.error }
    const pwError = validatePasswordPair(payload.password, payload.password_confirm)
    if (pwError) return { success: false, error: pwError }
    const res = await desktopRequest<unknown>(
      `/api/users/${encodeURIComponent(userId.data)}/password`,
      { method: 'POST', body: { newPassword: payload.password } }
    )
    if (!res.success) return { success: false, error: res.error }
    const list = await usersDesktopApi.list()
    const found = list.data?.find((u) => u.id === id)
    if (!found) return { success: false, error: 'Kullanıcı bulunamadı.' }
    return { success: true, data: found }
  },

  async setActive(id: number, isActive: number): Promise<ApiResult<User>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const userId = resolveUserCuid(auth.data.tenantId, id)
    if (!userId.success || !userId.data) return { success: false, error: userId.error }
    const res = await desktopRequest<SaasUser>(
      `/api/users/${encodeURIComponent(userId.data)}/active`,
      { method: 'PATCH', body: { isActive: isActive === 1 } }
    )
    if (!res.success || !res.data) return { success: false, error: res.error }
    return { success: true, data: mapUser(auth.data.tenantId, res.data) }
  }
}
