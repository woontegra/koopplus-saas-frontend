/**
 * Banka Hareketleri window.api santrali — bank.*
 * Backend: /api/bank
 */
import type {
  ApiResult,
  BankForgetMatchRuleResult,
  BankImportBatch,
  BankImportPreviewResult,
  BankMatchRuleItem,
  BankProcessImportPayload,
  BankProcessImportResult,
  BankSaveMatchRuleResult,
  BankSplitProcessPayload,
  BankSplitProcessResult,
  BankSuggestMatchPatternResult,
  BankUpdateMatchRuleResult,
  BankCancelSplitResult,
  PartnerLinkedMember
} from '@shared/types'
import { desktopRequest, requireAuthContext } from './apiResult'
import { toCuid, toNumericId } from './idMap'
import { getProgressBridge } from '../progress/ProgressContext'

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

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
  const mapped = toCuid(tenantId, numericId)
  if (!mapped) {
    return { success: false, error: 'Kayıt kimliği eşlemesi bulunamadı.' }
  }
  if (mapped.startsWith(`${prefix}:`)) {
    return { success: true, data: mapped.slice(prefix.length + 1) }
  }
  if (!mapped.includes(':')) return { success: true, data: mapped }
  const bare = mapped.split(':').slice(1).join(':')
  return { success: true, data: bare }
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

function mapBatch(tenantId: string, b: BankImportBatch): BankImportBatch {
  return {
    ...b,
    id: toNumericId(tenantId, `bankbatch:${String(b.id)}`)
  }
}

function mapRule(tenantId: string, r: BankMatchRuleItem): BankMatchRuleItem {
  return {
    ...r,
    id: toNumericId(tenantId, `bankrule:${String(r.id)}`),
    partner_id: toNumericId(tenantId, String(r.partner_id))
  }
}

function mapPreview(tenantId: string, data: BankImportPreviewResult): BankImportPreviewResult {
  return {
    ...data,
    rows: data.rows.map((row) => ({
      ...row,
      matched_partner_id:
        row.matched_partner_id != null
          ? toNumericId(tenantId, String(row.matched_partner_id))
          : null,
      match_rule_id:
        row.match_rule_id != null
          ? toNumericId(tenantId, `bankrule:${String(row.match_rule_id)}`)
          : null
    }))
  }
}

function mapProcessPayload(
  tenantId: string,
  payload: BankProcessImportPayload
): ApiResult<BankProcessImportPayload> {
  const rows = []
  for (const row of payload.rows) {
    const partner = resolvePartnerCuid(tenantId, row.matched_partner_id)
    if (!partner.success || !partner.data) return { success: false, error: partner.error }
    rows.push({
      ...row,
      matched_partner_id: partner.data as unknown as number
    })
  }
  return { success: true, data: { ...payload, rows } }
}

