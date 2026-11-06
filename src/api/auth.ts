import { apiRequest } from './client'
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
