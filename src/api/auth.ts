import { apiRequest } from './client'
import { loadToken } from '../auth/session'
import type { LoginResponse, MeResponse } from './types'

export function loginRequest(email: string, password: string): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: { email, password }
  })
}

export function meRequest(token: string): Promise<MeResponse> {
  return apiRequest<MeResponse>('/api/auth/me', {
    method: 'GET',
    token
  })
}

export function logoutRequest(token: string): Promise<{ loggedOut: boolean }> {
  return apiRequest<{ loggedOut: boolean }>('/api/auth/logout', {
    method: 'POST',
    token
  })
}

export function activateLicenseRequest(
  tenantId: string,
  licenseKey: string
): Promise<{ activated: boolean; alreadyActivated?: boolean }> {
  return apiRequest('/api/auth/activate-license', {
    method: 'POST',
    token: loadToken(),
    body: { tenantId, licenseKey }
  })
}
