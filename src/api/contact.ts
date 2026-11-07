import { apiRequest } from './client'
import { loadToken } from '../auth/session'
import type { PlatformContact } from './types'

export function fetchPlatformContact(token?: string | null): Promise<PlatformContact> {
  return apiRequest<PlatformContact>('/api/auth/platform-contact', {
    method: 'GET',
    token: token ?? loadToken()
  })
}
