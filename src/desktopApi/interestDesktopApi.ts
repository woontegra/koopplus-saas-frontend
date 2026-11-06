/**
 * Faiz Kararı window.api santrali — interest.* + interestPolicies.*
 * Backend: /api/interest, /api/interest-policies
 */
import type {
  ApiResult,
  BulkYearPoliciesInput,
  BulkYearPoliciesResult,
  CreateMissingHistoricalPoliciesPayload,
  CreateMissingHistoricalPoliciesResult,
  CreateYearPoliciesInput,
  HistoricalInterestApplyResult,
  HistoricalInterestPayload,
  HistoricalInterestPreviewResult,
  InterestLinkAuditResult,
  InterestLinkRepairResult,
  InterestPolicy,
  InterestPolicyAppliedMembersResult,
  InterestPolicyDeleteResult,
  InterestPolicyInput,
  InterestPreviewResult,
  InterestRun,
  InterestRunDetail,
  InterestRunListFilters,
  InterestRunPayload,
  InterestRunResult,
  PartnerAccrualDebtOption,
  PartnerInterestCleanupPayload,
  PartnerInterestCleanupResult,
  PartnerInterestEntry,
  RangeInterestApplyResult,
  RangeInterestPayload,
  RangeInterestPreviewResult,
  SaveRangeInterestPolicyResult,
  YearlyInterestPolicyInput
} from '@shared/types'
import { desktopRequest, requireAuthContext } from './apiResult'
import { toCuid, toNumericId } from './idMap'

function authTenant(): ApiResult<{ tenantId: string }> {
  const auth = requireAuthContext()
  if (!auth.success || !auth.data) return { success: false, error: auth.error }
  return { success: true, data: { tenantId: auth.data.tenantId } }
}

function resolvePartner(tenantId: string, numericId: number): ApiResult<string> {
  const cuid = toCuid(tenantId, numericId)
  if (!cuid) {
    return { success: false, error: 'Üye kimliği eşlemesi bulunamadı. Listeyi yenileyin.' }
  }
  return { success: true, data: cuid }
}

function resolveMapped(
  tenantId: string,
  numericId: number,
  prefix: string
): ApiResult<string> {
  const raw = toCuid(tenantId, numericId)
  if (!raw) {
    return { success: false, error: 'Kayıt kimliği eşlemesi bulunamadı.' }
  }
  if (raw.startsWith(`${prefix}:`)) return { success: true, data: raw.slice(prefix.length + 1) }
  if (!raw.includes(':')) return { success: true, data: raw }
  return { success: true, data: raw.split(':').slice(1).join(':') }
}

function mapPolicy(tenantId: string, p: InterestPolicy): InterestPolicy {
  return {
    ...p,
    id: toNumericId(tenantId, `ipolicy:${String(p.id)}`),
    member_ids: (p.member_ids ?? []).map((id) => toNumericId(tenantId, String(id)))
  }
}

function mapRun(tenantId: string, run: InterestRun): InterestRun {
  return {
    ...run,
    id: toNumericId(tenantId, `irun:${String(run.id)}`),
    policy_id: toNumericId(tenantId, `ipolicy:${String(run.policy_id)}`)
  }
}

function memberIdsToCuid(tenantId: string, ids: number[]): ApiResult<string[]> {
  const out: string[] = []
  for (const id of ids) {
    const r = resolvePartner(tenantId, id)
    if (!r.success || !r.data) return { success: false, error: r.error }
    out.push(r.data)
  }
  return { success: true, data: out }
}

function remapPolicyInput(
  tenantId: string,
  payload: InterestPolicyInput
): ApiResult<Record<string, unknown>> {
  const member_ids =
    payload.scope_type === 'SELECTED_MEMBERS' && payload.member_ids?.length
      ? memberIdsToCuid(tenantId, payload.member_ids)
      : { success: true as const, data: [] as string[] }
  if (!member_ids.success || !member_ids.data) return { success: false, error: member_ids.error }
  return {
    success: true,
    data: {
      ...payload,
      member_ids: member_ids.data
    }
  }
}

