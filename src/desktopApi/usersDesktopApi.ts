/**
 * Kullanıcılar window.api.users — /api/users (tenant üyeliği)
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

type SaasUser = Omit<User, 'id'> & { id: string | number }

function authTenant(): ApiResult<{ tenantId: string }> {
  const auth = requireAuthContext()
  if (!auth.success || !auth.data) return { success: false, error: auth.error }
  return { success: true, data: { tenantId: auth.data.tenantId } }
}

function mapUser(tenantId: string, user: SaasUser): User {
  const rawId = String(user.id)
  const id = /^\d+$/.test(rawId) ? Number(rawId) : toNumericId(tenantId, `user:${rawId}`)
  return { ...user, id }
}

function resolveUserCuid(tenantId: string, numericId: number): ApiResult<string> {
  const cuid = toCuid(tenantId, numericId)
  if (!cuid) return { success: false, error: 'Kullanıcı kimliği eşlemesi bulunamadı.' }
  return { success: true, data: cuid.startsWith('user:') ? cuid.slice(5) : cuid }
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
    const res = await desktopRequest<SaasUser>('/api/users', { method: 'POST', body: payload })
    if (!res.success || !res.data) return { success: false, error: res.error }
    return { success: true, data: mapUser(auth.data.tenantId, res.data) }
  },

  async update(id: number, payload: UserUpdatePayload): Promise<ApiResult<User>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const userId = resolveUserCuid(auth.data.tenantId, id)
    if (!userId.success || !userId.data) return { success: false, error: userId.error }
    const res = await desktopRequest<SaasUser>(`/api/users/${encodeURIComponent(userId.data)}`, {
      method: 'PUT',
      body: payload
    })
    if (!res.success || !res.data) return { success: false, error: res.error }
    return { success: true, data: mapUser(auth.data.tenantId, res.data) }
  },

  async changePassword(id: number, payload: ChangePasswordPayload): Promise<ApiResult<User>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const userId = resolveUserCuid(auth.data.tenantId, id)
    if (!userId.success || !userId.data) return { success: false, error: userId.error }
    const res = await desktopRequest<SaasUser>(
      `/api/users/${encodeURIComponent(userId.data)}/change-password`,
      { method: 'POST', body: payload }
    )
    if (!res.success || !res.data) return { success: false, error: res.error }
    return { success: true, data: mapUser(auth.data.tenantId, res.data) }
  },

  async setActive(id: number, isActive: number): Promise<ApiResult<User>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const userId = resolveUserCuid(auth.data.tenantId, id)
    if (!userId.success || !userId.data) return { success: false, error: userId.error }
    const res = await desktopRequest<SaasUser>(
      `/api/users/${encodeURIComponent(userId.data)}/set-active`,
      { method: 'POST', body: { is_active: isActive } }
    )
    if (!res.success || !res.data) return { success: false, error: res.error }
    return { success: true, data: mapUser(auth.data.tenantId, res.data) }
  }
}
