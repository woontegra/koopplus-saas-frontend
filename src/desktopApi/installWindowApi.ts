import { partnersDesktopApi } from './partnersDesktopApi'
import {
  documentsDesktopApi,
  memberDebtTableDesktopApi,
  memberExtraDebtsDesktopApi,
  reportsDesktopApi
} from './debtDesktopApi'
import { interestDesktopApi, interestPoliciesDesktopApi } from './interestDesktopApi'
import { aidatDistributionDesktopApi } from './aidatDistributionDesktopApi'
import { cashDesktopApi } from './cashDesktopApi'
import { bankDesktopApi } from './bankDesktopApi'
import { libraryDesktopApi } from './libraryDesktopApi'
import { dashboardDesktopApi } from './dashboardDesktopApi'
import { settingsDesktopApi } from './settingsDesktopApi'
import { usersDesktopApi } from './usersDesktopApi'
import { cooperativesDesktopApi } from './cooperativesDesktopApi'
import { backupDesktopApi } from './backupDesktopApi'
import { authDesktopApi } from './authDesktopApi'

/** Güncelleme/lisans SaaS'ta yok — çağrılırsa başarı iddiası yok. */
const updateDesktopApi = {
  rendererReady: async (): Promise<{ success: boolean; data?: boolean; error?: string }> => ({
    success: false,
    error: 'SaaS’ta masaüstü güncelleme denetimi yok.'
  })
}

/**
 * Masaüstü preload `window.api` yüzeyi — SaaS REST santrali.
 */
export function installWindowApi(): void {
  if (typeof window === 'undefined') return

  const api = {
    partners: partnersDesktopApi,
    memberDebtTable: memberDebtTableDesktopApi,
    memberExtraDebts: memberExtraDebtsDesktopApi,
    interest: interestDesktopApi,
    interestPolicies: interestPoliciesDesktopApi,
    aidatDistribution: aidatDistributionDesktopApi,
    cash: cashDesktopApi,
    bank: bankDesktopApi,
    reports: reportsDesktopApi,
    documents: documentsDesktopApi,
    library: libraryDesktopApi,
    dashboard: dashboardDesktopApi,
    settings: settingsDesktopApi,
    users: usersDesktopApi,
    cooperatives: cooperativesDesktopApi,
    backup: backupDesktopApi,
    auth: authDesktopApi,
    update: updateDesktopApi
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
      interest: typeof interestDesktopApi
      interestPolicies: typeof interestPoliciesDesktopApi
      aidatDistribution: typeof aidatDistributionDesktopApi
      cash: typeof cashDesktopApi
      bank: typeof bankDesktopApi
      reports: typeof reportsDesktopApi
      documents: typeof documentsDesktopApi
      library: typeof libraryDesktopApi
      dashboard: typeof dashboardDesktopApi
      settings: typeof settingsDesktopApi
      users: typeof usersDesktopApi
      cooperatives: typeof cooperativesDesktopApi
      backup: typeof backupDesktopApi
      auth: typeof authDesktopApi
      update: typeof updateDesktopApi
    }
  }
}

export {}
