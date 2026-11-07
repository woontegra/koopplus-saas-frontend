import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import DataPanel from '../../components/ui/DataPanel'
import DesktopTabs from '../../components/ui/DesktopTabs'
import EmptyState from '../../components/ui/EmptyState'
import StatPanel from '../../components/ui/StatPanel'
import { useActionToast } from '../../hooks/useActionToast'
import {
  platformApi,
  platformErrorMessage,
  type PlatformCriticalLog,
  type PlatformLoginAttempt,
  type PlatformTenantDetail,
  type PlatformTenantSettings,
  type PlatformUsageExtension
} from '../../platform/platformApi'
import { formatDate, formatDateTime } from '../../utils/format'
import { BackupModal, DeleteTenantModal, ExtendModal, RestoreModal, StatusModal } from './TenantModals'
import TenantUsersPanel from './TenantUsersPanel'
import {
  Badge,
  DaysLeftBadge,
  PageHeader,
  TenantStatusBadge,
  TypeBadge,
  detailText,
  effectiveExpiry,
  useEnterSupport
} from './platformUi'

type DetailTab = 'general' | 'users' | 'extensions' | 'logins' | 'critical' | 'emails'

type Dialog = 'extend' | 'status' | 'backup' | 'restore' | 'delete' | null

const EMPTY_SETTINGS: PlatformTenantSettings = {
  cooperativeName: '',
  taxId: '',
  authorizedPerson: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  district: ''
}

/* ------------------------------ Lisans kutusu ------------------------------ */

