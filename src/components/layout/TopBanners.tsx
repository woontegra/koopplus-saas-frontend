import { useMemo } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { clearSession, loadSupportSession } from '../../auth/session'
import { formatDate } from '../../utils/format'
import { daysRemaining, USAGE_WARNING_DAYS } from '../../utils/usage'

/** Platform "Destek modu" (impersonate) üst banner'ı — platforma dön butonu ile. */
export function SupportBanner(): JSX.Element | null {
  const support = useMemo(() => loadSupportSession(), [])
  if (!support) return null

  const returnToPlatform = (): void => {
    // Tenant oturumunu (impersonate token) kapat; platform JWT ayrı anahtarda durur.
    clearSession()
    window.location.assign('/platform')
  }

  return (
    <div className="top-banner top-banner--support" role="status">
      <span>
        Destek modu — <strong>{support.tenantName || 'Kooperatif'}</strong> kooperatifinde platform
        yöneticisi olarak çalışıyorsunuz. İşlemler denetim kaydına yazılır.
      </span>
      <button type="button" className="top-banner__btn" onClick={returnToPlatform}>
        Platforma dön
      </button>
    </div>
  )
}

/** Kullanım süresi ≤7 gün (veya dolmuş) → o kooperatifin tüm kullanıcıları için uyarı. */
export function UsageExpiryBanner(): JSX.Element | null {
  const { activeMembership } = useAuth()
  const expiresAt = activeMembership?.tenant.usageExpiresAt ?? null
  const days = daysRemaining(expiresAt)
  if (days === null || days > USAGE_WARNING_DAYS) return null

  const over = days <= 0
  return (
    <div
      className={`top-banner ${over ? 'top-banner--expiry-over' : 'top-banner--expiry'}`}
      role="alert"
    >
      {over
        ? `Kullanım süreniz ${formatDate(expiresAt)} tarihinde doldu. Lütfen hizmet sağlayıcınızla iletişime geçin.`
        : `Kullanım süreniz ${days} gün içinde (${formatDate(expiresAt)}) dolacak. Kesinti yaşamamak için hizmet sağlayıcınızla iletişime geçin.`}
    </div>
  )
}
