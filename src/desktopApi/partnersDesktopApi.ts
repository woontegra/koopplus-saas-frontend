import type {
  ApiResult,
  MemberImportBatch,
  MemberImportDuplicateMode,
  MemberImportPreviewResult,
  MemberImportPreviewRow,
  MemberImportProcessPayload,
  MemberImportProcessResult,
  Partner,
  PartnerDeletePreview,
  PartnerDeleteResult,
  PartnerInput,
  PartnerListFilters
} from '@shared/types'
import { desktopRequest, requireAuthContext } from './apiResult'
import { toCuid, toNumericId } from './idMap'
import { toDesktopPartner, toSaasWriteBody } from './partnerMapper'

function authTenant(): ApiResult<{ tenantId: string }> {
  const auth = requireAuthContext()
  if (!auth.success || !auth.data) return { success: false, error: auth.error }
  return { success: true, data: { tenantId: auth.data.tenantId } }
}

function resolveCuid(tenantId: string, numericId: number): ApiResult<string> {
  const cuid = toCuid(tenantId, numericId)
  if (!cuid) {
    return {
      success: false,
      error: 'Üye kimliği eşlemesi bulunamadı. Listeyi yenileyip tekrar deneyin.'
    }
  }
  return { success: true, data: cuid }
}

function mapPreviewRows(
  tenantId: string,
  rows: MemberImportPreviewRow[]
): MemberImportPreviewRow[] {
  return rows.map((row) => {
    const existingCuid =
      row.existing_partner_id != null ? String(row.existing_partner_id) : null
    // Backend cuid string gönderir; tip number bekler — cast sonrası numeric map
    const existingNumeric =
      existingCuid && existingCuid.length > 0 && !/^\d+$/.test(existingCuid)
        ? toNumericId(tenantId, existingCuid)
        : existingCuid && /^\d+$/.test(existingCuid)
          ? Number(existingCuid)
          : null
    return {
      ...row,
      existing_partner_id: existingNumeric
    }
  })
}

async function pickExcelFile(): Promise<ApiResult<{ fileName: string; contentBase64: string }>> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept =
      '.xlsx,.xls,.xlsm,.xlsb,.ods,.csv,.xml,.html,.htm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv'
    input.style.display = 'none'
    const cleanup = (): void => {
      input.remove()
    }
    input.addEventListener('change', () => {
      const file = input.files?.[0]
      if (!file) {
        cleanup()
        resolve({ success: false, error: 'Kayıt iptal edildi' })
        return
      }
      const reader = new FileReader()
      reader.onload = () => {
        cleanup()
        const result = reader.result
        if (!(result instanceof ArrayBuffer)) {
          resolve({ success: false, error: 'Dosya okunamadı.' })
          return
        }
        const bytes = new Uint8Array(result)
        let binary = ''
        for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]!)
        resolve({
          success: true,
          data: { fileName: file.name, contentBase64: btoa(binary) }
        })
      }
      reader.onerror = () => {
        cleanup()
        resolve({ success: false, error: 'Dosya okunamadı.' })
      }
      reader.readAsArrayBuffer(file)
    })
    input.addEventListener('cancel', () => {
      cleanup()
      resolve({ success: false, error: 'Kayıt iptal edildi' })
    })
    document.body.appendChild(input)
    input.click()
  })
}

