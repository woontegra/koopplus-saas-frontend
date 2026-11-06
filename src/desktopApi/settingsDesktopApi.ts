/**
 * Ayarlar window.api.settings — /api/settings
 */
import type {
  ActivePeriod,
  ApiResult,
  AppSettingsAll,
  AccrualSettingsPayload,
  DataInfo,
  GeneralSettingsPayload,
  Settings,
  SimpleSettingsPayload
} from '@shared/types'
import { desktopRequest } from './apiResult'

function emptySettings(): Settings {
  const now = new Date()
  return {
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

export const settingsDesktopApi = {
  async get(): Promise<ApiResult<Settings>> {
    const res = await desktopRequest<Settings>('/api/settings')
    if (!res.success || !res.data) {
      // Backend henüz yoksa layout kırılmasın
      if (res.error?.includes('bulunamadı') || res.error?.includes('404')) {
        return { success: true, data: emptySettings() }
      }
      return { success: false, error: res.error }
    }
    return res
  },

  async getAll(): Promise<ApiResult<AppSettingsAll>> {
    return desktopRequest<AppSettingsAll>('/api/settings/all')
  },

  async updateGeneral(payload: GeneralSettingsPayload): Promise<ApiResult<AppSettingsAll>> {
    return desktopRequest<AppSettingsAll>('/api/settings/general', {
      method: 'PUT',
      body: payload
    })
  },

  async updateAccrualSettings(payload: AccrualSettingsPayload): Promise<ApiResult<AppSettingsAll>> {
    return desktopRequest<AppSettingsAll>('/api/settings/accrual', {
      method: 'PUT',
      body: payload
    })
  },

  async getDataInfo(): Promise<ApiResult<DataInfo>> {
    return desktopRequest<DataInfo>('/api/settings/data-info')
  },

  async getActivePeriod(): Promise<ApiResult<ActivePeriod>> {
    const res = await desktopRequest<ActivePeriod>('/api/settings/active-period')
    if (res.success && res.data) return res
    const settings = await settingsDesktopApi.get()
    if (!settings.success || !settings.data) return { success: false, error: settings.error ?? res.error }
    return {
      success: true,
      data: {
        year: Number(settings.data.active_period_year) || new Date().getFullYear(),
        month: Number(settings.data.active_period_month) || new Date().getMonth() + 1
      }
    }
  },

  async getSimple(): Promise<ApiResult<SimpleSettingsPayload>> {
    return desktopRequest<SimpleSettingsPayload>('/api/settings/simple')
  },

  async updateSimple(payload: SimpleSettingsPayload): Promise<ApiResult<SimpleSettingsPayload>> {
    return desktopRequest<SimpleSettingsPayload>('/api/settings/simple', {
      method: 'PUT',
      body: payload
    })
  },

  async update(partial: Partial<Settings>): Promise<ApiResult<Settings>> {
    return desktopRequest<Settings>('/api/settings', {
      method: 'PATCH',
      body: partial
    })
  }
}
