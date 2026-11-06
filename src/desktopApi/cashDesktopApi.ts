/**
 * Kooperatif Kasası window.api santrali — cash.*
 * Backend: /api/cash
 */
import type {
  ApiResult,
  CashClosePeriodResult,
  CashEntry,
  CashEntryFilters,
  CashEntryPayload,
  CashEntryUpdatePayload,
  CashPeriodClosedCheck,
  CashPeriodSummary,
  CashSummary,
  DocumentPdfResult,
  ReportExportResult
} from '@shared/types'
import { desktopRequest, requireAuthContext } from './apiResult'
import { downloadViaApi, openPrintHtml } from './downloadHelpers'
import { toCuid, toNumericId } from './idMap'

function authTenant(): ApiResult<{ tenantId: string }> {
  const auth = requireAuthContext()
  if (!auth.success || !auth.data) return { success: false, error: auth.error }
  return { success: true, data: { tenantId: auth.data.tenantId } }
}

function resolveCashId(tenantId: string, numericId: number): ApiResult<string> {
  const raw = toCuid(tenantId, numericId)
  if (!raw) return { success: false, error: 'Kasa kaydı kimliği eşlemesi bulunamadı.' }
  if (raw.startsWith('cash:')) return { success: true, data: raw.slice(5) }
  if (!raw.includes(':')) return { success: true, data: raw }
  return { success: true, data: raw.split(':').slice(1).join(':') }
}

function mapEntry(tenantId: string, e: CashEntry): CashEntry {
  return {
    ...e,
    id: toNumericId(tenantId, `cash:${String(e.id)}`)
  }
}

function filtersQuery(filters: CashEntryFilters = {}): string {
  const q = new URLSearchParams()
  if (filters.date_from) q.set('dateFrom', filters.date_from)
  if (filters.date_to) q.set('dateTo', filters.date_to)
  if (filters.period_year != null) q.set('periodYear', String(filters.period_year))
  if (filters.period_month != null) q.set('periodMonth', String(filters.period_month))
  if (filters.entry_type) q.set('entryType', filters.entry_type)
  if (filters.category) q.set('category', filters.category)
  const qs = q.toString()
  return qs ? `?${qs}` : ''
}

export const cashDesktopApi = {
  async getSummary(filters: CashEntryFilters = {}): Promise<ApiResult<CashSummary>> {
    return desktopRequest(`/api/cash/summary${filtersQuery(filters)}`)
  },

  async list(filters: CashEntryFilters = {}): Promise<ApiResult<CashEntry[]>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const res = await desktopRequest<CashEntry[]>(`/api/cash/entries${filtersQuery(filters)}`)
    if (!res.success || !res.data) return res
    return { success: true, data: res.data.map((e) => mapEntry(auth.data!.tenantId, e)) }
  },

  async getDefaultFilters(): Promise<ApiResult<CashEntryFilters>> {
    return desktopRequest('/api/cash/default-filters')
  },

  async create(payload: CashEntryPayload): Promise<ApiResult<CashEntry>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const res = await desktopRequest<CashEntry>('/api/cash/entries', {
      method: 'POST',
      body: payload
    })
    if (!res.success || !res.data) return res
    return { success: true, data: mapEntry(auth.data.tenantId, res.data) }
  },

  async update(id: number, payload: CashEntryUpdatePayload): Promise<ApiResult<CashEntry>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const entryId = resolveCashId(auth.data.tenantId, id)
    if (!entryId.success || !entryId.data) return { success: false, error: entryId.error }
    const res = await desktopRequest<CashEntry>(`/api/cash/entries/${entryId.data}`, {
      method: 'PUT',
      body: payload
    })
    if (!res.success || !res.data) return res
    return { success: true, data: mapEntry(auth.data.tenantId, res.data) }
  },

  async delete(id: number): Promise<ApiResult<{ message: string }>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const entryId = resolveCashId(auth.data.tenantId, id)
    if (!entryId.success || !entryId.data) return { success: false, error: entryId.error }
    return desktopRequest(`/api/cash/entries/${entryId.data}`, { method: 'DELETE' })
  },

  async getPrintHtml(filters: CashEntryFilters = {}): Promise<ApiResult<{ html: string }>> {
    return desktopRequest(`/api/cash/print-html${filtersQuery(filters)}`)
  },

  async print(filters: CashEntryFilters = {}): Promise<ApiResult<DocumentPdfResult>> {
    const htmlRes = await cashDesktopApi.getPrintHtml(filters)
    if (!htmlRes.success || !htmlRes.data) return { success: false, error: htmlRes.error }
    return openPrintHtml(htmlRes.data.html)
  },

  async savePdf(filters: CashEntryFilters = {}): Promise<ApiResult<DocumentPdfResult>> {
    const res = await downloadViaApi('/api/cash/pdf', {
      method: 'POST',
      body: filters,
      fallbackName: 'kooperatif-kasasi.pdf'
    })
    if (!res.success || !res.data) return { success: false, error: res.error }
    return {
      success: true,
      data: {
        file_path: res.data.file_path,
        default_file_name: res.data.default_file_name ?? res.data.file_path
      }
    }
  },

  async exportExcel(filters: CashEntryFilters = {}): Promise<ApiResult<ReportExportResult>> {
    const res = await downloadViaApi('/api/cash/export-excel', {
      method: 'POST',
      body: filters,
      fallbackName: 'kooperatif-kasasi.xlsx'
    })
    if (!res.success || !res.data) return { success: false, error: res.error }
    return { success: true, data: { file_path: res.data.file_path } }
  },

  async getPeriodSummary(year: number, month: number): Promise<ApiResult<CashPeriodSummary>> {
    return desktopRequest(`/api/cash/period-summary?year=${year}&month=${month}`)
  },

  async closePeriod(
    year: number,
    month: number,
    options?: { update?: boolean }
  ): Promise<ApiResult<CashClosePeriodResult>> {
    return desktopRequest('/api/cash/close-period', {
      method: 'POST',
      body: { year, month, update: options?.update ?? false }
    })
  },

  async checkPeriodClosed(entryDate: string): Promise<ApiResult<CashPeriodClosedCheck>> {
    return desktopRequest(
      `/api/cash/check-period-closed?entryDate=${encodeURIComponent(entryDate)}`
    )
  }
}
