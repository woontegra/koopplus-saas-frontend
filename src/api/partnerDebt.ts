import { apiRequest } from './client'
import type { ApiMemberDebtTableReport, ApiPaymentHistoryItem } from './debtTypes'

type AuthOpts = { token: string; tenantId: string }

export function getMemberDebtTable(
  partnerId: string,
  opts: AuthOpts & { asOf?: string }
): Promise<ApiMemberDebtTableReport> {
  const params = new URLSearchParams()
  if (opts.asOf) params.set('asOf', opts.asOf)
  const q = params.toString()
  const path = `/api/partners/${encodeURIComponent(partnerId)}/debt-table${q ? `?${q}` : ''}`
  return apiRequest<ApiMemberDebtTableReport>(path, {
    method: 'GET',
    token: opts.token,
    tenantId: opts.tenantId
  })
}

export function getMemberPaymentHistory(
  partnerId: string,
  opts: AuthOpts
): Promise<{ partner_id: string; payment_history: ApiPaymentHistoryItem[] }> {
  return apiRequest<{ partner_id: string; payment_history: ApiPaymentHistoryItem[] }>(
    `/api/partners/${encodeURIComponent(partnerId)}/payment-history`,
    {
      method: 'GET',
      token: opts.token,
      tenantId: opts.tenantId
    }
  )
}
