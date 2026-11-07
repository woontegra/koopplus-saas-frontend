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

export const settingsDesktopApi = {
  async get(): Promise<ApiResult<Settings>> {
    const res = await desktopRequest<Settings>('/api/settings')
    if (!res.success || !res.data) {
      return { success: false, error: res.error ?? 'Ayarlar alınamadı' }
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
  },

  async getSampleData(): Promise<
    ApiResult<{ has_sample_data: boolean; total: number; counts: Record<string, number> }>
  > {
    return desktopRequest('/api/settings/sample-data')
  },

  async clearSampleData(): Promise<
    ApiResult<{
      deleted: Record<string, number>
      kept_partners: number
      kept_policies: number
      total_deleted: number
      message: string
    }>
  > {
    return desktopRequest('/api/settings/clear-sample-data', { method: 'POST' })
  }
}