export const interestPoliciesDesktopApi = {
  async list(): Promise<ApiResult<InterestPolicy[]>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const res = await desktopRequest<InterestPolicy[]>('/api/interest-policies')
    if (!res.success || !res.data) return res
    return { success: true, data: res.data.map((p) => mapPolicy(auth.data!.tenantId, p)) }
  },

  async listAppliedMembers(
    policyId: number
  ): Promise<ApiResult<InterestPolicyAppliedMembersResult>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const id = resolveMapped(auth.data.tenantId, policyId, 'ipolicy')
    if (!id.success || !id.data) return { success: false, error: id.error }
    const res = await desktopRequest<InterestPolicyAppliedMembersResult>(
      `/api/interest-policies/${id.data}/applied-members`
    )
    if (!res.success || !res.data) return res
    return {
      success: true,
      data: {
        ...res.data,
        policy_id: toNumericId(auth.data.tenantId, `ipolicy:${String(res.data.policy_id ?? id.data)}`),
        members: (res.data.members ?? []).map((m) => ({
          ...m,
          partner_id: toNumericId(auth.data!.tenantId, String(m.partner_id))
        }))
      }
    }
  },

  async create(payload: InterestPolicyInput): Promise<ApiResult<InterestPolicy>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const body = remapPolicyInput(auth.data.tenantId, payload)
    if (!body.success || !body.data) return { success: false, error: body.error }
    const res = await desktopRequest<InterestPolicy>('/api/interest-policies', {
      method: 'POST',
      body: body.data
    })
    if (!res.success || !res.data) return res
    return { success: true, data: mapPolicy(auth.data.tenantId, res.data) }
  },

  async update(id: number, payload: InterestPolicyInput): Promise<ApiResult<InterestPolicy>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const policyId = resolveMapped(auth.data.tenantId, id, 'ipolicy')
    if (!policyId.success || !policyId.data) return { success: false, error: policyId.error }
    const body = remapPolicyInput(auth.data.tenantId, payload)
    if (!body.success || !body.data) return { success: false, error: body.error }
    const res = await desktopRequest<InterestPolicy>(`/api/interest-policies/${policyId.data}`, {
      method: 'PUT',
      body: body.data
    })
    if (!res.success || !res.data) return res
    return { success: true, data: mapPolicy(auth.data.tenantId, res.data) }
  },

  async setActive(id: number, isActive: number): Promise<ApiResult<InterestPolicy>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const policyId = resolveMapped(auth.data.tenantId, id, 'ipolicy')
    if (!policyId.success || !policyId.data) return { success: false, error: policyId.error }
    const res = await desktopRequest<InterestPolicy>(
      `/api/interest-policies/${policyId.data}/active`,
      { method: 'PATCH', body: { is_active: isActive } }
    )
    if (!res.success || !res.data) return res
    return { success: true, data: mapPolicy(auth.data.tenantId, res.data) }
  },

  async delete(id: number): Promise<ApiResult<InterestPolicyDeleteResult>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const policyId = resolveMapped(auth.data.tenantId, id, 'ipolicy')
    if (!policyId.success || !policyId.data) return { success: false, error: policyId.error }
    return desktopRequest(`/api/interest-policies/${policyId.data}`, { method: 'DELETE' })
  },

  async createYearly(payload: YearlyInterestPolicyInput): Promise<ApiResult<InterestPolicy>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const res = await desktopRequest<InterestPolicy>('/api/interest-policies/yearly', {
      method: 'POST',
      body: payload
    })
    if (!res.success || !res.data) return res
    return { success: true, data: mapPolicy(auth.data.tenantId, res.data) }
  },

  async createBulkYears(payload: BulkYearPoliciesInput): Promise<ApiResult<BulkYearPoliciesResult>> {
    return desktopRequest('/api/interest-policies/bulk-years', { method: 'POST', body: payload })
  },

  async createForYears(payload: CreateYearPoliciesInput): Promise<ApiResult<BulkYearPoliciesResult>> {
    return desktopRequest('/api/interest-policies/for-years', { method: 'POST', body: payload })
  }
}

