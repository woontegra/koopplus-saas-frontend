import { useCallback, useState, type ReactNode } from 'react'
import { saveSupportSession, saveTenantId, saveToken } from '../../auth/session'
import { useActionToast } from '../../hooks/useActionToast'
import { useAskDialog } from '../../hooks/useAskDialog'
import {
  platformApi,
  platformErrorMessage,
  type PlatformAnnouncementKind,
  type PlatformTenantStatus,
  type PlatformUserRole
} from '../../platform/platformApi'
import { daysRemaining } from '../../utils/usage'

export const STATUS_LABEL: Record<PlatformTenantStatus, string> = {
  ACTIVE: 'Aktif',
  SUSPENDED: 'Askıda',
  ARCHIVED: 'Arşiv'
}

export const ROLE_LABEL: Record<PlatformUserRole, string> = {
  ADMIN: 'Yönetici',
  STAFF: 'İşlem Yetkilisi',
  VIEWER: 'Sadece Görüntüleme'
}

export const KIND_LABEL: Record<PlatformAnnouncementKind, string> = {
  INFO: 'Bilgi',
  WARNING: 'Uyarı',
  MAINTENANCE: 'Bakım'
}

export type BadgeTone = 'green' | 'yellow' | 'red' | 'blue' | 'gray' | 'navy'

export function Badge({ tone, children }: { tone: BadgeTone; children: ReactNode }): JSX.Element {
  return <span className={`pf-badge pf-badge--${tone}`}>{children}</span>
}

export function TenantStatusBadge({ status }: { status: PlatformTenantStatus }): JSX.Element {
  const tone: BadgeTone = status === 'ACTIVE' ? 'green' : status === 'SUSPENDED' ? 'red' : 'gray'
  return <Badge tone={tone}>{STATUS_LABEL[status] ?? status}</Badge>
}

export function KindBadge({ kind }: { kind: PlatformAnnouncementKind }): JSX.Element {
  const tone: BadgeTone = kind === 'WARNING' ? 'yellow' : kind === 'MAINTENANCE' ? 'red' : 'blue'
  return <Badge tone={tone}>{KIND_LABEL[kind] ?? kind}</Badge>
}

export function RoleBadge({ role }: { role: PlatformUserRole }): JSX.Element {
  return <Badge tone={role === 'ADMIN' ? 'navy' : role === 'STAFF' ? 'blue' : 'gray'}>{ROLE_LABEL[role] ?? role}</Badge>
}

/** Kalan gün rengi: 30+ yeşil, 8–30 sarı, 0–7 kırmızı. */
export function daysTone(days: number | null): BadgeTone {
  if (days === null) return 'gray'
  if (days >= 30) return 'green'
  if (days >= 8) return 'yellow'
  return 'red'
}

export function DaysLeftBadge({ days }: { days: number | null }): JSX.Element {
  if (days === null) return <Badge tone="gray">Sınırsız</Badge>
  if (days <= 0) return <Badge tone="red">Süre doldu</Badge>
  return <Badge tone={daysTone(days)}>{days} gün</Badge>
}

/** Demo ise demoExpiresAt, değilse usageExpiresAt. */
export function effectiveExpiry(t: {
  isDemo?: boolean
  usageExpiresAt: string | null
  demoExpiresAt?: string | null
}): string | null {
  return t.isDemo ? (t.demoExpiresAt ?? null) : t.usageExpiresAt
}

export function tenantDaysLeft(t: {
  isDemo?: boolean
  usageExpiresAt: string | null
  demoExpiresAt?: string | null
}): number | null {
  return daysRemaining(effectiveExpiry(t))
}

export function TypeBadge({ isDemo }: { isDemo?: boolean }): JSX.Element {
  return isDemo ? <Badge tone="yellow">Demo</Badge> : <Badge tone="navy">Yıllık</Badge>
}

export function toDateInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Seçilen günün sonunu (yerel) ISO olarak döndürür. */
export function endOfDayIso(dateInput: string): string {
  return new Date(`${dateInput}T23:59:59`).toISOString()
}

export function toLocalDateTimeInput(d: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function formatBytes(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  if (n < 1024) return `${n} B`
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`
  return `${(n / 1024 ** 3).toFixed(2)} GB`
}

export function formatUptime(sec: number): string {
  const d = Math.floor(sec / 86400)
  const h = Math.floor((sec % 86400) / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (d > 0) return `${d} g ${h} sa`
  if (h > 0) return `${h} sa ${m} dk`
  return `${m} dk`
}

export function detailText(detail: unknown): string {
  if (detail && typeof detail === 'object' && Object.keys(detail as object).length > 0) {
    return JSON.stringify(detail)
  }
  return '—'
}

export function PageHeader({
  title,
  subtitle,
  actions
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
}): JSX.Element {
  return (
    <div className="pf-page-head">
      <div>
        <h1 className="pf-page-head__title">{title}</h1>
        {subtitle && <p className="pf-page-head__sub">{subtitle}</p>}
      </div>
      {actions && <div className="pf-page-head__actions">{actions}</div>}
    </div>
  )
}

export function Pagination({
  page,
  pageSize,
  total,
  onChange
}: {
  page: number
  pageSize: number
  total: number
  onChange: (page: number) => void
}): JSX.Element | null {
  const pages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)))
  if (total <= pageSize) return null
  return (
    <div className="pf-pagination">
      <span className="platform-muted">
        {total} kayıt · Sayfa {page}/{pages}
      </span>
      <div className="pf-pagination__btns">
        <button type="button" className="btn btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          Önceki
        </button>
        <button type="button" className="btn btn-sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>
          Sonraki
        </button>
      </div>
    </div>
  )
}

/** Destek modunda (impersonate) kooperatife girer. */
export function useEnterSupport(): {
  busyId: string | null
  enterSupport: (tenant: { id: string; name: string }) => Promise<void>
} {
  const toast = useActionToast()
  const ask = useAskDialog()
  const [busyId, setBusyId] = useState<string | null>(null)

  const enterSupport = useCallback(
    async (t: { id: string; name: string }): Promise<void> => {
      const ok = await ask.confirm(
        `“${t.name}” kooperatifine destek modunda girilecek. Tüm işlemler denetim kaydına yazılır.`,
        { title: 'Destek Modu', confirmLabel: 'Gir', variant: 'warning' }
      )
      if (!ok) return
      setBusyId(t.id)
      try {
        const res = await platformApi.impersonate(t.id)
        const tenantId = res.tenant?.id ?? res.tenantId ?? t.id
        saveToken(res.token)
        saveTenantId(tenantId)
        saveSupportSession({
          tenantId,
          tenantName: res.tenant?.name ?? res.tenantName ?? t.name,
          startedAt: new Date().toISOString()
        })
        window.location.assign('/')
      } catch (err) {
        toast.fail('Destek modu başlatılamadı', platformErrorMessage(err))
        setBusyId(null)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [toast]
  )

  return { busyId, enterSupport }
}
