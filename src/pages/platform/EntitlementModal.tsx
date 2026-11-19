/**
 * Platform paneli: kullanıcının kooperatif hakkını görüntüle / artır / azalt.
 * Sebep zorunlu; işlem platform denetim kaydına yazılır.
 */
import { useCallback, useEffect, useState } from 'react'
import DataPanel from '../../components/ui/DataPanel'
import PlatformModal from '../../platform/PlatformModal'
import {
  platformApi,
  platformErrorMessage,
  type PlatformEntitlementSummary,
  type PlatformTenantEntitlementOwner
} from '../../platform/platformApi'
import { useActionToast } from '../../hooks/useActionToast'
import { formatDate } from '../../utils/format'

function sourceLabel(kind: string, ref: string | null): string {
  if (kind === 'WEBSITE_ORDER') return ref ? `Web sitesi sipariş #${ref}` : 'Web sitesi siparişi'
  if (kind === 'MANUAL') return 'Elle verildi'
  return kind
}

export function EntitlementBadge({
  entitlement
}: {
  entitlement: { total: number; used: number; remaining: number } | null | undefined
}): JSX.Element {
  if (!entitlement || entitlement.total === 0) return <span className="platform-muted">—</span>
  return (
    <span title={`Toplam ${entitlement.total}, kullanılan ${entitlement.used}, kalan ${entitlement.remaining}`}>
      {entitlement.used} / {entitlement.total}
      <span className="platform-muted"> (kalan {entitlement.remaining})</span>
    </span>
  )
}

