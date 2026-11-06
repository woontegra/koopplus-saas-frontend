export const APP_CODE_KOOPPLUS_DESKTOP = 'KOOPPLUS_DESKTOP'

export const KOOPPLUS_DEVICE_SALT = 'woontegra-koopplus-desktop-v1'

export const LICENSE_PRODUCT_NAME = 'KoopPlus'

export const PAID_OFFLINE_GRACE_DAYS = 7
export const TRIAL_OFFLINE_GRACE_DAYS = 0

export const LICENSE_WARNING_THRESHOLDS = [30, 15, 7, 3, 1] as const
export const TRIAL_WARNING_THRESHOLDS = [3, 1] as const

export const PRODUCTION_LICENSE_API_HOST = 'lisans-server-backend-production.up.railway.app'
export const PRODUCTION_LICENSE_API_BASE = `https://${PRODUCTION_LICENSE_API_HOST}/api/public/license`

export type LicenseKind = 'none' | 'trial' | 'paid'

export type LicensePhase =
  | 'loading'
  | 'needs_choice'
  | 'trial_active'
  | 'license_active'
  | 'offline_grace'
  | 'needs_activation'
  | 'trial_already_used'
  | 'trial_expired'
  | 'license_expired'
  | 'locked'
  | 'server_unreachable'

export type LicenseLocalStatus = 'ACTIVE' | 'LOCKED' | 'NONE'

export type LicenseLocalRecord = {
  kind: 'trial' | 'paid'
  licenseKey: string | null
  deviceHash: string
  expiresAt: string | null
  lastValidatedAt: string | null
  offlineGraceUntil: string | null
  status: LicenseLocalStatus
  lastSeenAt: string | null
}

export type LicenseClientState = {
  phase: LicensePhase
  allowed: boolean
  kind: LicenseKind
  appCode: typeof APP_CODE_KOOPPLUS_DESKTOP
  daysRemaining: number | null
  expiresAt: string | null
  expiryLabel: string | null
  warningThreshold: number | null
  message: string
  maskedLicenseKey: string | null
  offlineDegraded: boolean
  code: string | null
  apiBase: string
}

export type LicenseActionResult = {
  ok: boolean
  state: LicenseClientState
  error?: string
  code?: string
}

export type LicenseActivateInput = {
  licenseKey: string
  activationPassword: string
}

export type LicenseStartTrialInput = {
  email: string
  phone: string
}

export type LicenseExternalNavResult = {
  ok: boolean
  error?: string
  code?: string
}

export type LicenseOverlayView = 'gate' | 'activate'

/** Ayarlar > Lisans ücretli aktivasyon aksiyonu yalnız canlı denemede görünür. */
export function canActivatePaidFromSettings(phase: LicensePhase): boolean {
  return phase === 'trial_active'
}

/** LicenseGate, trial/paid allowed olsa bile activate view'ı mevcut formu açar. */
export function shouldShowLicenseActivateOverlay(view: LicenseOverlayView): boolean {
  return view === 'activate'
}

export function shouldPersistLicenseAfterActivation(ok: boolean): boolean {
  return ok === true
}

export function licenseUiAfterActivationAttempt(
  ok: boolean,
  next: { kind: LicenseKind; phase: LicensePhase },
  previous: { kind: LicenseKind; phase: LicensePhase }
): { kind: LicenseKind; phase: LicensePhase; view: LicenseOverlayView } {
  if (ok) {
    return { kind: next.kind, phase: next.phase, view: 'gate' }
  }
  return { kind: previous.kind, phase: previous.phase, view: 'activate' }
}
