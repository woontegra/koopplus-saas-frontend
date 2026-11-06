import { partnersDesktopApi } from './partnersDesktopApi'

type ApiResult<T = void> = { success: boolean; data?: T; error?: string }

function notPorted(name: string): () => Promise<ApiResult<never>> {
  return async () => ({
    success: false,
    error: `${name} henüz SaaS API katmanında yok.`
  })
}

/**
 * Masaüstü preload `window.api` yüzeyi.
 * Üyeler modülü partners.* kullanır; diğer namespace'ler güvenli stub.
 */
export function installWindowApi(): void {
  if (typeof window === 'undefined') return

  const api = {
    partners: partnersDesktopApi,
    auth: {
      hasUsers: notPorted('auth.hasUsers'),
      createInitialAdmin: notPorted('auth.createInitialAdmin'),
      login: notPorted('auth.login'),
      logout: notPorted('auth.logout'),
      getSession: notPorted('auth.getSession')
    }
  }

  Object.defineProperty(window, 'api', {
    value: api,
    writable: false,
    configurable: true
  })
}

declare global {
  interface Window {
    api: {
      partners: typeof partnersDesktopApi
      auth: {
        hasUsers: () => Promise<ApiResult<boolean>>
        createInitialAdmin: (payload: unknown) => Promise<ApiResult<unknown>>
        login: (username: string, password: string) => Promise<ApiResult<unknown>>
        logout: () => Promise<ApiResult<void>>
        getSession: () => Promise<ApiResult<unknown>>
      }
    }
  }
}

export {}
