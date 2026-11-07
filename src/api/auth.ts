import { apiRequest } from './client'
import { loadRefreshToken, loadToken } from '../auth/session'
import type { LoginResponse, MeResponse, RefreshResponse } from './types'

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

export function refreshRequest(refreshToken: string): Promise<RefreshResponse> {
  return apiRequest<RefreshResponse>('/api/auth/refresh', {
    method: 'POST',
    body: { refreshToken },
    skipAuthRefresh: true
  })
}

export function logoutRequest(token: string): Promise<{ loggedOut: boolean }> {
  return apiRequest<{ loggedOut: boolean }>('/api/auth/logout', {
    method: 'POST',
    token,
    body: { refreshToken: loadRefreshToken() }
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
