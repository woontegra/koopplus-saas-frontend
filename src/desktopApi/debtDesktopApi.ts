/**
 * Üye Borç Tablosu window.api santrali — masaüstü IPC yüzeyi → SaaS REST.
 */
import type {
  AccrualReportFilters,
  AccrualReportResult,
  ApiResult,
  BackupCreateResult,
  DebtorPartnersFilters,
  DebtorPartnersReport,
  DocumentPdfResult,
  GeneralBalanceFilters,
  GeneralBalanceReport,
  InterestReportFilters,
  InterestReportResult,
  ManualLedgerCreateResult,
  ManualLedgerDeleteResult,
  MemberDuePayload,
  MemberDueUpdatePayload,
  MemberDebtTableReport,
  MemberExtraDebtPayload,
  MemberExtraDebtRow,
  MemberExtraDebtUpdatePayload,
  MemberMultipleDuesPayload,
  MemberMultipleDuesResult,
  MemberPaymentDeleteOptions,
  MemberPaymentPayload,
  MemberPaymentUpdatePayload,
  NonPayingFilters,
  NonPayingReport,
  PartnerDebtScheduleFilters,
  PartnerDebtScheduleReport,
  PartnerLedgerFilters,
  PartnerLedgerReport,
  PaymentCreateResult,
  PaymentReportFilters,
  PaymentReportResult,
  ReportExportResult,
  ReportFilters,
  ReportType
} from '@shared/types'
import type { MemberAccountStatement } from '@shared/partnerStatementModels'
import type {
  AllMembersDebtPdfPreview,
  AllMembersDebtTablePdfOptions
} from '@shared/allMembersDebtTablePdf'
import { desktopRequest, requireAuthContext } from './apiResult'
import { toCuid, toNumericId } from './idMap'
import { toDesktopDebtReport } from './debtReportMapper'
import { downloadViaApi, fetchText, openPrintHtml } from './downloadHelpers'

function authTenant(): ApiResult<{ tenantId: string }> {
  const auth = requireAuthContext()
  if (!auth.success || !auth.data) return { success: false, error: auth.error }
  return { success: true, data: { tenantId: auth.data.tenantId } }
}

function resolvePartnerCuid(tenantId: string, numericId: number): ApiResult<string> {
  const cuid = toCuid(tenantId, numericId)
  if (!cuid) {
    return {
      success: false,
      error: 'Üye kimliği eşlemesi bulunamadı. Listeyi yenileyip tekrar deneyin.'
    }
  }
  return { success: true, data: cuid }
}

function resolveMappedCuid(
  tenantId: string,
  numericId: number,
  prefix: string
): ApiResult<string> {
  const withPrefix = toCuid(tenantId, numericId)
  if (withPrefix) {
    // toNumericId may have stored as "ledger:cuid" or bare cuid
    if (withPrefix.startsWith(`${prefix}:`)) return { success: true, data: withPrefix.slice(prefix.length + 1) }
    if (!withPrefix.includes(':')) return { success: true, data: withPrefix }
  }
  // Try lookup of prefixed key by scanning — fallback: treat numeric as hash of prefixed
  const prefixed = toCuid(tenantId, numericId)
  if (prefixed?.startsWith('synthetic:')) {
    return { success: false, error: 'Sentetik satır üzerinde bu işlem yapılamaz.' }
  }
  if (prefixed) {
    const bare = prefixed.includes(':') ? prefixed.split(':').slice(1).join(':') : prefixed
    return { success: true, data: bare }
  }
  return {
    success: false,
    error: 'Kayıt kimliği eşlemesi bulunamadı. Tabloyu yenileyip tekrar deneyin.'
  }
}

function mapExtraRow(tenantId: string, row: MemberExtraDebtRow): MemberExtraDebtRow {
  return {
    ...row,
    id: toNumericId(tenantId, `extra:${String(row.id)}`),
    partner_id: toNumericId(tenantId, String(row.partner_id))
  }
}

function mapPaymentCreate(tenantId: string, data: PaymentCreateResult): PaymentCreateResult {
  return {
    ...data,
    payment_id: toNumericId(tenantId, `payment:${String(data.payment_id)}`),
    ledger_entry_id: toNumericId(tenantId, `ledger:${String(data.ledger_entry_id)}`)
  }
}