function LicensePanel({ tenant, onChanged }: { tenant: PlatformTenantDetail; onChanged: () => void }): JSX.Element {
  const toast = useActionToast()
  const [busy, setBusy] = useState(false)
  const activated = Boolean(tenant.licenseActivatedAt)

  const copyKey = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(tenant.licenseKey)
      toast.success('Kopyalandı', 'Lisans anahtarı panoya alındı.')
    } catch {
      toast.fail('Kopyalanamadı', 'Tarayıcı panoya izin vermedi.')
    }
  }

  const regenerate = async (): Promise<void> => {
    if (
      !window.confirm(
        'Yeni lisans anahtarı üretilecek; eski anahtar geçersiz olur ve kooperatif yeniden etkinleştirme bekler. Devam?'
      )
    ) {
      return
    }
    setBusy(true)
    try {
      await platformApi.regenerateLicense(tenant.id)
      toast.success('Yeni anahtar üretildi', 'Eski anahtar geçersiz.')
      onChanged()
    } catch (err) {
      toast.fail('Anahtar üretilemedi', platformErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const resend = async (): Promise<void> => {
    setBusy(true)
    try {
      const res = await platformApi.resendWelcomeEmail(tenant.id)
      if (res.email.ok) {
        toast.success('E-posta gönderildi', res.admin.email)
      } else {
        toast.warn(
          'E-posta gönderilemedi',
          `${res.email.error || 'SMTP hatası'}${
            res.admin.temporaryPassword ? ` · Geçici şifre: ${res.admin.temporaryPassword}` : ''
          }`
        )
      }
      onChanged()
    } catch (err) {
      toast.fail('Gönderilemedi', platformErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <DataPanel
      title="Lisans"
      actions={
        <>
          <button type="button" className="btn btn-sm" disabled={busy} onClick={() => void copyKey()}>
            Kopyala
          </button>
          <button type="button" className="btn btn-sm" disabled={busy} onClick={() => void regenerate()}>
            Yeni anahtar üret
          </button>
          <button type="button" className="btn btn-sm btn-soft-primary" disabled={busy} onClick={() => void resend()}>
            Hoş geldin e-postasını yeniden gönder
          </button>
        </>
      }
    >
      <div className="form-grid form-grid--2">
        <div className="form-group form-group--wide">
          <label>Lisans anahtarı</label>
          <code style={{ fontSize: 14 }}>{tenant.licenseKey}</code>
        </div>
        <div className="form-group">
          <label>Durum</label>
          <div>
            {activated ? (
              <Badge tone="green">Etkinleştirildi · {formatDateTime(tenant.licenseActivatedAt)}</Badge>
            ) : (
              <Badge tone="yellow">Bekliyor</Badge>
            )}
          </div>
        </div>
      </div>
    </DataPanel>
  )
}

function EmailsTab({ tenant }: { tenant: PlatformTenantDetail }): JSX.Element {
  const rows = tenant.emailLogs ?? []
  if (rows.length === 0) return <EmptyState message="Henüz e-posta kaydı yok." compact />
  return (
    <DataPanel title="E-posta kayıtları">
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Tarih</th>
              <th>Kime</th>
              <th>Tür</th>
              <th>Konu</th>
              <th>Durum</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{formatDateTime(r.createdAt)}</td>
                <td>{r.toEmail}</td>
                <td>{r.kind}</td>
                <td>{r.subject}</td>
                <td title={r.error ?? undefined}>
                  {r.success ? <Badge tone="green">Başarılı</Badge> : <Badge tone="red">Başarısız</Badge>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DataPanel>
  )
}

/* ------------------------------ Genel sekmesi ------------------------------ */

function GeneralTab({ tenant, onSaved }: { tenant: PlatformTenantDetail; onSaved: () => void }): JSX.Element {
  const toast = useActionToast()
  const [name, setName] = useState(tenant.name)
  const [notes, setNotes] = useState(tenant.platformNotes ?? '')
  const [maxUsers, setMaxUsers] = useState(tenant.maxUsers != null ? String(tenant.maxUsers) : '')
  const [maxMembers, setMaxMembers] = useState(tenant.maxMembers != null ? String(tenant.maxMembers) : '')
  const [settings, setSettings] = useState<PlatformTenantSettings>({ ...EMPTY_SETTINGS, ...(tenant.settings ?? {}) })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const setField = (key: keyof PlatformTenantSettings, value: string): void =>
    setSettings((s) => ({ ...s, [key]: value }))

  const parseLimit = (raw: string, label: string): number | null => {
    if (!raw.trim()) return null
    const n = Math.trunc(Number(raw))
    if (!Number.isFinite(n) || n < 1) throw new Error(`${label} 1 veya daha büyük olmalıdır (boş = sınırsız).`)
    return n
  }

  const save = async (): Promise<void> => {
    setSaving(true)
    setError('')
    try {
      if (!name.trim()) throw new Error('Kooperatif adı boş olamaz.')
      await platformApi.patchTenant(tenant.id, {
        name: name.trim(),
        platformNotes: notes,
        maxUsers: parseLimit(maxUsers, 'Kullanıcı limiti'),
        maxMembers: parseLimit(maxMembers, 'Üye limiti'),
        settings
      })
      toast.success('Kaydedildi', name.trim())
      onSaved()
    } catch (err) {
      setError(platformErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="pf-stack" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <LicensePanel tenant={tenant} onChanged={onSaved} />
      <div className="pf-grid-2">
      <DataPanel
        title="Kooperatif Bilgileri"
        actions={
          <button type="button" className="btn btn-sm btn-primary" disabled={saving} onClick={() => void save()}>
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        }
      >
        {error && <div className="alert alert-error">{error}</div>}
        <div className="form-grid form-grid--2">
          <div className="form-group form-group--wide">
            <label>Kooperatif Adı</label>
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Vergi No</label>
            <input value={settings.taxId} onChange={(e) => setField('taxId', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Yetkili Kişi</label>
            <input value={settings.authorizedPerson} onChange={(e) => setField('authorizedPerson', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Telefon</label>
            <input value={settings.phone} onChange={(e) => setField('phone', e.target.value)} />
          </div>
          <div className="form-group">
            <label>E-posta</label>
            <input value={settings.email} onChange={(e) => setField('email', e.target.value)} />
          </div>
          <div className="form-group">
            <label>İl</label>
            <input value={settings.city} onChange={(e) => setField('city', e.target.value)} />
          </div>
          <div className="form-group">
            <label>İlçe</label>
            <input value={settings.district} onChange={(e) => setField('district', e.target.value)} />
          </div>
          <div className="form-group form-group--wide">
            <label>Adres</label>
            <input value={settings.address} onChange={(e) => setField('address', e.target.value)} />
          </div>
        </div>
      </DataPanel>

      <DataPanel title="Platform Ayarları" subtitle="Yalnız platform yöneticisi görür">
        <div className="form-grid form-grid--2">
          <div className="form-group">
            <label>Kullanıcı limiti (boş = sınırsız)</label>
            <input type="number" min={1} value={maxUsers} onChange={(e) => setMaxUsers(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Üye limiti (boş = sınırsız)</label>
            <input type="number" min={1} value={maxMembers} onChange={(e) => setMaxMembers(e.target.value)} />
          </div>
          <div className="form-group form-group--wide">
            <label>Platform notları</label>
            <textarea rows={6} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
      </DataPanel>
      </div>
    </div>
  )
}

/* --------------------------- Süre geçmişi sekmesi --------------------------- */

function ExtensionsTab({ tenantId, reloadKey }: { tenantId: string; reloadKey: number }): JSX.Element {
  const [rows, setRows] = useState<PlatformUsageExtension[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError('')
    platformApi
      .listExtensions(tenantId)
      .then((r) => alive && setRows(r))
      .catch((e) => alive && setError(platformErrorMessage(e)))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [tenantId, reloadKey])

  return (
    <DataPanel title="Süre Uzatma Geçmişi" noPadding>
      {error && <div className="alert alert-error platform-inline-alert">{error}</div>}
      {loading ? (
        <div className="page-loading">Yükleniyor...</div>
      ) : rows.length === 0 ? (
        <EmptyState message="Henüz süre uzatma kaydı yok." compact />
      ) : (
        <div className="table-wrap table-wrap--compact table-wrap--scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Eski Bitiş</th>
                <th>Yeni Bitiş</th>
                <th className="text-right">Eklenen Gün</th>
                <th>Not</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{formatDateTime(r.createdAt)}</td>
                  <td>{r.oldExpiresAt ? formatDate(r.oldExpiresAt) : '—'}</td>
                  <td>{r.newExpiresAt ? formatDate(r.newExpiresAt) : 'Sınırsız'}</td>
                  <td className="text-right">+{r.daysAdded}</td>
                  <td>{r.note || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DataPanel>
  )
}

/* --------------------------- Giriş geçmişi sekmesi -------------------------- */

function LoginsTab({ tenantId }: { tenantId: string }): JSX.Element {
  const [rows, setRows] = useState<PlatformLoginAttempt[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'all' | 'ok' | 'fail'>('all')
  const [q, setQ] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setRows(
        await platformApi.loginHistory(tenantId, {
          success: filter === 'all' ? undefined : filter === 'ok',
          q,
          limit: 200
        })
      )
    } catch (err) {
      setError(platformErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [tenantId, filter, q])

  useEffect(() => {
    const t = setTimeout(() => void load(), 250)
    return () => clearTimeout(t)
  }, [load])

  return (
    <DataPanel
      title="Giriş Geçmişi"
      subtitle="Son 200 deneme"
      noPadding
      actions={
        <>
          <input
            className="platform-search"
            type="search"
            placeholder="E-posta ara..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select className="platform-filter" value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
            <option value="all">Tümü</option>
            <option value="ok">Başarılı</option>
            <option value="fail">Başarısız</option>
          </select>
        </>
      }
    >
      {error && <div className="alert alert-error platform-inline-alert">{error}</div>}
      {loading && rows.length === 0 ? (
        <div className="page-loading">Yükleniyor...</div>
      ) : rows.length === 0 ? (
        <EmptyState message="Kayıt bulunamadı." compact />
      ) : (
        <div className="table-wrap table-wrap--compact table-wrap--scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tarih</th>
                <th>E-posta</th>
                <th>Sonuç</th>
                <th>IP</th>
                <th>Sebep</th>
                <th>Tarayıcı</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{formatDateTime(r.createdAt)}</td>
                  <td className="cell-mono">{r.email}</td>
                  <td>
                    <Badge tone={r.success ? 'green' : 'red'}>{r.success ? 'Başarılı' : 'Başarısız'}</Badge>
                  </td>
                  <td className="cell-mono">{r.ip || '—'}</td>
                  <td>{r.reason || '—'}</td>
                  <td className="cell-ellipsis" title={r.userAgent ?? ''}>
                    {r.userAgent || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DataPanel>
  )
}

/* ---------------------------- Kritik log sekmesi ---------------------------- */

function CriticalTab({ tenantId }: { tenantId: string }): JSX.Element {
  const [rows, setRows] = useState<PlatformCriticalLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setRows(await platformApi.criticalLogs(tenantId, 200))
    } catch (err) {
      setError(platformErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <DataPanel
      title="Kritik İşlem Kayıtları"
      subtitle="Son 200 kayıt"
      noPadding
      actions={
        <button type="button" className="btn btn-sm" onClick={() => void load()}>
          Yenile
        </button>
      }
    >
      {error && <div className="alert alert-error platform-inline-alert">{error}</div>}
      {loading ? (
        <div className="page-loading">Yükleniyor...</div>
      ) : rows.length === 0 ? (
        <EmptyState message="Kritik işlem kaydı yok." compact />
      ) : (
        <div className="table-wrap table-wrap--compact table-wrap--scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Kullanıcı</th>
                <th>İşlem</th>
                <th>Ayrıntı</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{formatDateTime(r.createdAt)}</td>
                  <td>{r.user ? r.user.email : '—'}</td>
                  <td className="cell-mono">{r.action}</td>
                  <td className="cell-ellipsis" title={detailText(r.detail)}>
                    {detailText(r.detail)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DataPanel>
  )
}

/* ---------------------------------- Sayfa ---------------------------------- */

export default function PlatformTenantDetailPage(): JSX.Element {
  const { id = '' } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { busyId, enterSupport } = useEnterSupport()
  const [tenant, setTenant] = useState<PlatformTenantDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<DetailTab>('general')
  const [dialog, setDialog] = useState<Dialog>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setTenant(await platformApi.getTenant(id))
      setReloadKey((k) => k + 1)
    } catch (err) {
      setError(platformErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  if (loading && !tenant) {
    return <div className="page-loading">Kooperatif yükleniyor...</div>
  }

  if (!tenant) {
    return (
      <div className="pf-page">
        <PageHeader title="Kooperatif" />
        <div className="alert alert-error">{error || 'Kooperatif bulunamadı.'}</div>
        <Link to="/platform/tenants" className="btn btn-sm">
          ← Listeye dön
        </Link>
      </div>
    )
  }

  const expiry = effectiveExpiry(tenant)

  return (
    <div className="pf-page">
      <div className="pf-breadcrumb">
        <Link to="/platform/tenants">Kooperatifler</Link>
        <span>/</span>
        <span>{tenant.name}</span>
      </div>

      <PageHeader
        title={tenant.name}
        subtitle={`Oluşturulma: ${formatDate(tenant.createdAt)}`}
        actions={
          <>
            <button
              type="button"
              className="btn btn-sm btn-accent"
              disabled={busyId === tenant.id || tenant.status !== 'ACTIVE'}
              title={tenant.status !== 'ACTIVE' ? 'Yalnız aktif kooperatiflere girilebilir' : 'Destek modunda gir'}
              onClick={() => void enterSupport(tenant)}
            >
              Destek Modu
            </button>
            <button type="button" className="btn btn-sm" onClick={() => setDialog('extend')}>
              Süre Uzat
            </button>
            <button type="button" className="btn btn-sm" onClick={() => setDialog('status')}>
              Durum
            </button>
            <button type="button" className="btn btn-sm" onClick={() => setDialog('backup')}>
              Yedek
            </button>
            <button type="button" className="btn btn-sm" onClick={() => setDialog('restore')}>
              Geri Yükle
            </button>
            <button
              type="button"
              className="btn btn-sm btn-danger"
              disabled={tenant.status !== 'ARCHIVED'}
              title={tenant.status !== 'ARCHIVED' ? 'Yalnızca arşivlenmiş kooperatifler silinebilir' : 'Kalıcı sil'}
              onClick={() => setDialog('delete')}
            >
              Sil
            </button>
          </>
        }
      />

      {error && <div className="alert alert-error">{error}</div>}

      {tenant.status === 'SUSPENDED' && (
        <div className="alert alert-warning">
          <strong>Askıda.</strong> Sebep: {tenant.suspensionReason || '—'}
        </div>
      )}

      <div className="pf-cards pf-cards--detail">
        <div className="stat-panel">
          <div className="stat-panel__head">
            <span className="stat-panel__label">Durum</span>
          </div>
          <div className="pf-stat-badges">
            <TenantStatusBadge status={tenant.status} />
            <TypeBadge isDemo={tenant.isDemo} />
          </div>
          <div className="platform-muted" style={{ marginTop: 8, fontSize: 13 }}>
            Kaynak:{' '}
            {tenant.sourceLabel?.trim() ||
              (tenant.sourceKind === 'WEBSITE_ORDER'
                ? `Web sitesi sipariş${tenant.sourceRef ? ` #${tenant.sourceRef}` : ''}`
                : tenant.sourceKind === 'DEMO_FORM'
                  ? 'Demo formu'
                  : 'Elle oluşturuldu')}
          </div>
        </div>
        <div className="stat-panel">
          <div className="stat-panel__head">
            <span className="stat-panel__label">Kalan Süre</span>
          </div>
          <div className="pf-stat-badges">
            <DaysLeftBadge days={tenant.daysLeft} />
            <span className="platform-muted">{expiry ? formatDate(expiry) : 'Süresiz'}</span>
          </div>
        </div>
        <StatPanel label="Üye" value={tenant.memberCount} hint={tenant.maxMembers ? `Limit: ${tenant.maxMembers}` : undefined} />
        <StatPanel label="Kullanıcı" value={tenant.userCount} hint={tenant.maxUsers ? `Limit: ${tenant.maxUsers}` : undefined} />
        <StatPanel label="Doküman" value={tenant.documentCount} />
        <StatPanel label="Son Giriş" value={<span className="pf-stat-small">{formatDateTime(tenant.lastUserLoginAt)}</span>} />
      </div>

      <DesktopTabs
        tabs={[
          { key: 'general', label: 'Genel' },
          { key: 'users', label: 'Kullanıcılar' },
          { key: 'extensions', label: 'Süre Geçmişi' },
          { key: 'logins', label: 'Giriş Geçmişi' },
          { key: 'critical', label: 'Kritik Loglar' },
          { key: 'emails', label: 'E-postalar' }
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'general' && <GeneralTab key={`${tenant.id}-${tenant.updatedAt}`} tenant={tenant} onSaved={() => void load()} />}
      {tab === 'users' && <TenantUsersPanel tenantId={tenant.id} tenantName={tenant.name} />}
      {tab === 'extensions' && <ExtensionsTab tenantId={tenant.id} reloadKey={reloadKey} />}
      {tab === 'logins' && <LoginsTab tenantId={tenant.id} />}
      {tab === 'critical' && <CriticalTab tenantId={tenant.id} />}
      {tab === 'emails' && <EmailsTab tenant={tenant} />}

      {dialog === 'extend' && <ExtendModal tenant={tenant} onClose={() => setDialog(null)} onSaved={() => void load()} />}
      {dialog === 'status' && <StatusModal tenant={tenant} onClose={() => setDialog(null)} onSaved={() => void load()} />}
      {dialog === 'backup' && <BackupModal tenant={tenant} onClose={() => setDialog(null)} />}
      {dialog === 'restore' && <RestoreModal tenant={tenant} onClose={() => setDialog(null)} onDone={() => void load()} />}
      {dialog === 'delete' && (
        <DeleteTenantModal
          tenant={tenant}
          onClose={() => setDialog(null)}
          onDeleted={() => navigate('/platform/tenants', { replace: true })}
        />
      )}
    </div>
  )
}