export const partnersDesktopApi = {
  async list(filters: PartnerListFilters = {}): Promise<ApiResult<Partner[]>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const { tenantId } = auth.data

    // Slim liste yeterli alanları vermez; borçsuz tam liste için with-debt-balance kullan
    // (bakiye hesaplanır ama list() için zararsız). is_active filtresi query'de.
    const params = new URLSearchParams()
    if (filters.search?.trim()) params.set('search', filters.search.trim())
    if (filters.is_active === 0 || filters.is_active === 1) {
      params.set('is_active', String(filters.is_active))
    }
    const qs = params.toString()
    const res = await desktopRequest<{ partners: Record<string, unknown>[] }>(
      `/api/partners/with-debt-balance${qs ? `?${qs}` : ''}`
    )
    if (!res.success || !res.data) return { success: false, error: res.error }
    return {
      success: true,
      data: res.data.partners.map((p) => toDesktopPartner(tenantId, p))
    }
  },

  async listWithDebtBalance(filters: PartnerListFilters = {}): Promise<ApiResult<Partner[]>> {
    return this.list(filters)
  },

  async get(id: number): Promise<ApiResult<Partner>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const cuidRes = resolveCuid(auth.data.tenantId, id)
    if (!cuidRes.success || !cuidRes.data) return { success: false, error: cuidRes.error }

    const res = await desktopRequest<{ partner: Record<string, unknown> }>(
      `/api/partners/${encodeURIComponent(cuidRes.data)}`
    )
    if (!res.success || !res.data) return { success: false, error: res.error }
    return {
      success: true,
      data: toDesktopPartner(auth.data.tenantId, res.data.partner as Record<string, unknown>)
    }
  },

  async create(input: PartnerInput): Promise<ApiResult<Partner>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const res = await desktopRequest<{ partner: Record<string, unknown> }>('/api/partners', {
      method: 'POST',
      body: toSaasWriteBody(input)
    })
    if (!res.success || !res.data) return { success: false, error: res.error }
    return {
      success: true,
      data: toDesktopPartner(auth.data.tenantId, res.data.partner as Record<string, unknown>)
    }
  },

  async update(id: number, input: PartnerInput): Promise<ApiResult<Partner>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const cuidRes = resolveCuid(auth.data.tenantId, id)
    if (!cuidRes.success || !cuidRes.data) return { success: false, error: cuidRes.error }

    const res = await desktopRequest<{ partner: Record<string, unknown> }>(
      `/api/partners/${encodeURIComponent(cuidRes.data)}`,
      { method: 'PUT', body: toSaasWriteBody(input) }
    )
    if (!res.success || !res.data) return { success: false, error: res.error }
    return {
      success: true,
      data: toDesktopPartner(auth.data.tenantId, res.data.partner as Record<string, unknown>)
    }
  },

  async deactivate(id: number): Promise<ApiResult<Partner>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const cuidRes = resolveCuid(auth.data.tenantId, id)
    if (!cuidRes.success || !cuidRes.data) return { success: false, error: cuidRes.error }

    const res = await desktopRequest<{ partner: Record<string, unknown> }>(
      `/api/partners/${encodeURIComponent(cuidRes.data)}/deactivate`,
      { method: 'POST' }
    )
    if (!res.success || !res.data) return { success: false, error: res.error }
    return {
      success: true,
      data: toDesktopPartner(auth.data.tenantId, res.data.partner as Record<string, unknown>)
    }
  },

  async delete(id: number): Promise<ApiResult<PartnerDeleteResult>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const cuidRes = resolveCuid(auth.data.tenantId, id)
    if (!cuidRes.success || !cuidRes.data) return { success: false, error: cuidRes.error }

    const res = await desktopRequest<{ message: string }>(
      `/api/partners/${encodeURIComponent(cuidRes.data)}`,
      { method: 'DELETE' }
    )
    if (!res.success || !res.data) return { success: false, error: res.error }
    return { success: true, data: { message: res.data.message } }
  },

  async getDeletePreview(id: number): Promise<ApiResult<PartnerDeletePreview>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const cuidRes = resolveCuid(auth.data.tenantId, id)
    if (!cuidRes.success || !cuidRes.data) return { success: false, error: cuidRes.error }

    const res = await desktopRequest<{
      dueCount?: number
      paymentCount?: number
      hasRecords?: boolean
      due_count?: number
      payment_count?: number
      has_records?: boolean
    }>(`/api/partners/${encodeURIComponent(cuidRes.data)}/delete-preview`)
    if (!res.success || !res.data) return { success: false, error: res.error }
    const d = res.data
    return {
      success: true,
      data: {
        due_count: d.due_count ?? d.dueCount ?? 0,
        payment_count: d.payment_count ?? d.paymentCount ?? 0,
        has_records: d.has_records ?? d.hasRecords ?? false
      }
    }
  },

  async nextNo(): Promise<ApiResult<string>> {
    const res = await desktopRequest<{ nextNumber: string }>('/api/partners/next-number')
    if (!res.success || !res.data) return { success: false, error: res.error }
    return { success: true, data: res.data.nextNumber }
  },

  async importExcelPreview(
    duplicateMode: MemberImportDuplicateMode = 'skip'
  ): Promise<ApiResult<MemberImportPreviewResult>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }

    const fileRes = await pickExcelFile()
    if (!fileRes.success || !fileRes.data) return { success: false, error: fileRes.error }

    const res = await desktopRequest<MemberImportPreviewResult>('/api/partners/import/preview', {
      method: 'POST',
      body: {
        fileName: fileRes.data.fileName,
        contentBase64: fileRes.data.contentBase64,
        duplicateMode
      }
    })
    if (!res.success || !res.data) return { success: false, error: res.error }
    return {
      success: true,
      data: {
        ...res.data,
        rows: mapPreviewRows(auth.data.tenantId, res.data.rows)
      }
    }
  },

  async processImport(
    payload: MemberImportProcessPayload
  ): Promise<ApiResult<MemberImportProcessResult>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const { tenantId } = auth.data

    const rows = payload.rows.map((row) => {
      let existing: string | number | null | undefined = row.existing_partner_id
      if (typeof existing === 'number') {
        const cuid = toCuid(tenantId, existing)
        existing = cuid ?? existing
      }
      return { ...row, existing_partner_id: existing }
    })

    return desktopRequest<MemberImportProcessResult>('/api/partners/import/process', {
      method: 'POST',
      body: { ...payload, rows }
    })
  },

  async listImportBatches(): Promise<ApiResult<MemberImportBatch[]>> {
    const res = await desktopRequest<{ batches?: MemberImportBatch[] } | MemberImportBatch[]>(
      '/api/partners/import/batches'
    )
    if (!res.success || !res.data) return { success: false, error: res.error }
    const batches = Array.isArray(res.data) ? res.data : (res.data.batches ?? [])
    return {
      success: true,
      data: batches.map((b, index) => {
        const raw = b as MemberImportBatch & {
          fileName?: string
          totalRows?: number
          createdCount?: number
          skippedCount?: number
          errorCount?: number
          importedBy?: number | null
          createdAt?: string
        }
        const id =
          typeof raw.id === 'number' && Number.isFinite(raw.id) ? raw.id : index + 1
        return {
          id,
          file_name: raw.file_name ?? raw.fileName ?? '',
          total_rows: raw.total_rows ?? raw.totalRows ?? 0,
          created_count: raw.created_count ?? raw.createdCount ?? 0,
          skipped_count: raw.skipped_count ?? raw.skippedCount ?? 0,
          error_count: raw.error_count ?? raw.errorCount ?? 0,
          imported_by: raw.imported_by ?? raw.importedBy ?? null,
          created_at: raw.created_at ?? raw.createdAt ?? ''
        }
      })
    }
  },

  async rebuildImportPreview(
    rows: MemberImportPreviewRow[],
    duplicateMode: MemberImportDuplicateMode
  ): Promise<ApiResult<MemberImportPreviewRow[]>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const { tenantId } = auth.data

    const payloadRows = rows.map((row) => {
      let existing: string | number | null = row.existing_partner_id
      if (typeof existing === 'number') {
        existing = toCuid(tenantId, existing) ?? existing
      }
      return { ...row, existing_partner_id: existing }
    })

    const res = await desktopRequest<{ rows: MemberImportPreviewRow[] } | MemberImportPreviewRow[]>(
      '/api/partners/import/rebuild-preview',
      { method: 'POST', body: { rows: payloadRows, duplicateMode } }
    )
    if (!res.success || !res.data) return { success: false, error: res.error }
    const outRows = Array.isArray(res.data) ? res.data : res.data.rows
    return { success: true, data: mapPreviewRows(tenantId, outRows) }
  }
}
