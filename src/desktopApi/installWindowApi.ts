import type { Settings } from '@shared/types'
import { partnersDesktopApi } from './partnersDesktopApi'
import {
  backupDesktopApi,
  documentsDesktopApi,
  memberDebtTableDesktopApi,
  memberExtraDebtsDesktopApi,
  reportsDesktopApi
} from './debtDesktopApi'

type ApiResult<T = void> = { success: boolean; data?: T; error?: string }

function notPorted(name: string): () => Promise<ApiResult<never>> {
  return async () => ({
    success: false,
    error: `${name} henüz SaaS API katmanında yok.`
  })
}

/** AppLayout/Header/Footer için SaaS ayar kabuğu — kooperatif adı CooperativeSwitcher'dan gelir. */
async function getSettings(): Promise<ApiResult<Settings>> {
  const now = new Date()
  return {
    success: true,
    data: {
      cooperative_name: '',
      cooperative_address: '',
      cooperative_phone: '',
      cooperative_email: '',
      authorized_person: '',
      cooperative_city: '',
      cooperative_district: '',
      cooperative_tax_id: '',
      cooperative_description: '',
      default_monthly_dues: '',
      last_payment_day: '',
      default_accrual_description: '',
      active_period_month: String(now.getMonth() + 1),
      active_period_year: String(now.getFullYear()),
      backup_folder: '',
      last_backup_date: '',
      last_backup_file: '',
      monthly_interest_rate: '',
      use_end_of_month_due: ''
    }
  }
}

/**
 * Masaüstü preload `window.api` yüzeyi.
 * Üyeler + Üye Borç Tablosu namespace'leri bağlı; diğerleri güvenli stub.
 */
export function installWindowApi(): void {
  if (typeof window === 'undefined') return

  const api = {
    partners: partnersDesktopApi,
    memberDebtTable: memberDebtTableDesktopApi,
    memberExtraDebts: memberExtraDebtsDesktopApi,
    reports: reportsDesktopApi,
    documents: documentsDesktopApi,
    backup: backupDesktopApi,
    settings: {
      get: getSettings
    },
    update: {
      rendererReady: async (): Promise<ApiResult<void>> => ({ success: true })
    },
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
      memberDebtTable: typeof memberDebtTableDesktopApi
      memberExtraDebts: typeof memberExtraDebtsDesktopApi
      reports: typeof reportsDesktopApi
      documents: typeof documentsDesktopApi
      backup: typeof backupDesktopApi
      settings: {
        get: () => Promise<ApiResult<Settings>>
      }
      update: {
        rendererReady: () => Promise<ApiResult<void>>
      }
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
