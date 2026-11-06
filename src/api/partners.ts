import { apiRequest } from './client'
import type {
  Partner,
  PartnerDeletePreview,
  PartnerListResponse,
  PartnerWriteInput
} from './types'

type AuthOpts = { token: string; tenantId: string }

export function listPartners(opts: AuthOpts): Promise<PartnerListResponse> {
  return apiRequest<PartnerListResponse>('/api/partners', {
    method: 'GET',
    token: opts.token,
    tenantId: opts.tenantId
  })
}

export function getPartner(id: string, opts: AuthOpts): Promise<{ partner: Partner }> {
  return apiRequest<{ partner: Partner }>(`/api/partners/${encodeURIComponent(id)}`, {
    method: 'GET',
    token: opts.token,
    tenantId: opts.tenantId
  })
}

export function getNextPartnerNumber(opts: AuthOpts): Promise<{ nextNumber: string }> {
  return apiRequest<{ nextNumber: string }>('/api/partners/next-number', {
    method: 'GET',
    token: opts.token,
    tenantId: opts.tenantId
  })
}

export function createPartner(
  body: PartnerWriteInput,
  opts: AuthOpts
): Promise<{ partner: Partner }> {
  return apiRequest<{ partner: Partner }>('/api/partners', {
    method: 'POST',
    body,
    token: opts.token,
    tenantId: opts.tenantId
  })
}

export function updatePartner(
  id: string,
  body: PartnerWriteInput,
  opts: AuthOpts
): Promise<{ partner: Partner }> {
  return apiRequest<{ partner: Partner }>(`/api/partners/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body,
    token: opts.token,
    tenantId: opts.tenantId
  })
}

export function deactivatePartner(
  id: string,
  opts: AuthOpts
): Promise<{ partner: Partner }> {
  return apiRequest<{ partner: Partner }>(
    `/api/partners/${encodeURIComponent(id)}/deactivate`,
    {
      method: 'POST',
      token: opts.token,
      tenantId: opts.tenantId
    }
  )
}

/** Silme API mevcut; Stage 8 UI cascade riski nedeniyle etkinleştirilmedi. */
export function getPartnerDeletePreview(
  id: string,
  opts: AuthOpts
): Promise<PartnerDeletePreview> {
  return apiRequest<PartnerDeletePreview>(
    `/api/partners/${encodeURIComponent(id)}/delete-preview`,
    {
      method: 'GET',
      token: opts.token,
      tenantId: opts.tenantId
    }
  )
}