export const bankDesktopApi = {
  async importExcelPreview(): Promise<ApiResult<BankImportPreviewResult>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }

    const fileRes = await pickExcelFile()
    if (!fileRes.success || !fileRes.data) return { success: false, error: fileRes.error }

    const res = await desktopRequest<BankImportPreviewResult>('/api/bank/import/preview', {
      method: 'POST',
      body: {
        fileName: fileRes.data.fileName,
        contentBase64: fileRes.data.contentBase64
      }
    })
    if (!res.success || !res.data) return { success: false, error: res.error }
    return { success: true, data: mapPreview(auth.data.tenantId, res.data) }
  },

  async processImport(
    payload: BankProcessImportPayload
  ): Promise<ApiResult<BankProcessImportResult>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }

    const mapped = mapProcessPayload(auth.data.tenantId, payload)
    if (!mapped.success || !mapped.data) return { success: false, error: mapped.error }

    const started = await desktopRequest<{ job_id: string; total: number }>(
      '/api/bank/import/jobs',
      { method: 'POST', body: mapped.data }
    )
    if (!started.success || !started.data) {
      return { success: false, error: started.error ?? 'Aktarım işi başlatılamadı.' }
    }

    const { job_id, total } = started.data
    const progress = getProgressBridge()
    progress?.showProgress('Banka hareketleri aktarılıyor', 0, total)

    const POLL_MS = 400
    const TIMEOUT_MS = 15 * 60 * 1000
    const startedAt = Date.now()

    try {
      while (Date.now() - startedAt < TIMEOUT_MS) {
        await sleep(POLL_MS)
        const jobRes = await desktopRequest<{
          job_id: string
          status: 'queued' | 'running' | 'completed' | 'failed'
          processed: number
          total: number
          result?: BankProcessImportResult
          error?: string
        }>(`/api/bank/import/jobs/${encodeURIComponent(job_id)}`)

        if (!jobRes.success || !jobRes.data) {
          progress?.hideProgress()
          return { success: false, error: jobRes.error ?? 'Aktarım durumu alınamadı.' }
        }

        const job = jobRes.data
        progress?.updateProgress(job.processed, job.total || total)

        if (job.status === 'completed' && job.result) {
          progress?.hideProgress()
          return { success: true, data: job.result }
        }
        if (job.status === 'failed') {
          progress?.hideProgress()
          return { success: false, error: job.error ?? 'Aktarım başarısız.' }
        }
      }
      progress?.hideProgress()
      return { success: false, error: 'Aktarım zaman aşımına uğradı.' }
    } catch (err) {
      progress?.hideProgress()
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Aktarım sırasında hata oluştu.'
      }
    }
  },

  async processSplit(
    payload: BankSplitProcessPayload
  ): Promise<ApiResult<BankSplitProcessResult>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }

    const allocations = []
    for (const line of payload.allocations) {
      const partner = resolvePartnerCuid(auth.data.tenantId, line.partner_id)
      if (!partner.success || !partner.data) return { success: false, error: partner.error }
      allocations.push({ ...line, partner_id: partner.data as unknown as number })
    }

    return desktopRequest('/api/bank/split', {
      method: 'POST',
      body: { ...payload, allocations }
    })
  },

  async cancelSplit(bankTransactionId: number): Promise<ApiResult<BankCancelSplitResult>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const tx = resolveMappedCuid(auth.data.tenantId, bankTransactionId, 'banktx')
    if (!tx.success || !tx.data) return { success: false, error: tx.error }
    return desktopRequest('/api/bank/split/cancel', {
      method: 'POST',
      body: { bankTransactionId: tx.data }
    })
  },

  async listPartnerLinks(partnerId: number): Promise<ApiResult<PartnerLinkedMember[]>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const partner = resolvePartnerCuid(auth.data.tenantId, partnerId)
    if (!partner.success || !partner.data) return { success: false, error: partner.error }
    const res = await desktopRequest<PartnerLinkedMember[]>(
      `/api/bank/partner-links/${encodeURIComponent(partner.data)}`
    )
    if (!res.success || !res.data) return res
    return {
      success: true,
      data: res.data.map((m) => ({
        ...m,
        partner_id: toNumericId(auth.data!.tenantId, String(m.partner_id))
      }))
    }
  },

  async listBatches(): Promise<ApiResult<BankImportBatch[]>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const res = await desktopRequest<BankImportBatch[]>('/api/bank/batches')
    if (!res.success || !res.data) return res
    return {
      success: true,
      data: res.data.map((b) => mapBatch(auth.data!.tenantId, b))
    }
  },

  async saveMatchRule(
    partnerId: number,
    patternText: string,
    description?: string | null
  ): Promise<ApiResult<BankSaveMatchRuleResult>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const partner = resolvePartnerCuid(auth.data.tenantId, partnerId)
    if (!partner.success || !partner.data) return { success: false, error: partner.error }
    return desktopRequest('/api/bank/match-rules', {
      method: 'POST',
      body: { partnerId: partner.data, patternText, description: description ?? null }
    })
  },

  async suggestMatchPattern(
    description: string,
    partnerId: number
  ): Promise<ApiResult<BankSuggestMatchPatternResult>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const partner = resolvePartnerCuid(auth.data.tenantId, partnerId)
    if (!partner.success || !partner.data) return { success: false, error: partner.error }
    return desktopRequest('/api/bank/match-rules/suggest', {
      method: 'POST',
      body: { description, partnerId: partner.data }
    })
  },

  async listMatchRules(): Promise<ApiResult<BankMatchRuleItem[]>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const res = await desktopRequest<BankMatchRuleItem[]>('/api/bank/match-rules')
    if (!res.success || !res.data) return res
    return {
      success: true,
      data: res.data.map((r) => mapRule(auth.data!.tenantId, r))
    }
  },

  async forgetMatchRule(description: string): Promise<ApiResult<BankForgetMatchRuleResult>> {
    return desktopRequest('/api/bank/match-rules/forget', {
      method: 'POST',
      body: { description }
    })
  },

  async forgetMatchRuleById(ruleId: number): Promise<ApiResult<BankForgetMatchRuleResult>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const rule = resolveMappedCuid(auth.data.tenantId, ruleId, 'bankrule')
    if (!rule.success || !rule.data) return { success: false, error: rule.error }
    return desktopRequest(`/api/bank/match-rules/${encodeURIComponent(rule.data)}`, {
      method: 'DELETE'
    })
  },

  async updateMatchRule(
    ruleId: number,
    partnerId: number,
    patternText?: string
  ): Promise<ApiResult<BankUpdateMatchRuleResult>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const rule = resolveMappedCuid(auth.data.tenantId, ruleId, 'bankrule')
    if (!rule.success || !rule.data) return { success: false, error: rule.error }
    const partner = resolvePartnerCuid(auth.data.tenantId, partnerId)
    if (!partner.success || !partner.data) return { success: false, error: partner.error }
    return desktopRequest(`/api/bank/match-rules/${encodeURIComponent(rule.data)}`, {
      method: 'PUT',
      body: { partnerId: partner.data, patternText }
    })
  },

  async updateAndRememberMatchRule(
    description: string,
    partnerId: number,
    patternText?: string | null
  ): Promise<ApiResult<BankUpdateMatchRuleResult>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const partner = resolvePartnerCuid(auth.data.tenantId, partnerId)
    if (!partner.success || !partner.data) return { success: false, error: partner.error }
    return desktopRequest('/api/bank/match-rules/update-and-remember', {
      method: 'POST',
      body: { description, partnerId: partner.data, patternText: patternText ?? null }
    })
  }
}
