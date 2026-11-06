import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { clearSession, loadSupportSession } from '../../auth/session'
import { fetchTenantAnnouncements, type TenantAnnouncement } from '../../platform/platformApi'
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

const DISMISSED_KEY = 'koopplus.saas.dismissedAnnouncements'
const ANNOUNCEMENT_REFRESH_MS = 5 * 60_000

function loadDismissed(): string[] {
  try {
    const raw = sessionStorage.getItem(DISMISSED_KEY)
    const parsed = raw ? (JSON.parse(raw) as unknown) : []
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

const KIND_CLASS: Record<TenantAnnouncement['kind'], string> = {
  INFO: 'top-banner--info',
  WARNING: 'top-banner--warning',
  MAINTENANCE: 'top-banner--maintenance'
}

/** Platform duyuruları (bilgi / uyarı / bakım) — her biri oturum boyunca kapatılabilir. */
export function AnnouncementBanners(): JSX.Element | null {
  const { tenantId, user } = useAuth()
  const [items, setItems] = useState<TenantAnnouncement[]>([])
  const [dismissed, setDismissed] = useState<string[]>(loadDismissed)

  useEffect(() => {
    if (!tenantId || !user) {
      setItems([])
      return
    }
    let alive = true
    const load = (): void => {
      fetchTenantAnnouncements(tenantId)
        .then((rows) => {
          if (alive) setItems(Array.isArray(rows) ? rows : [])
        })
        .catch(() => undefined)
    }
    load()
    const timer = setInterval(load, ANNOUNCEMENT_REFRESH_MS)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [tenantId, user])

  const dismiss = useCallback((id: string) => {
    setDismissed((prev) => {
      const next = prev.includes(id) ? prev : [...prev, id]
      try {
        sessionStorage.setItem(DISMISSED_KEY, JSON.stringify(next))
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  const visible = items.filter((a) => !dismissed.includes(a.id))
  if (visible.length === 0) return null

  return (
    <>
      {visible.map((a) => (
        <div
          key={a.id}
          className={`top-banner ${KIND_CLASS[a.kind] ?? KIND_CLASS.INFO}`}
          role={a.kind === 'INFO' ? 'status' : 'alert'}
        >
          <span className="top-banner__text">
            <strong>{a.title}</strong> — {a.body}
          </span>
          <button type="button" className="top-banner__btn" onClick={() => dismiss(a.id)} aria-label="Duyuruyu kapat">
            Kapat
          </button>
        </div>
      ))}
    </>
  )
}