function mapManualCreate(tenantId: string, data: ManualLedgerCreateResult): ManualLedgerCreateResult {
  const entry = data.entry
  return {
    ...data,
    entry: {
      ...entry,
      id: toNumericId(tenantId, `ledger:${String(entry.id)}`) as unknown as typeof entry.id,
      partner_id: toNumericId(tenantId, String(entry.partner_id)) as unknown as typeof entry.partner_id
    }
  }
}

function mapDeleteDue(tenantId: string, data: ManualLedgerDeleteResult): ManualLedgerDeleteResult {
  return {
    ...data,
    deleted_entry_id: toNumericId(tenantId, `ledger:${String(data.deleted_entry_id)}`)
  }
}

export const memberDebtTableDesktopApi = {
  async get(partnerId: number): Promise<ApiResult<MemberDebtTableReport>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const partner = resolvePartnerCuid(auth.data.tenantId, partnerId)
    if (!partner.success || !partner.data) return { success: false, error: partner.error }
    const res = await desktopRequest<MemberDebtTableReport>(
      `/api/partners/${partner.data}/debt-table`
    )
    if (!res.success || !res.data) return res
    return { success: true, data: toDesktopDebtReport(auth.data.tenantId, res.data) }
  },

  async defaultDueDate(year: number, month: number): Promise<ApiResult<string>> {
    const res = await desktopRequest<{ due_date: string }>(
      `/api/debt/default-due-date?periodYear=${encodeURIComponent(String(year))}&periodMonth=${encodeURIComponent(String(month))}`
    )
    if (!res.success || !res.data) return { success: false, error: res.error }
    return { success: true, data: res.data.due_date }
  },

  async createDue(payload: MemberDuePayload): Promise<ApiResult<ManualLedgerCreateResult>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const partner = resolvePartnerCuid(auth.data.tenantId, payload.partner_id)
    if (!partner.success || !partner.data) return { success: false, error: partner.error }
    const res = await desktopRequest<ManualLedgerCreateResult>(
      `/api/partners/${partner.data}/dues`,
      { method: 'POST', body: payload }
    )
    if (!res.success || !res.data) return res
    return { success: true, data: mapManualCreate(auth.data.tenantId, res.data) }
  },

  async createMultipleDues(
    payload: MemberMultipleDuesPayload
  ): Promise<ApiResult<MemberMultipleDuesResult>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const partner = resolvePartnerCuid(auth.data.tenantId, payload.partner_id)
    if (!partner.success || !partner.data) return { success: false, error: partner.error }
    return desktopRequest(`/api/partners/${partner.data}/dues/bulk`, {
      method: 'POST',
      body: {
        period_year: payload.period_year,
        period_months: payload.period_months,
        amount: payload.amount,
        description: payload.description ?? null
      }
    })
  },

  async updateDue(
    entryId: number,
    partnerId: number,
    payload: MemberDueUpdatePayload
  ): Promise<ApiResult<void>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const partner = resolvePartnerCuid(auth.data.tenantId, partnerId)
    if (!partner.success || !partner.data) return { success: false, error: partner.error }
    const due = resolveMappedCuid(auth.data.tenantId, entryId, 'ledger')
    if (!due.success || !due.data) return { success: false, error: due.error }
    const res = await desktopRequest(`/api/partners/${partner.data}/dues/${due.data}`, {
      method: 'PUT',
      body: payload
    })
    if (!res.success) return { success: false, error: res.error }
    return { success: true }
  },

  async deleteDue(entryId: number): Promise<ApiResult<ManualLedgerDeleteResult>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const due = resolveMappedCuid(auth.data.tenantId, entryId, 'ledger')
    if (!due.success || !due.data) return { success: false, error: due.error }
    // partnerId path gerekli — silmede partner bilinmiyor; due üzerinden backend partner doğrular.
    // Frontend deleteDue(entryId) only — look up partner from map is impossible; use wildcard route?
    // Backend requires partnerId. Debt page delete always has partner context via selected partner.
    // MemberDebtTablePage calls deleteDue(row.ledger_entry_id) without partner — check desktop.
    return {
      success: false,
      error:
        'deleteDue için partner bağlamı gerekli. Sayfa deleteDue(entryId, partnerId) kullanmalı veya satırdan partner çözülmeli.'
    }
  },

  async createPayment(payload: MemberPaymentPayload): Promise<ApiResult<PaymentCreateResult>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const partner = resolvePartnerCuid(auth.data.tenantId, payload.partner_id)
    if (!partner.success || !partner.data) return { success: false, error: partner.error }
    const res = await desktopRequest<PaymentCreateResult>(
      `/api/partners/${partner.data}/payments`,
      { method: 'POST', body: payload }
    )
    if (!res.success || !res.data) return res
    return { success: true, data: mapPaymentCreate(auth.data.tenantId, res.data) }
  },

  async updatePayment(
    paymentId: number,
    partnerId: number,
    payload: MemberPaymentUpdatePayload
  ): Promise<ApiResult<void>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const partner = resolvePartnerCuid(auth.data.tenantId, partnerId)
    if (!partner.success || !partner.data) return { success: false, error: partner.error }
    const payment = resolveMappedCuid(auth.data.tenantId, paymentId, 'payment')
    if (!payment.success || !payment.data) return { success: false, error: payment.error }
    const res = await desktopRequest(
      `/api/partners/${partner.data}/payments/${payment.data}`,
      { method: 'PUT', body: payload }
    )
    if (!res.success) return { success: false, error: res.error }
    return { success: true }
  },

  async deletePayment(
    paymentId: number,
    partnerId: number,
    _options?: MemberPaymentDeleteOptions
  ): Promise<ApiResult<{ message: string }>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const partner = resolvePartnerCuid(auth.data.tenantId, partnerId)
    if (!partner.success || !partner.data) return { success: false, error: partner.error }
    const payment = resolveMappedCuid(auth.data.tenantId, paymentId, 'payment')
    if (!payment.success || !payment.data) return { success: false, error: payment.error }
    return desktopRequest(`/api/partners/${partner.data}/payments/${payment.data}`, {
      method: 'DELETE'
    })
  },

  async getPrintHtml(partnerId: number): Promise<ApiResult<{ html: string }>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const partner = resolvePartnerCuid(auth.data.tenantId, partnerId)
    if (!partner.success || !partner.data) return { success: false, error: partner.error }
    const res = await fetchText(`/api/partners/${partner.data}/debt-table/print`)
    if (!res.success || res.data == null) return { success: false, error: res.error }
    return { success: true, data: { html: res.data } }
  }
}

