/**
 * Aidat Dağıtımı window.api santrali — aidatDistribution.*
 * Backend: /api/aidat-distribution
 * execute: üye Excel aktarımı gibi arka plan iş + ilerleme çubuğu.
 */
import type {
  AidatDistributionBatch,
  AidatDistributionInput,
  AidatDistributionPreview,
  AidatDistributionResult,
  ApiResult
} from '@shared/types'
import { desktopRequest, requireAuthContext } from './apiResult'
import { toNumericId } from './idMap'
import { getProgressBridge } from '../progress/ProgressContext'

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function authTenant(): ApiResult<{ tenantId: string }> {
  const auth = requireAuthContext()
  if (!auth.success || !auth.data) return { success: false, error: auth.error }
  return { success: true, data: { tenantId: auth.data.tenantId } }
}

function mapBatch(tenantId: string, b: AidatDistributionBatch): AidatDistributionBatch {
  return {
    ...b,
    id: toNumericId(tenantId, `aidatbatch:${String(b.id)}`)
  }
}

export const aidatDistributionDesktopApi = {
  async preview(input: AidatDistributionInput): Promise<ApiResult<AidatDistributionPreview>> {
    return desktopRequest('/api/aidat-distribution/preview', { method: 'POST', body: input })
  },

  async execute(input: AidatDistributionInput): Promise<ApiResult<AidatDistributionResult>> {
    const started = await desktopRequest<{ job_id: string; total: number }>(
      '/api/aidat-distribution/jobs',
      { method: 'POST', body: input }
    )
    if (!started.success || !started.data) {
      return { success: false, error: started.error ?? 'Aidat dağıtımı işi başlatılamadı.' }
    }

    const { job_id, total } = started.data
    const progress = getProgressBridge()
    progress?.showProgress('Aidat dağıtılıyor', 0, total)

    const POLL_MS = 400
    const TIMEOUT_MS = 30 * 60 * 1000
    const startedAt = Date.now()

    try {
      while (Date.now() - startedAt < TIMEOUT_MS) {
        await sleep(POLL_MS)
        const jobRes = await desktopRequest<{
          job_id: string
          status: 'queued' | 'running' | 'completed' | 'failed'
          processed: number
          total: number
          result?: AidatDistributionResult
          error?: string
        }>(`/api/aidat-distribution/jobs/${encodeURIComponent(job_id)}`)

        if (!jobRes.success || !jobRes.data) {
          progress?.hideProgress()
          return { success: false, error: jobRes.error ?? 'Dağıtım durumu alınamadı.' }
        }

        const job = jobRes.data
        progress?.updateProgress(job.processed, job.total || total)

        if (job.status === 'completed' && job.result) {
          progress?.hideProgress()
          return { success: true, data: job.result }
        }
        if (job.status === 'failed') {
          progress?.hideProgress()
          return { success: false, error: job.error ?? 'Aidat dağıtımı başarısız.' }
        }
      }
      progress?.hideProgress()
      return { success: false, error: 'Aidat dağıtımı zaman aşımına uğradı.' }
    } catch (err) {
      progress?.hideProgress()
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Aidat dağıtımı sırasında hata oluştu.'
      }
    }
  },

  async listBatches(): Promise<ApiResult<AidatDistributionBatch[]>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const res = await desktopRequest<AidatDistributionBatch[]>('/api/aidat-distribution/batches')
    if (!res.success || !res.data) return res
    return {
      success: true,
      data: res.data.map((b) => mapBatch(auth.data!.tenantId, b))
    }
  }
}