export default function EntitlementModal({
  user,
  onClose,
  onSaved
}: {
  user: { id: string; email: string; fullName?: string }
  onClose: () => void
  onSaved?: () => void
}): JSX.Element {
  const toast = useActionToast()
  const [summary, setSummary] = useState<PlatformEntitlementSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<'add' | 'remove'>('add')
  const [count, setCount] = useState('1')
  const [expiresAt, setExpiresAt] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const s = await platformApi.getUserEntitlements(user.id)
        if (alive) setSummary(s)
      } catch (err) {
        if (alive) setError(platformErrorMessage(err))
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [user.id])

  const submit = async (): Promise<void> => {
    const n = Math.trunc(Number(count))
    if (!Number.isFinite(n) || n < 1 || n > 100) return setError('Adet 1–100 arasında olmalıdır.')
    if (reason.trim().length < 3) return setError('Sebep zorunludur.')
    if (mode === 'remove' && summary && n > summary.remaining) {
      return setError(`En fazla ${summary.remaining} kullanılmamış hak düşülebilir.`)
    }
    setSaving(true)
    setError('')
    try {
      const next = await platformApi.adjustUserEntitlements(user.id, {
        delta: mode === 'add' ? n : -n,
        reason: reason.trim(),
        ...(mode === 'add' && expiresAt ? { expiresAt: `${expiresAt}T23:59:59.000+03:00` } : {})
      })
      setSummary(next)
      setReason('')
      toast.success('Kooperatif hakkı güncellendi', `${user.email}: ${mode === 'add' ? '+' : '−'}${n}`)
      onSaved?.()
    } catch (err) {
      setError(platformErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <PlatformModal
      title={`Kooperatif Hakkı — ${user.fullName || user.email}`}
      onClose={onClose}
      wide
      footer={
        <>
          <button type="button" className="btn btn-sm" onClick={onClose}>
            Kapat
          </button>
          <button type="button" className="btn btn-primary" disabled={saving || loading} onClick={() => void submit()}>
            {saving ? 'Kaydediliyor...' : mode === 'add' ? 'Hak Ekle' : 'Hak Düş'}
          </button>
        </>
      }
    >
      {error && <div className="alert alert-error">{error}</div>}
      {loading ? (
        <div className="page-loading">Yükleniyor...</div>
      ) : summary ? (
        <>
          <p style={{ marginTop: 0 }}>
            <strong>{user.email}</strong> — Toplam: <strong>{summary.total}</strong> · Kullanılan:{' '}
            <strong>{summary.used}</strong> · Kalan: <strong>{summary.remaining}</strong>
            {summary.nextExpiresAt ? ` · En yakın bitiş: ${formatDate(summary.nextExpiresAt)}` : ''}
          </p>
          {summary.grants.length > 0 && (
            <div className="table-wrap table-wrap--compact" style={{ marginBottom: 12 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Kaynak</th>
                    <th className="text-right">Toplam</th>
                    <th className="text-right">Kullanılan</th>
                    <th>Bitiş</th>
                    <th>Not</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.grants.map((g) => (
                    <tr key={g.id} className={g.active ? undefined : 'platform-muted'}>
                      <td>{sourceLabel(g.sourceKind, g.sourceRef)}</td>
                      <td className="text-right">{g.totalSlots}</td>
                      <td className="text-right">{g.usedSlots}</td>
                      <td>
                        {formatDate(g.expiresAt)}
                        {g.active ? '' : ' (süresi doldu)'}
                      </td>
                      <td>{g.note || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}

      <div className="platform-segment" role="tablist">
        <button
          type="button"
          className={`platform-segment__item${mode === 'add' ? ' is-active' : ''}`}
          onClick={() => setMode('add')}
        >
          Hak ekle
        </button>
        <button
          type="button"
          className={`platform-segment__item${mode === 'remove' ? ' is-active' : ''}`}
          onClick={() => setMode('remove')}
        >
          Hak düş
        </button>
      </div>
      <div className="form-grid">
        <div className="form-group">
          <label>Adet</label>
          <input type="number" min={1} max={100} value={count} onChange={(e) => setCount(e.target.value)} />
        </div>
        {mode === 'add' && (
          <div className="form-group">
            <label>Geçerlilik bitişi (boşsa 1 yıl)</label>
            <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
          </div>
        )}
      </div>
      <div className="form-group">
        <label>Sebep (zorunlu, denetim kaydına yazılır)</label>
        <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
      </div>
      {mode === 'remove' && (
        <p className="platform-muted" style={{ marginBottom: 0 }}>
          Yalnızca kullanılmamış haklar düşülür; haktan açılmış kooperatifler etkilenmez.
        </p>
      )}
    </PlatformModal>
  )
}

/** Kooperatif detayı: yöneticilerin kooperatif hakkı (hesap bazında). */
export function TenantEntitlementPanel({ tenantId }: { tenantId: string }): JSX.Element {
  const [owners, setOwners] = useState<PlatformTenantEntitlementOwner[] | null>(null)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<PlatformTenantEntitlementOwner | null>(null)

  const load = useCallback(async () => {
    setError('')
    try {
      setOwners(await platformApi.getTenantEntitlements(tenantId))
    } catch (err) {
      setError(platformErrorMessage(err))
    }
  }, [tenantId])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <DataPanel
      title="Kooperatif Hakkı"
      subtitle="Bu kooperatifin yöneticilerinin kendi açabileceği ek kooperatif sayısı (hesap bazında)"
      noPadding
    >
      {error && <div className="alert alert-error platform-inline-alert">{error}</div>}
      {!owners ? (
        <div className="page-loading">Yükleniyor...</div>
      ) : owners.length === 0 ? (
        <p className="platform-muted" style={{ padding: 12, margin: 0 }}>
          Yönetici bulunamadı.
        </p>
      ) : (
        <div className="table-wrap table-wrap--compact">
          <table className="data-table">
            <thead>
              <tr>
                <th>Yönetici</th>
                <th>Hak (kullanılan / toplam)</th>
                <th>En yakın bitiş</th>
                <th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {owners.map((o) => (
                <tr key={o.userId}>
                  <td>
                    <strong>{o.fullName}</strong>
                    <div className="cell-mono platform-muted">{o.email}</div>
                  </td>
                  <td>
                    <EntitlementBadge entitlement={o.entitlement} />
                  </td>
                  <td>{o.entitlement?.nextExpiresAt ? formatDate(o.entitlement.nextExpiresAt) : '—'}</td>
                  <td>
                    <button type="button" className="btn btn-sm" onClick={() => setEditing(o)}>
                      Düzenle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing && (
        <EntitlementModal
          user={{ id: editing.userId, email: editing.email, fullName: editing.fullName }}
          onClose={() => setEditing(null)}
          onSaved={() => void load()}
        />
      )}
    </DataPanel>
  )
}