/** deleteDue(entryId) masaüstü imzası — partnerId'yi sessionStorage'dan son seçimle tamamlarız. */
let lastDebtPartnerId: number | null = null

export function rememberDebtPartnerId(partnerId: number): void {
  lastDebtPartnerId = partnerId
}

const originalGet = memberDebtTableDesktopApi.get.bind(memberDebtTableDesktopApi)
memberDebtTableDesktopApi.get = async (partnerId: number) => {
  rememberDebtPartnerId(partnerId)
  return originalGet(partnerId)
}

memberDebtTableDesktopApi.deleteDue = async (
  entryId: number
): Promise<ApiResult<ManualLedgerDeleteResult>> => {
  const auth = authTenant()
  if (!auth.success || !auth.data) return { success: false, error: auth.error }
  if (lastDebtPartnerId == null) {
    return { success: false, error: 'Üye seçimi bulunamadı. Tabloyu yenileyip tekrar deneyin.' }
  }
  const partner = resolvePartnerCuid(auth.data.tenantId, lastDebtPartnerId)
  if (!partner.success || !partner.data) return { success: false, error: partner.error }
  const due = resolveMappedCuid(auth.data.tenantId, entryId, 'ledger')
  if (!due.success || !due.data) return { success: false, error: due.error }
  const res = await desktopRequest<ManualLedgerDeleteResult>(
    `/api/partners/${partner.data}/dues/${due.data}`,
    { method: 'DELETE' }
  )
  if (!res.success || !res.data) return res
  return { success: true, data: mapDeleteDue(auth.data.tenantId, res.data) }
}

