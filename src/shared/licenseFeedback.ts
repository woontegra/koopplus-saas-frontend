import type { LicenseActionResult, LicenseClientState, LicenseKind, LicensePhase } from './license'
import type { ToastInput } from './toast'

export type LicenseStatusTone = 'ok' | 'trial' | 'offline' | 'expired' | 'neutral'

export function licenseStatusPresentation(phase: LicensePhase): { label: string; tone: LicenseStatusTone } {
  switch (phase) {
    case 'license_active':
      return { label: 'Lisans Aktif', tone: 'ok' }
    case 'trial_active':
      return { label: 'Ücretsiz Deneme', tone: 'trial' }
    case 'offline_grace':
      return { label: 'Çevrimdışı Kullanım', tone: 'offline' }
    case 'trial_expired':
    case 'license_expired':
      return { label: 'Lisans Süresi Doldu', tone: 'expired' }
    default:
      return { label: 'Kontrol ediliyor', tone: 'neutral' }
  }
}

export function licenseKindLabel(kind: LicenseKind): string {
  if (kind === 'trial') return '7 Günlük Deneme'
  if (kind === 'paid') return 'Yıllık Lisans'
  return 'Yok'
}

export function licenseRefreshToast(state: LicenseClientState): ToastInput {
  if (state.phase === 'license_active' || state.phase === 'trial_active') {
    return {
      kind: 'success',
      id: 'license-refresh-success',
      title: 'Lisans güncel',
      message:
        state.daysRemaining != null
          ? `KoopPlus lisansınız doğrulandı. Kalan kullanım süresi: ${state.daysRemaining} gün.`
          : 'KoopPlus lisansınız başarıyla doğrulandı.'
    }
  }

  if (state.phase === 'offline_grace') {
    return {
      kind: 'warning',
      id: 'license-refresh-offline',
      title: 'Çevrimdışı kullanım',
      message:
        'Lisans sunucusuna ulaşılamadı. KoopPlus çevrimdışı kullanım süresiyle çalışmaya devam ediyor.'
    }
  }

  if (state.phase === 'server_unreachable' && state.kind === 'trial') {
    return {
      kind: 'error',
      id: 'license-refresh-trial-offline',
      title: 'Bağlantı kurulamadı',
      message: 'Demo lisansınızı doğrulamak için internet bağlantısı gereklidir.'
    }
  }

  return {
    kind: 'error',
    id: 'license-refresh-error',
    title: 'Lisans doğrulanamadı',
    message: safeLicenseMessage(state.message) || 'KoopPlus lisansınız doğrulanamadı.'
  }
}

export function licenseActivationToast(result: LicenseActionResult): ToastInput {
  if (result.ok) {
    return {
      kind: 'success',
      id: 'license-activate-success',
      title: 'Lisans etkinleştirildi',
      message: 'KoopPlus lisansınız başarıyla etkinleştirildi.'
    }
  }

  const raw = `${result.error ?? ''} ${result.state.message ?? ''} ${result.code ?? ''}`
  if (/ulaşılamadı|internet|SERVER_UNREACHABLE|Failed to fetch|network/i.test(raw)) {
    return {
      kind: 'error',
      id: 'license-activate-network',
      title: 'Bağlantı kurulamadı',
      message: 'Lisans sunucusuna ulaşılamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.'
    }
  }
  if (/aktivasyon şifresi/i.test(raw)) {
    return {
      kind: 'error',
      id: 'license-activate-password',
      title: 'Etkinleştirme başarısız',
      message: 'Aktivasyon şifresi hatalı.'
    }
  }
  if (/başka bir bilgisayar|cihaz limiti/i.test(raw)) {
    return {
      kind: 'error',
      id: 'license-activate-device',
      title: 'Etkinleştirme başarısız',
      message: 'Bu lisans başka bir bilgisayarda etkinleştirilmiş.'
    }
  }
  return {
    kind: 'error',
    id: 'license-activate-error',
    title: 'Etkinleştirme başarısız',
    message: safeLicenseMessage(result.error || result.state.message) || 'Lisans etkinleştirilemedi.'
  }
}

export function licenseTrialStartToast(state: LicenseClientState): ToastInput {
  const days = state.daysRemaining
  return {
    kind: 'success',
    id: 'license-trial-start',
    title: 'Deneme sürümü başladı',
    message:
      days != null
        ? `KoopPlus'ı ${days} gün boyunca ücretsiz kullanabilirsiniz.`
        : 'KoopPlus deneme sürümünüz başladı.'
  }
}

export function toastContainsSecret(value: string): boolean {
  return /activationPassword|aktivasyon şifresi:\s*\S+/i.test(value)
}

function safeLicenseMessage(message: string | null | undefined): string {
  const raw = (message ?? '').trim()
  if (!raw) return ''
  if (/[{[]/.test(raw) || /stack|at\s+\S+\s+\(/i.test(raw) || /https?:\/\//i.test(raw)) {
    return ''
  }
  return raw
}

export const TRIAL_ALREADY_USED_TITLE = 'Ücretsiz deneme daha önce kullanılmış'
export const TRIAL_ALREADY_USED_MESSAGE =
  'Bu cihaz, e-posta adresi veya telefon numarası ile KoopPlus ücretsiz denemesi daha önce kullanılmış.'
export const TRIAL_ALREADY_USED_HINT =
  "KoopPlus'ı kullanmaya devam etmek için lisansınızı etkinleştirebilir veya lisans satın alabilirsiniz."

export function trialAlreadyUsedDialogCopy(): {
  title: string
  description: string
  confirmLabel: string
  cancelLabel: string
  variant: 'warning'
} {
  return {
    title: TRIAL_ALREADY_USED_TITLE,
    description: `${TRIAL_ALREADY_USED_MESSAGE}\n\n${TRIAL_ALREADY_USED_HINT}`,
    confirmLabel: 'Lisansım Var',
    cancelLabel: 'Lisans Satın Al',
    variant: 'warning'
  }
}
