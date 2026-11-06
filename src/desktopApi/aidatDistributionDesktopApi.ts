/**
 * Aidat Dağıtımı window.api santrali — aidatDistribution.*
 * Backend: /api/aidat-distribution
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
    return desktopRequest('/api/aidat-distribution/execute', { method: 'POST', body: input })
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
