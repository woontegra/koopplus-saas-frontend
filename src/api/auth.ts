import { apiRequest } from './client'
import { loadToken } from '../auth/session'
import type { LoginResponse, MeResponse, RefreshResponse } from './types'

export type TwoFaChallenge = {
  requires2fa: true
  challengeToken: string
}

export type TwoFaSetupChallenge = {
  requires2faSetup: true
  challengeToken: string
  otpauthUrl: string
  qrDataUrl: string
  recoveryCodes: string[]
}

export type LoginResult = LoginResponse | TwoFaChallenge | TwoFaSetupChallenge

export function isTwoFaChallenge(data: LoginResult): data is TwoFaChallenge {
  return (data as TwoFaChallenge).requires2fa === true
}

export function isTwoFaSetup(data: LoginResult): data is TwoFaSetupChallenge {
  return (data as TwoFaSetupChallenge).requires2faSetup === true
}

export function loginRequest(email: string, password: string): Promise<LoginResult> {
  return apiRequest<LoginResult>('/api/auth/login', {
    method: 'POST',
    body: { email, password },
    skipAuthRefresh: true
  })
}

export function verify2faRequest(challengeToken: string, code: string): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/api/auth/2fa/verify', {
    method: 'POST',
    body: { challengeToken, code },
    skipAuthRefresh: true
  })
}

export function confirm2faSetupRequest(challengeToken: string, code: string): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/api/auth/2fa/setup/confirm', {
    method: 'POST',
    body: { challengeToken, code },
    skipAuthRefresh: true
  })
}

export function meRequest(token: string): Promise<MeResponse> {
  return apiRequest<MeResponse>('/api/auth/me', {
    method: 'GET',
    token
  })
}

export function refreshRequest(): Promise<RefreshResponse> {
  return apiRequest<RefreshResponse>('/api/auth/refresh', {
    method: 'POST',
    body: {},
    skipAuthRefresh: true
  })
}

export function logoutRequest(token: string): Promise<{ loggedOut: boolean }> {
  return apiRequest<{ loggedOut: boolean }>('/api/auth/logout', {
    method: 'POST',
    token,
    body: {}
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
