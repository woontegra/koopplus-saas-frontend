import { useCallback, useEffect, useMemo, useState } from 'react'
import DataPanel from '../../components/ui/DataPanel'
import EmptyState from '../../components/ui/EmptyState'
import { useActionToast } from '../../hooks/useActionToast'
import { useAskDialog } from '../../hooks/useAskDialog'
import PlatformModal from '../../platform/PlatformModal'
import {
  platformApi,
  platformErrorMessage,
  type PlatformAnnouncement,
  type PlatformAnnouncementKind,
  type PlatformTenant
} from '../../platform/platformApi'
import { formatDateTime } from '../../utils/format'
import { Badge, KIND_LABEL, KindBadge, PageHeader, toLocalDateTimeInput } from './platformUi'

function AnnouncementModal({
  tenants,
  onClose,
  onCreated
}: {
  tenants: PlatformTenant[]
  onClose: () => void
  onCreated: () => void
}): JSX.Element {
  const toast = useActionToast()
  const now = new Date()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [kind, setKind] = useState<PlatformAnnouncementKind>('INFO')
  const [startsAt, setStartsAt] = useState(toLocalDateTimeInput(now))
  const [endsAt, setEndsAt] = useState(toLocalDateTimeInput(new Date(now.getTime() + 7 * 86_400_000)))
  const [allTenants, setAllTenants] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [tenantSearch, setTenantSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const visibleTenants = useMemo(() => {
    const q = tenantSearch.trim().toLocaleLowerCase('tr-TR')
    return tenants.filter((t) => !q || t.name.toLocaleLowerCase('tr-TR').includes(q))
  }, [tenants, tenantSearch])

  const toggle = (id: string): void =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const submit = async (): Promise<void> => {
    if (!title.trim() || !body.trim()) return setError('Başlık ve metin zorunludur.')
    const s = new Date(startsAt)
    const e = new Date(endsAt)
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return setError('Başlangıç/bitiş tarihi geçersiz.')
    if (e <= s) return setError('Bitiş, başlangıçtan sonra olmalıdır.')
    if (!allTenants && selected.size === 0) return setError('En az bir kooperatif seçin veya tümünü hedefleyin.')
    setSaving(true)
    setError('')
    try {
      await platformApi.createAnnouncement({
        title: title.trim(),
        body: body.trim(),
        kind,
        startsAt: s.toISOString(),
        endsAt: e.toISOString(),
        allTenants,
        ...(allTenants ? {} : { tenantIds: [...selected] })
      })
      toast.success('Duyuru yayınlandı', title.trim())
      onCreated()
      onClose()
    } catch (err) {
      setError(platformErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <PlatformModal
      wide
      title="Yeni Duyuru"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-sm" onClick={onClose}>
            İptal
          </button>
          <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void submit()}>
            {saving ? 'Yayınlanıyor...' : 'Yayınla'}
          </button>
        </>
      }
    >
      {error && <div className="alert alert-error">{error}</div>}
      <div className="form-grid form-grid--2">
        <div className="form-group form-group--wide">
          <label>Başlık *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} autoFocus />
        </div>
        <div className="form-group form-group--wide">
          <label>Metin *</label>
          <textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Tür</label>
          <select value={kind} onChange={(e) => setKind(e.target.value as PlatformAnnouncementKind)}>
            {(Object.keys(KIND_LABEL) as PlatformAnnouncementKind[]).map((k) => (
              <option key={k} value={k}>
                {KIND_LABEL[k]}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group" />
        <div className="form-group">
          <label>Başlangıç</label>
          <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Bitiş</label>
          <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
        </div>
      </div>

      <label className="platform-check">
        <input type="checkbox" checked={allTenants} onChange={(e) => setAllTenants(e.target.checked)} />
        Tüm kooperatiflere göster
      </label>

      {!allTenants && (
        <div className="pf-tenant-picker">
          <input
            className="platform-search"
            style={{ width: '100%' }}
            type="search"
            placeholder="Kooperatif ara..."
            value={tenantSearch}
            onChange={(e) => setTenantSearch(e.target.value)}
          />
          <div className="pf-tenant-picker__list">
            {visibleTenants.map((t) => (
              <label key={t.id} className="platform-check" style={{ margin: '2px 0' }}>
                <input type="checkbox" checked={selected.has(t.id)} onChange={() => toggle(t.id)} />
                {t.name}
              </label>
            ))}
            {visibleTenants.length === 0 && <span className="platform-muted">Kooperatif bulunamadı.</span>}
          </div>
          <span className="platform-muted">{selected.size} kooperatif seçili</span>
        </div>
      )}
    </PlatformModal>
  )
}

type AnnState = 'active' | 'scheduled' | 'expired'

function annState(a: PlatformAnnouncement, now = Date.now()): AnnState {
  if (new Date(a.endsAt).getTime() < now) return 'expired'
  if (new Date(a.startsAt).getTime() > now) return 'scheduled'
  return 'active'
}

export default function PlatformAnnouncementsPage(): JSX.Element {
  const toast = useActionToast()
  const ask = useAskDialog()
  const [rows, setRows] = useState<PlatformAnnouncement[]>([])
  const [tenants, setTenants] = useState<PlatformTenant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [a, t] = await Promise.all([platformApi.listAnnouncements(), platformApi.listTenants()])
      setRows(a)
      setTenants(t)
    } catch (err) {
      setError(platformErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const tenantName = (id: string): string => tenants.find((t) => t.id === id)?.name ?? id

  const remove = async (a: PlatformAnnouncement): Promise<void> => {
    const ok = await ask.confirm(`“${a.title}” duyurusu silinecek.`, {
      title: 'Duyuruyu Sil',
      confirmLabel: 'Sil',
      variant: 'danger'
    })
    if (!ok) return
    try {
      await platformApi.deleteAnnouncement(a.id)
      toast.success('Duyuru silindi', a.title)
      void load()
    } catch (err) {
      toast.fail('Duyuru silinemedi', platformErrorMessage(err))
    }
  }

  return (
    <div className="pf-page">
      <PageHeader
        title="Duyurular"
        subtitle="Kooperatif kullanıcılarına üst şeritte gösterilir"
        actions={
          <>
            <button type="button" className="btn btn-sm" onClick={() => void load()} disabled={loading}>
              Yenile
            </button>
            <button type="button" className="btn btn-sm btn-primary" onClick={() => setCreating(true)}>
              Yeni Duyuru
            </button>
          </>
        }
      />
      <DataPanel title="Tüm Duyurular" noPadding>
        {error && <div className="alert alert-error platform-inline-alert">{error}</div>}
        {loading && rows.length === 0 ? (
          <div className="page-loading">Yükleniyor...</div>
        ) : rows.length === 0 ? (
          <EmptyState message="Henüz duyuru yok." compact />
        ) : (
          <div className="table-wrap table-wrap--compact table-wrap--scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Başlık</th>
                  <th>Tür</th>
                  <th>Durum</th>
                  <th>Yayın Aralığı</th>
                  <th>Hedef</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => {
                  const st = annState(a)
                  return (
                    <tr key={a.id}>
                      <td>
                        <strong>{a.title}</strong>
                        <div className="platform-muted pf-ann-body">{a.body}</div>
                      </td>
                      <td>
                        <KindBadge kind={a.kind} />
                      </td>
                      <td>
                        <Badge tone={st === 'active' ? 'green' : st === 'scheduled' ? 'blue' : 'gray'}>
                          {st === 'active' ? 'Yayında' : st === 'scheduled' ? 'Planlı' : 'Bitti'}
                        </Badge>
                      </td>
                      <td>
                        {formatDateTime(a.startsAt)}
                        <br />
                        <span className="platform-muted">→ {formatDateTime(a.endsAt)}</span>
                      </td>
                      <td>
                        {a.allTenants ? (
                          <Badge tone="navy">Tüm kooperatifler</Badge>
                        ) : (
                          <span title={a.tenantIds.map(tenantName).join(', ')}>{a.tenantIds.length} kooperatif</span>
                        )}
                      </td>
                      <td>
                        <button type="button" className="btn btn-sm btn-danger" onClick={() => void remove(a)}>
                          Sil
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </DataPanel>

      {creating && <AnnouncementModal tenants={tenants} onClose={() => setCreating(false)} onCreated={() => void load()} />}
    </div>
  )
}
