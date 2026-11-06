/**
 * Kooperatifler window.api.cooperatives — /api/cooperatives
 */
import type {
  ApiResult,
  CooperativeCreatePayload,
  CooperativeCreateResult,
  CooperativeListResult,
  CooperativeRecord,
  CooperativeSwitchResult
} from '@shared/types'
import { desktopAuthRequest } from './apiResult'

type ChangedListener = (payload: { currentId: string | null; switched?: boolean }) => void

const listeners = new Set<ChangedListener>()

function emitChanged(payload: { currentId: string | null; switched?: boolean }): void {
  for (const listener of listeners) {
    try {
      listener(payload)
    } catch {
      /* ignore */
    }
  }
}

export const cooperativesDesktopApi = {
  async list(): Promise<ApiResult<CooperativeListResult>> {
    return desktopAuthRequest<CooperativeListResult>('/api/cooperatives')
  },

  async create(payload: CooperativeCreatePayload): Promise<ApiResult<CooperativeCreateResult>> {
    const res = await desktopAuthRequest<CooperativeCreateResult>('/api/cooperatives', {
      method: 'POST',
      body: payload
    })
    if (res.success && res.data) {
      emitChanged({
        currentId: res.data.opened ? res.data.cooperative.id : null,
        switched: Boolean(res.data.opened)
      })
    }
    return res
  },

  async open(id: string): Promise<ApiResult<CooperativeSwitchResult>> {
    const res = await desktopAuthRequest<CooperativeSwitchResult>(
      `/api/cooperatives/${encodeURIComponent(id)}/open`,
      { method: 'POST' }
    )
    if (res.success && res.data) {
      emitChanged({ currentId: res.data.current.id, switched: true })
    }
    return res
  },

  async archive(id: string): Promise<ApiResult<CooperativeRecord>> {
    const res = await desktopAuthRequest<CooperativeRecord>(
      `/api/cooperatives/${encodeURIComponent(id)}/archive`,
      { method: 'POST' }
    )
    if (res.success) emitChanged({ currentId: null, switched: false })
    return res
  },

  async unarchive(id: string): Promise<ApiResult<CooperativeRecord>> {
    const res = await desktopAuthRequest<CooperativeRecord>(
      `/api/cooperatives/${encodeURIComponent(id)}/unarchive`,
      { method: 'POST' }
    )
    if (res.success) emitChanged({ currentId: null, switched: false })
    return res
  },

  onChanged(listener: ChangedListener): () => void {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }
}