export const interestDesktopApi = {
  async getActivePolicy(calculationDate: string): Promise<ApiResult<InterestPolicy | null>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const res = await desktopRequest<InterestPolicy | null>(
      `/api/interest/active-policy?calculationDate=${encodeURIComponent(calculationDate)}`
    )
    if (!res.success) return res
    if (!res.data) return { success: true, data: null }
    return { success: true, data: mapPolicy(auth.data.tenantId, res.data) }
  },

  async preview(
    periodYear: number,
    periodMonth: number,
    calculationDate: string
  ): Promise<ApiResult<InterestPreviewResult>> {
    return desktopRequest('/api/interest/preview', {
      method: 'POST',
      body: { period_year: periodYear, period_month: periodMonth, calculation_date: calculationDate }
    })
  },

  async createRun(payload: InterestRunPayload): Promise<ApiResult<InterestRunResult>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const res = await desktopRequest<InterestRunResult>('/api/interest/runs', {
      method: 'POST',
      body: payload
    })
    if (!res.success || !res.data) return res
    return {
      success: true,
      data: {
        ...res.data,
        run_id: toNumericId(auth.data.tenantId, `irun:${String(res.data.run_id)}`)
      }
    }
  },

  async listRuns(filters: InterestRunListFilters = {}): Promise<ApiResult<InterestRun[]>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const q = new URLSearchParams()
    if (filters.period_year != null) q.set('periodYear', String(filters.period_year))
    if (filters.period_month != null) q.set('periodMonth', String(filters.period_month))
    const qs = q.toString()
    const res = await desktopRequest<InterestRun[]>(`/api/interest/runs${qs ? `?${qs}` : ''}`)
    if (!res.success || !res.data) return res
    return { success: true, data: res.data.map((r) => mapRun(auth.data!.tenantId, r)) }
  },

  async getRunDetail(runId: number): Promise<ApiResult<InterestRunDetail>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const id = resolveMapped(auth.data.tenantId, runId, 'irun')
    if (!id.success || !id.data) return { success: false, error: id.error }
    const res = await desktopRequest<InterestRunDetail>(`/api/interest/runs/${id.data}`)
    if (!res.success || !res.data) return res
    return {
      success: true,
      data: {
        ...res.data,
        run: mapRun(auth.data.tenantId, res.data.run),
        items: (res.data.items ?? []).map((item) => ({
          ...item,
          partner_id: toNumericId(auth.data!.tenantId, String(item.partner_id)),
          ledger_entry_id: toNumericId(auth.data!.tenantId, `ledger:${String(item.ledger_entry_id)}`)
        }))
      }
    }
  },

  async listByPartner(partnerId: number): Promise<ApiResult<PartnerInterestEntry[]>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const partner = resolvePartner(auth.data.tenantId, partnerId)
    if (!partner.success || !partner.data) return { success: false, error: partner.error }
    return desktopRequest(`/api/interest/by-partner/${partner.data}`)
  },

  async countForPeriod(periodYear: number, periodMonth: number): Promise<ApiResult<number>> {
    return desktopRequest(
      `/api/interest/count-for-period?periodYear=${periodYear}&periodMonth=${periodMonth}`
    )
  },

  async listPolicies(): Promise<ApiResult<InterestPolicy[]>> {
    return interestPoliciesDesktopApi.list()
  },

  async listPartnerDebts(partnerId: number): Promise<ApiResult<PartnerAccrualDebtOption[]>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const partner = resolvePartner(auth.data.tenantId, partnerId)
    if (!partner.success || !partner.data) return { success: false, error: partner.error }
    const res = await desktopRequest<PartnerAccrualDebtOption[]>(
      `/api/interest/partner-debts/${partner.data}`
    )
    if (!res.success || !res.data) return res
    return {
      success: true,
      data: res.data.map((d) => ({
        ...d,
        ledger_entry_id: toNumericId(
          auth.data!.tenantId,
          `ledger:${String(d.ledger_entry_id)}`
        )
      }))
    }
  },

  async previewHistorical(
    payload: HistoricalInterestPayload
  ): Promise<ApiResult<HistoricalInterestPreviewResult>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const partner = resolvePartner(auth.data.tenantId, payload.partner_id)
    if (!partner.success || !partner.data) return { success: false, error: partner.error }
    const ledger = resolveMapped(auth.data.tenantId, payload.ledger_entry_id, 'ledger')
    if (!ledger.success || !ledger.data) return { success: false, error: ledger.error }
    return desktopRequest('/api/interest/historical/preview', {
      method: 'POST',
      body: { ...payload, partner_id: partner.data, ledger_entry_id: ledger.data }
    })
  },

  async applyHistorical(
    payload: HistoricalInterestPayload
  ): Promise<ApiResult<HistoricalInterestApplyResult>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const partner = resolvePartner(auth.data.tenantId, payload.partner_id)
    if (!partner.success || !partner.data) return { success: false, error: partner.error }
    const ledger = resolveMapped(auth.data.tenantId, payload.ledger_entry_id, 'ledger')
    if (!ledger.success || !ledger.data) return { success: false, error: ledger.error }
    const res = await desktopRequest<HistoricalInterestApplyResult>(
      '/api/interest/historical/apply',
      {
        method: 'POST',
        body: { ...payload, partner_id: partner.data, ledger_entry_id: ledger.data }
      }
    )
    if (!res.success || !res.data) return res
    return {
      success: true,
      data: {
        ...res.data,
        run_id: toNumericId(auth.data.tenantId, `irun:${String(res.data.run_id)}`)
      }
    }
  },

  async createMissingPolicies(
    payload: CreateMissingHistoricalPoliciesPayload
  ): Promise<ApiResult<CreateMissingHistoricalPoliciesResult>> {
    return desktopRequest('/api/interest/historical/create-missing-policies', {
      method: 'POST',
      body: payload
    })
  },

  async previewRange(payload: RangeInterestPayload): Promise<ApiResult<RangeInterestPreviewResult>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const body = await remapRangePayload(auth.data.tenantId, payload)
    if (!body.success || !body.data) return { success: false, error: body.error }
    return desktopRequest('/api/interest/range/preview', { method: 'POST', body: body.data })
  },

  async applyRange(payload: RangeInterestPayload): Promise<ApiResult<RangeInterestApplyResult>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const body = await remapRangePayload(auth.data.tenantId, payload)
    if (!body.success || !body.data) return { success: false, error: body.error }
    const res = await desktopRequest<RangeInterestApplyResult>('/api/interest/range/apply', {
      method: 'POST',
      body: body.data
    })
    if (!res.success || !res.data) return res
    return {
      success: true,
      data: {
        ...res.data,
        run_id: toNumericId(auth.data.tenantId, `irun:${String(res.data.run_id)}`),
        policy_id: toNumericId(auth.data.tenantId, `ipolicy:${String(res.data.policy_id)}`)
      }
    }
  },

  async saveRangePolicy(
    payload: RangeInterestPayload
  ): Promise<ApiResult<SaveRangeInterestPolicyResult>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const body = await remapRangePayload(auth.data.tenantId, payload)
    if (!body.success || !body.data) return { success: false, error: body.error }
    const res = await desktopRequest<SaveRangeInterestPolicyResult>('/api/interest/range/save-policy', {
      method: 'POST',
      body: body.data
    })
    if (!res.success || !res.data) return res
    if (res.data.policy) {
      return {
        success: true,
        data: { ...res.data, policy: mapPolicy(auth.data.tenantId, res.data.policy) }
      }
    }
    return res
  },

  async auditPartnerLinks(partnerId: number): Promise<ApiResult<InterestLinkAuditResult>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const partner = resolvePartner(auth.data.tenantId, partnerId)
    if (!partner.success || !partner.data) return { success: false, error: partner.error }
    return desktopRequest(`/api/interest/links/audit/${partner.data}`)
  },

  async repairPartnerLinks(partnerId?: number): Promise<ApiResult<InterestLinkRepairResult>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    let body: { partner_id?: string } = {}
    if (partnerId != null) {
      const partner = resolvePartner(auth.data.tenantId, partnerId)
      if (!partner.success || !partner.data) return { success: false, error: partner.error }
      body = { partner_id: partner.data }
    }
    return desktopRequest('/api/interest/links/repair', { method: 'POST', body })
  },

  async cleanupPartnerForRetest(
    payload: PartnerInterestCleanupPayload
  ): Promise<ApiResult<PartnerInterestCleanupResult>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const partner = resolvePartner(auth.data.tenantId, payload.partner_id)
    if (!partner.success || !partner.data) return { success: false, error: partner.error }
    return desktopRequest('/api/interest/cleanup-for-retest', {
      method: 'POST',
      body: { ...payload, partner_id: partner.data }
    })
  }
}

async function remapRangePayload(
  tenantId: string,
  payload: RangeInterestPayload
): Promise<ApiResult<Record<string, unknown>>> {
  const member_ids =
    payload.scope_type === 'SELECTED_MEMBERS' && payload.member_ids?.length
      ? memberIdsToCuid(tenantId, payload.member_ids)
      : { success: true as const, data: [] as string[] }
  if (!member_ids.success || !member_ids.data) return { success: false, error: member_ids.error }
  return {
    success: true,
    data: {
      ...payload,
      member_ids: member_ids.data
    }
  }
}