export const memberExtraDebtsDesktopApi = {
  async create(payload: MemberExtraDebtPayload): Promise<ApiResult<MemberExtraDebtRow>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const partner = resolvePartnerCuid(auth.data.tenantId, payload.partner_id)
    if (!partner.success || !partner.data) return { success: false, error: partner.error }
    const res = await desktopRequest<MemberExtraDebtRow>(
      `/api/partners/${partner.data}/extra-debts`,
      { method: 'POST', body: payload }
    )
    if (!res.success || !res.data) return res
    return { success: true, data: mapExtraRow(auth.data.tenantId, res.data) }
  },

  async update(
    id: number,
    partnerId: number,
    payload: MemberExtraDebtUpdatePayload
  ): Promise<ApiResult<MemberExtraDebtRow>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const partner = resolvePartnerCuid(auth.data.tenantId, partnerId)
    if (!partner.success || !partner.data) return { success: false, error: partner.error }
    const extra = resolveMappedCuid(auth.data.tenantId, id, 'extra')
    if (!extra.success || !extra.data) return { success: false, error: extra.error }
    const res = await desktopRequest<MemberExtraDebtRow>(
      `/api/partners/${partner.data}/extra-debts/${extra.data}`,
      { method: 'PUT', body: payload }
    )
    if (!res.success || !res.data) return res
    return { success: true, data: mapExtraRow(auth.data.tenantId, res.data) }
  },

  async delete(id: number, partnerId: number): Promise<ApiResult<{ message: string }>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const partner = resolvePartnerCuid(auth.data.tenantId, partnerId)
    if (!partner.success || !partner.data) return { success: false, error: partner.error }
    const extra = resolveMappedCuid(auth.data.tenantId, id, 'extra')
    if (!extra.success || !extra.data) return { success: false, error: extra.error }
    return desktopRequest(`/api/partners/${partner.data}/extra-debts/${extra.data}`, {
      method: 'DELETE'
    })
  }
}

function mapPartnerIdInFilters<T extends { partner_id?: number | null }>(
  tenantId: string,
  filters: T
): ApiResult<T> {
  if (filters.partner_id == null) return { success: true, data: filters }
  const partner = resolvePartnerCuid(tenantId, filters.partner_id)
  if (!partner.success || !partner.data) return { success: false, error: partner.error }
  return {
    success: true,
    data: { ...filters, partner_id: partner.data as unknown as number }
  }
}

