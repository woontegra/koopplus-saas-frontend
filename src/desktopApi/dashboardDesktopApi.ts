/**
 * Yönetim paneli window.api.dashboard — /api/dashboard
 */
import type {
  ApiResult,
  DashboardMonthDetail,
  DashboardStats,
  DashboardSummary
} from '@shared/types'
import { desktopRequest, requireAuthContext } from './apiResult'
import { toNumericId } from './idMap'

function authTenant(): ApiResult<{ tenantId: string }> {
  const auth = requireAuthContext()
  if (!auth.success || !auth.data) return { success: false, error: auth.error }
  return { success: true, data: { tenantId: auth.data.tenantId } }
}

function mapPartnerIds<T extends { partnerId?: number | string }>(
  tenantId: string,
  rows: T[] | undefined
): T[] {
  if (!rows) return []
  return rows.map((row) => {
    if (row.partnerId == null) return row
    const raw = String(row.partnerId)
    if (/^\d+$/.test(raw)) return { ...row, partnerId: Number(raw) }
    return { ...row, partnerId: toNumericId(tenantId, raw) }
  })
}

export const dashboardDesktopApi = {
  async stats(): Promise<ApiResult<DashboardStats>> {
    return desktopRequest<DashboardStats>('/api/dashboard/stats')
  },

  async getSummary(): Promise<ApiResult<DashboardSummary>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const res = await desktopRequest<DashboardSummary>('/api/dashboard/summary')
    if (!res.success || !res.data) return { success: false, error: res.error }
    const { tenantId } = auth.data
    return {
      success: true,
      data: {
        ...res.data,
        topDebtors: mapPartnerIds(tenantId, res.data.topDebtors) as DashboardSummary['topDebtors'],
        recentPayments: mapPartnerIds(
          tenantId,
          res.data.recentPayments as Array<{ partnerId?: number | string }>
        ) as DashboardSummary['recentPayments'],
        overdue: res.data.overdue
          ? {
              ...res.data.overdue,
              members: mapPartnerIds(
                tenantId,
                res.data.overdue.members as Array<{ partnerId?: number | string }>
              ) as DashboardSummary['overdue']['members']
            }
          : res.data.overdue
      }
    }
  },

  async getMonthDetail(year: number, month: number): Promise<ApiResult<DashboardMonthDetail>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const res = await desktopRequest<DashboardMonthDetail>(
      `/api/dashboard/month-detail?year=${year}&month=${month}`
    )
    if (!res.success || !res.data) return { success: false, error: res.error }
    // partner id alanları varsa map et — yapı backend’e göre değişebilir
    return { success: true, data: res.data }
  }
}