export const reportsDesktopApi = {
  async generalBalance(
    filters: GeneralBalanceFilters
  ): Promise<ApiResult<GeneralBalanceReport>> {
    return desktopRequest('/api/reports/general-balance', { method: 'POST', body: filters })
  },

  async debtorPartners(
    filters: DebtorPartnersFilters
  ): Promise<ApiResult<DebtorPartnersReport>> {
    return desktopRequest('/api/reports/debtor-partners', { method: 'POST', body: filters })
  },

  async nonPayingPartners(filters: NonPayingFilters): Promise<ApiResult<NonPayingReport>> {
    return desktopRequest('/api/reports/non-paying', { method: 'POST', body: filters })
  },

  async accrualReport(filters: AccrualReportFilters): Promise<ApiResult<AccrualReportResult>> {
    return desktopRequest('/api/reports/accrual', { method: 'POST', body: filters })
  },

  async paymentReport(filters: PaymentReportFilters): Promise<ApiResult<PaymentReportResult>> {
    return desktopRequest('/api/reports/payment', { method: 'POST', body: filters })
  },

  async interestReport(
    filters: InterestReportFilters
  ): Promise<ApiResult<InterestReportResult>> {
    return desktopRequest('/api/reports/interest', { method: 'POST', body: filters })
  },

  async partnerLedger(
    filters: PartnerLedgerFilters
  ): Promise<ApiResult<PartnerLedgerReport>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const mapped = mapPartnerIdInFilters(auth.data.tenantId, filters)
    if (!mapped.success || !mapped.data) return { success: false, error: mapped.error }
    const res = await desktopRequest<PartnerLedgerReport>('/api/reports/partner-ledger', {
      method: 'POST',
      body: mapped.data
    })
    if (!res.success || !res.data) return res
    return { success: true, data: res.data }
  },

  async memberStatement(payload: {
    partner_id: number
    date_from?: string | null
    date_to?: string | null
  }): Promise<ApiResult<MemberAccountStatement>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const partner = resolvePartnerCuid(auth.data.tenantId, payload.partner_id)
    if (!partner.success || !partner.data) return { success: false, error: partner.error }
    const res = await desktopRequest<MemberAccountStatement>('/api/reports/member-statement', {
      method: 'POST',
      body: { ...payload, partner_id: partner.data }
    })
    if (!res.success || !res.data) return res
    return {
      success: true,
      data: {
        ...res.data,
        partner_id: toNumericId(auth.data.tenantId, String(res.data.partner_id))
      }
    }
  },

  async partnerDebtSchedule(
    filters: PartnerDebtScheduleFilters
  ): Promise<ApiResult<PartnerDebtScheduleReport>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const mapped = mapPartnerIdInFilters(auth.data.tenantId, filters)
    if (!mapped.success || !mapped.data) return { success: false, error: mapped.error }
    const res = await desktopRequest<PartnerDebtScheduleReport>(
      '/api/reports/partner-debt-schedule',
      { method: 'POST', body: mapped.data }
    )
    if (!res.success || !res.data) return res
    return {
      success: true,
      data: {
        ...res.data,
        partner_id: toNumericId(auth.data.tenantId, String(res.data.partner_id))
      }
    }
  },

  async exportPartnerDebtScheduleExcel(
    filters: PartnerDebtScheduleFilters
  ): Promise<ApiResult<ReportExportResult>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const mapped = mapPartnerIdInFilters(auth.data.tenantId, filters)
    if (!mapped.success || !mapped.data) return { success: false, error: mapped.error }
    const res = await downloadViaApi('/api/reports/partner-debt-schedule/export', {
      method: 'POST',
      body: mapped.data,
      fallbackName: 'uye-borc-cetveli.xlsx'
    })
    if (!res.success || !res.data) return { success: false, error: res.error }
    return { success: true, data: { file_path: res.data.file_path } }
  },

  async exportMemberDebtTableExcel(partnerId: number): Promise<ApiResult<ReportExportResult>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const partner = resolvePartnerCuid(auth.data.tenantId, partnerId)
    if (!partner.success || !partner.data) return { success: false, error: partner.error }
    const res = await downloadViaApi(`/api/partners/${partner.data}/debt-table/export`, {
      method: 'POST',
      body: {},
      fallbackName: 'uye-borc-tablosu.xlsx'
    })
    if (!res.success || !res.data) return { success: false, error: res.error }
    return { success: true, data: { file_path: res.data.file_path } }
  },

  async exportExcel(
    reportType: ReportType,
    filters: ReportFilters
  ): Promise<ApiResult<ReportExportResult>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const mapped = mapPartnerIdInFilters(
      auth.data.tenantId,
      filters as { partner_id?: number | null }
    )
    if (!mapped.success || !mapped.data) return { success: false, error: mapped.error }
    const res = await downloadViaApi('/api/reports/export-excel', {
      method: 'POST',
      body: { reportType, filters: mapped.data },
      fallbackName: `${reportType}.xlsx`
    })
    if (!res.success || !res.data) return { success: false, error: res.error }
    return { success: true, data: { file_path: res.data.file_path } }
  }
}

async function pdfDownload(
  path: string,
  body: unknown,
  fallbackName: string
): Promise<ApiResult<DocumentPdfResult>> {
  const res = await downloadViaApi(path, {
    method: 'POST',
    body,
    fallbackName
  })
  if (!res.success || !res.data) return { success: false, error: res.error }
  return {
    success: true,
    data: {
      file_path: res.data.file_path,
      default_file_name: res.data.default_file_name ?? res.data.file_path
    }
  }
}

export const documentsDesktopApi = {
  async createMemberDebtTablePdf(partnerId: number): Promise<ApiResult<DocumentPdfResult>> {
    return documentsDesktopApi.saveMemberDebtTablePdf(partnerId)
  },

  /** Sunucu: getPrintHtml ile aynı HTML → Puppeteer PDF (masaüstü Electron printToPDF). */
  async saveMemberDebtTablePdf(partnerId: number): Promise<ApiResult<DocumentPdfResult>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const partner = resolvePartnerCuid(auth.data.tenantId, partnerId)
    if (!partner.success || !partner.data) return { success: false, error: partner.error }
    const res = await downloadViaApi(`/api/partners/${partner.data}/debt-table/pdf`, {
      method: 'GET',
      fallbackName: 'uye-borc-tablosu.pdf'
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

  async printMemberDebtTable(partnerId: number): Promise<ApiResult<DocumentPdfResult>> {
    const htmlRes = await memberDebtTableDesktopApi.getPrintHtml(partnerId)
    if (!htmlRes.success || !htmlRes.data) return { success: false, error: htmlRes.error }
    return openPrintHtml(htmlRes.data.html)
  },

  async previewAllMembersDebtTablePdf(
    options: AllMembersDebtTablePdfOptions
  ): Promise<ApiResult<AllMembersDebtPdfPreview>> {
    return desktopRequest('/api/debt/all-members-pdf/preview', {
      method: 'POST',
      body: options
    })
  },

  async saveAllMembersDebtTablePdf(
    options: AllMembersDebtTablePdfOptions
  ): Promise<ApiResult<DocumentPdfResult>> {
    const res = await downloadViaApi('/api/debt/all-members-pdf', {
      method: 'POST',
      body: options,
      fallbackName: 'tum-uyeler-borc-tablosu.pdf'
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

  async savePartnerLedgerPdf(
    filters: PartnerLedgerFilters
  ): Promise<ApiResult<DocumentPdfResult>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const mapped = mapPartnerIdInFilters(auth.data.tenantId, filters)
    if (!mapped.success || !mapped.data) return { success: false, error: mapped.error }
    return pdfDownload('/api/documents/partner-ledger-pdf', mapped.data, 'cari-ekstre.pdf')
  },

  async createPartnerLedgerPdf(
    filters: PartnerLedgerFilters
  ): Promise<ApiResult<DocumentPdfResult>> {
    return documentsDesktopApi.savePartnerLedgerPdf(filters)
  },

  async savePartnerLedgerSummaryPdf(
    filters: PartnerLedgerFilters
  ): Promise<ApiResult<DocumentPdfResult>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const mapped = mapPartnerIdInFilters(auth.data.tenantId, filters)
    if (!mapped.success || !mapped.data) return { success: false, error: mapped.error }
    return pdfDownload(
      '/api/documents/partner-ledger-summary-pdf',
      mapped.data,
      'cari-ozet.pdf'
    )
  },

  async saveInterestReportPdf(
    filters: InterestReportFilters
  ): Promise<ApiResult<DocumentPdfResult>> {
    return pdfDownload('/api/documents/interest-report-pdf', filters, 'faiz-raporu.pdf')
  },

  async saveMemberStatementPdf(payload: {
    partner_id?: number | null
    all_members?: boolean
    date_from?: string | null
    date_to?: string | null
  }): Promise<ApiResult<DocumentPdfResult>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    if (payload.all_members || payload.partner_id == null) {
      return { success: false, error: 'Toplu üye hesap ekstresi PDF henüz desteklenmiyor.' }
    }
    const partner = resolvePartnerCuid(auth.data.tenantId, payload.partner_id)
    if (!partner.success || !partner.data) return { success: false, error: partner.error }
    return pdfDownload(
      '/api/documents/member-statement-pdf',
      { ...payload, partner_id: partner.data },
      'uye-hesap-ekstresi.pdf'
    )
  },

  async savePartnerDebtSchedulePdf(
    filters: PartnerDebtScheduleFilters
  ): Promise<ApiResult<DocumentPdfResult>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const mapped = mapPartnerIdInFilters(auth.data.tenantId, filters)
    if (!mapped.success || !mapped.data) return { success: false, error: mapped.error }
    return pdfDownload(
      '/api/documents/partner-debt-schedule-pdf',
      mapped.data,
      'uye-borc-cetveli.pdf'
    )
  },

  async printPartnerDebtSchedule(
    filters: PartnerDebtScheduleFilters
  ): Promise<ApiResult<DocumentPdfResult>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const mapped = mapPartnerIdInFilters(auth.data.tenantId, filters)
    if (!mapped.success || !mapped.data) return { success: false, error: mapped.error }
    const htmlRes = await fetchText('/api/documents/partner-debt-schedule-print-html', {
      method: 'POST',
      body: mapped.data
    })
    if (!htmlRes.success || !htmlRes.data) return { success: false, error: htmlRes.error }
    return openPrintHtml(htmlRes.data)
  }
}

export const backupDesktopApi = {
  async createBackup(): Promise<ApiResult<BackupCreateResult>> {
    const res = await downloadViaApi('/api/debt/backup', {
      method: 'GET',
      fallbackName: 'koopplus-tenant-backup.json'
    })
    if (!res.success || !res.data) return { success: false, error: res.error }
    return {
      success: true,
      data: {
        file_path: res.data.file_path,
        file_size: 0,
        documents_archive_status: 'empty'
      }
    }
  }
}
