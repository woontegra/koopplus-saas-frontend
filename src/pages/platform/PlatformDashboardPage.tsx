import { useCallback, useEffect, useMemo, useState } from 'react'
import DataPanel from '../../components/ui/DataPanel'
import DesktopTabs from '../../components/ui/DesktopTabs'
import EmptyState from '../../components/ui/EmptyState'
import StatPanel from '../../components/ui/StatPanel'
import { useAskDialog } from '../../hooks/useAskDialog'
import { useActionToast } from '../../hooks/useActionToast'
import { saveSupportSession, saveTenantId, saveToken } from '../../auth/session'
import PlatformModal from '../../platform/PlatformModal'
import {
  platformApi,
  platformDownloadBackup,
  platformErrorMessage,
  platformRestoreAndWait,
  type NewTenantAdmin,
  type PlatformAuditEntry,
  type PlatformSummary,
  type PlatformTenant,
  type PlatformTenantStatus,
  type PlatformTenantUser
} from '../../platform/platformApi'
import { triggerBrowserDownload } from '../../desktopApi/downloadHelpers'
import { readFileAsBase64 } from '../../utils/fileBase64'
import { formatDate, formatDateTime } from '../../utils/format'
import { daysRemaining, USAGE_WARNING_DAYS, usageLabel } from '../../utils/usage'

type PageTab = 'tenants' | 'audit'
type StatusFilter = 'ALL' | PlatformTenantStatus

const STATUS_LABEL: Record<PlatformTenantStatus, string> = {
  ACTIVE: 'Aktif',
  SUSPENDED: 'Askıda',
  ARCHIVED: 'Arşiv'
}

const ROLE_LABEL = { ADMIN: 'Yönetici', STAFF: 'İşlem Yetkilisi', VIEWER: 'Sadece Görüntüleme' } as const

const DEMO_DAY_OPTIONS = [7, 14, 30, 60, 90]

function toDateInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Seçilen günün sonunu (yerel) ISO olarak döndürür. */
function endOfDayIso(dateInput: string): string {
  return new Date(`${dateInput}T23:59:59`).toISOString()
}

function ExpiryCell({ iso }: { iso: string | null }): JSX.Element {
  const days = daysRemaining(iso)
  if (!iso) return <span className="platform-muted">Sınırsız</span>
  const cls = days !== null && days <= 0 ? 'platform-expiry--over' : days !== null && days <= USAGE_WARNING_DAYS ? 'platform-expiry--soon' : ''
  return (
    <span className={`platform-expiry ${cls}`.trim()} title={formatDateTime(iso)}>
      {formatDate(iso)} · {usageLabel(days)}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* Modals                                                              */
/* ------------------------------------------------------------------ */

function AdminFields({
  value,
  onChange
}: {
  value: NewTenantAdmin
  onChange: (v: NewTenantAdmin) => void
}): JSX.Element {
  return (
    <>
      <div className="form-group">
        <label>İlk Yönetici — Ad Soyad *</label>
        <input value={value.fullName} onChange={(e) => onChange({ ...value, fullName: e.target.value })} />
      </div>
      <div className="form-group">
        <label>İlk Yönetici — E-posta *</label>
        <input
          type="email"
          value={value.email}
          onChange={(e) => onChange({ ...value, email: e.target.value })}
          autoComplete="off"
        />
      </div>
      <div className="form-group form-group--wide">
        <label>Geçici Şifre * (en az 8 karakter — ilk girişte değiştirilir)</label>
        <input
          type="text"
          value={value.password}
          onChange={(e) => onChange({ ...value, password: e.target.value })}
          autoComplete="off"
        />
      </div>
    </>
  )
}

function CreateTenantModal({
  onClose,
  onCreated
}: {
  onClose: () => void
  onCreated: () => void
}): JSX.Element {
  const toast = useActionToast()
  const [demo, setDemo] = useState(false)
  const [name, setName] = useState('')
  const [days, setDays] = useState(14)
  const [expiry, setExpiry] = useState('')
  const [admin, setAdmin] = useState<NewTenantAdmin>({ fullName: '', email: '', password: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async (): Promise<void> => {
    if (!name.trim()) return setError('Kooperatif adı zorunludur.')
    if (!admin.fullName.trim() || !admin.email.trim()) return setError('İlk yönetici bilgileri zorunludur.')
    if (admin.password.length < 8) return setError('Geçici şifre en az 8 karakter olmalıdır.')
    setSaving(true)
    setError('')
    try {
      const adminBody = { ...admin, fullName: admin.fullName.trim(), email: admin.email.trim() }
      if (demo) {
        await platformApi.createDemoTenant({ name: name.trim(), days, admin: adminBody })
      } else {
        await platformApi.createTenant({
          name: name.trim(),
          usageExpiresAt: expiry ? endOfDayIso(expiry) : null,
          admin: adminBody
        })
      }
      toast.success('Kooperatif oluşturuldu', demo ? `Demo (${days} gün) hazır.` : 'İlk yönetici eklendi.')
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
      title={demo ? 'Demo Kooperatif Oluştur' : 'Yeni Kooperatif Oluştur'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-sm" onClick={onClose}>
            İptal
          </button>
          <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void submit()}>
            {saving ? 'Oluşturuluyor...' : 'Oluştur'}
          </button>
        </>
      }
    >
      {error && <div className="alert alert-error">{error}</div>}
      <div className="platform-segment" role="tablist">
        <button
          type="button"
          className={`platform-segment__item${!demo ? ' is-active' : ''}`}
          onClick={() => setDemo(false)}
        >
          Normal
        </button>
        <button
          type="button"
          className={`platform-segment__item${demo ? ' is-active' : ''}`}
          onClick={() => setDemo(true)}
        >
          Demo
        </button>
      </div>
      <div className="form-grid form-grid--2">
        <div className="form-group form-group--wide">
          <label>Kooperatif Adı *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        {demo ? (
          <div className="form-group form-group--wide">
            <label>Demo Süresi (gün)</label>
            <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
              {DEMO_DAY_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d} gün
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="form-group form-group--wide">
            <label>Kullanım Süresi Bitişi (boş = sınırsız)</label>
            <input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
          </div>
        )}
        <AdminFields value={admin} onChange={setAdmin} />
      </div>
    </PlatformModal>
  )
}

function UsageExpiryModal({
  tenant,
  onClose,
  onSaved
}: {
  tenant: PlatformTenant
  onClose: () => void
  onSaved: () => void
}): JSX.Element {
  const toast = useActionToast()
  const [value, setValue] = useState(toDateInput(tenant.usageExpiresAt))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const save = async (next: string | null): Promise<void> => {
    setSaving(true)
    setError('')
    try {
      await platformApi.setUsageExpiry(tenant.id, next)
      toast.success('Kullanım süresi güncellendi', tenant.name)
      onSaved()
      onClose()
    } catch (err) {
      setError(platformErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const extend = (days: number): void => {
    const base = tenant.usageExpiresAt && new Date(tenant.usageExpiresAt) > new Date() ? new Date(tenant.usageExpiresAt) : new Date()
    base.setDate(base.getDate() + days)
    setValue(toDateInput(base.toISOString()))
  }

  return (
    <PlatformModal
      title={`Kullanım Süresi — ${tenant.name}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-sm" disabled={saving} onClick={() => void save(null)}>
            Sınırsız Yap
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={saving || !value}
            onClick={() => void save(endOfDayIso(value))}
          >
            Kaydet
          </button>
        </>
      }
    >
      {error && <div className="alert alert-error">{error}</div>}
      <div className="form-group">
        <label>Bitiş Tarihi</label>
        <input type="date" value={value} onChange={(e) => setValue(e.target.value)} />
      </div>
      <div className="platform-chips">
        {[30, 90, 180, 365].map((d) => (
          <button key={d} type="button" className="btn btn-sm" onClick={() => extend(d)}>
            +{d} gün
          </button>
        ))}
      </div>
    </PlatformModal>
  )
}

function DeleteTenantModal({
  tenant,
  onClose,
  onDeleted
}: {
  tenant: PlatformTenant
  onClose: () => void
  onDeleted: () => void
}): JSX.Element {
  const toast = useActionToast()
  const [typed, setTyped] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const matches = typed === tenant.name

  const submit = async (): Promise<void> => {
    setSaving(true)
    setError('')
    try {
      await platformApi.deleteTenant(tenant.id, typed)
      toast.success('Kooperatif silindi', tenant.name)
      onDeleted()
      onClose()
    } catch (err) {
      setError(platformErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <PlatformModal
      title="Kooperatifi Kalıcı Sil"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-sm" onClick={onClose}>
            Vazgeç
          </button>
          <button type="button" className="btn btn-danger" disabled={!matches || saving} onClick={() => void submit()}>
            {saving ? 'Siliniyor...' : 'Kalıcı Olarak Sil'}
          </button>
        </>
      }
    >
      {error && <div className="alert alert-error">{error}</div>}
      <div className="alert alert-warning">
        Bu işlem geri alınamaz. <strong>{tenant.name}</strong> kooperatifinin tüm verileri, kullanıcı
        üyelikleri ve dokümanları kalıcı olarak silinir. Silmeden önce yedek almanız önerilir.
      </div>
      <div className="form-group">
        <label>
          Onaylamak için kooperatif adını aynen yazın: <strong>{tenant.name}</strong>
        </label>
        <input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
      </div>
    </PlatformModal>
  )
}

function BackupModal({ tenant, onClose }: { tenant: PlatformTenant; onClose: () => void }): JSX.Element {
  const toast = useActionToast()
  const [encrypt, setEncrypt] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (): Promise<void> => {
    setError('')
    if (encrypt) {
      if (password.length < 8) return setError('Yedek şifresi en az 8 karakter olmalıdır.')
      if (password !== confirm) return setError('Şifreler eşleşmiyor.')
    }
    setBusy(true)
    try {
      const { blob, fileName } = await platformDownloadBackup(tenant.id, encrypt ? password : undefined)
      triggerBrowserDownload(blob, fileName)
      toast.success('Yedek indirildi', fileName)
      onClose()
    } catch (err) {
      setError(platformErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <PlatformModal
      title={`Yedek İndir — ${tenant.name}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-sm" onClick={onClose}>
            İptal
          </button>
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void submit()}>
            {busy ? 'Hazırlanıyor...' : 'Yedeği İndir'}
          </button>
        </>
      }
    >
      {error && <div className="alert alert-error">{error}</div>}
      <label className="platform-check">
        <input type="checkbox" checked={encrypt} onChange={(e) => setEncrypt(e.target.checked)} />
        Yedeği şifrele
      </label>
      {encrypt && (
        <>
          <div className="alert alert-warning">
            <strong>Şifreyi unutursanız bu yedek hiçbir şekilde açılamaz.</strong> Şifre sunucuda
            saklanmaz ve kurtarılamaz.
          </div>
          <div className="form-grid form-grid--2">
            <div className="form-group">
              <label>Yedek Şifresi</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
            </div>
            <div className="form-group">
              <label>Şifre Tekrar</label>
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
            </div>
          </div>
        </>
      )}
    </PlatformModal>
  )
}

function RestoreModal({
  tenant,
  onClose,
  onDone
}: {
  tenant: PlatformTenant
  onClose: () => void
  onDone: () => void
}): JSX.Element {
  const toast = useActionToast()
  const ask = useAskDialog()
  const [file, setFile] = useState<File | null>(null)
  const [docs, setDocs] = useState<File | null>(null)
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const isDb = file ? /\.db$/i.test(file.name) : false

  const submit = async (): Promise<void> => {
    if (!file) return setError('Yedek dosyası seçin.')
    const ok = await ask.confirm(
      `“${tenant.name}” kooperatifinin mevcut verileri yedekteki verilerle DEĞİŞTİRİLECEK.\n\nDosya: ${file.name}\n\nDevam edilsin mi?`,
      { title: 'Yedekten Geri Yükle', confirmLabel: 'Geri Yükle', variant: 'danger' }
    )
    if (!ok) return
    setBusy(true)
    setError('')
    try {
      await platformRestoreAndWait(tenant.id, {
        fileName: file.name,
        contentBase64: await readFileAsBase64(file),
        ...(password ? { password } : {}),
        ...(docs ? { documentsZipBase64: await readFileAsBase64(docs) } : {})
      })
      toast.success('Geri yükleme tamamlandı', tenant.name)
      onDone()
      onClose()
    } catch (err) {
      setError(platformErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <PlatformModal
      title={`Yedekten Geri Yükle — ${tenant.name}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-sm" onClick={onClose}>
            İptal
          </button>
          <button type="button" className="btn btn-danger" disabled={busy || !file} onClick={() => void submit()}>
            {busy ? 'Geri yükleniyor...' : 'Geri Yükle'}
          </button>
        </>
      }
    >
      {error && <div className="alert alert-error">{error}</div>}
      <div className="alert alert-warning">
        Mevcut veriler yedekteki verilerle değiştirilir. SaaS yedeği (.json) veya masaüstü KoopPlus
        yedeği (.db) yüklenebilir.
      </div>
      <div className="form-grid">
        <div className="form-group">
          <label>Yedek Dosyası (.json / .db)</label>
          <input type="file" accept=".json,.db,.koopplus,.enc" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>
        {isDb && (
          <div className="form-group">
            <label>Dokümanlar (.documents.zip) — opsiyonel</label>
            <input type="file" accept=".zip" onChange={(e) => setDocs(e.target.files?.[0] ?? null)} />
          </div>
        )}
        <div className="form-group">
          <label>Yedek Şifresi (yedek şifreliyse)</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" />
        </div>
      </div>
    </PlatformModal>
  )
}

/* ------------------------------------------------------------------ */
/* Users of selected tenant                                            */
/* ------------------------------------------------------------------ */

type UserFormState = {
  id: string | null
  fullName: string
  email: string
  role: PlatformTenantUser['role']
  password: string
  mustChangePassword: boolean
}

function TenantUsersPanel({ tenant }: { tenant: PlatformTenant }): JSX.Element {
  const toast = useActionToast()
  const [users, setUsers] = useState<PlatformTenantUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState<UserFormState | null>(null)
  const [pwTarget, setPwTarget] = useState<PlatformTenantUser | null>(null)
  const [pwValue, setPwValue] = useState('')
  const [pwForce, setPwForce] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modalError, setModalError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setUsers(await platformApi.listUsers(tenant.id))
    } catch (err) {
      setError(platformErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [tenant.id])

  useEffect(() => {
    void load()
  }, [load])

  const saveUser = async (): Promise<void> => {
    if (!form) return
    setSaving(true)
    setModalError('')
    try {
      if (form.id) {
        await platformApi.updateUser(tenant.id, form.id, {
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          role: form.role
        })
      } else {
        if (form.password.length < 8) throw new Error('Şifre en az 8 karakter olmalıdır.')
        await platformApi.createUser(tenant.id, {
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          password: form.password,
          role: form.role,
          mustChangePassword: form.mustChangePassword
        })
      }
      toast.success('Kullanıcı kaydedildi', form.fullName)
      setForm(null)
      void load()
    } catch (err) {
      setModalError(platformErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (u: PlatformTenantUser): Promise<void> => {
    setError('')
    try {
      await platformApi.updateUser(tenant.id, u.id, { isActive: !u.isActive })
      void load()
    } catch (err) {
      setError(platformErrorMessage(err))
      toast.fail('Kullanıcı güncellenemedi', platformErrorMessage(err))
    }
  }

  const resetPassword = async (): Promise<void> => {
    if (!pwTarget) return
    if (pwValue.length < 8) return setModalError('Şifre en az 8 karakter olmalıdır.')
    setSaving(true)
    setModalError('')
    try {
      await platformApi.resetUserPassword(tenant.id, pwTarget.id, {
        newPassword: pwValue,
        mustChangePassword: pwForce
      })
      toast.success('Şifre güncellendi', pwTarget.email)
      setPwTarget(null)
      setPwValue('')
      void load()
    } catch (err) {
      setModalError(platformErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <DataPanel
      title={`Kullanıcılar — ${tenant.name}`}
      subtitle="Seçili kooperatifin kullanıcıları ve yetkileri"
      noPadding
      actions={
        <button
          type="button"
          className="btn btn-sm btn-primary"
          onClick={() => {
            setModalError('')
            setForm({ id: null, fullName: '', email: '', role: 'STAFF', password: '', mustChangePassword: true })
          }}
        >
          Yeni Kullanıcı
        </button>
      }
    >
      {error && <div className="alert alert-error platform-inline-alert">{error}</div>}
      {loading ? (
        <div className="page-loading">Kullanıcılar yükleniyor...</div>
      ) : users.length === 0 ? (
        <EmptyState message="Bu kooperatifte kullanıcı yok." compact />
      ) : (
        <div className="table-wrap table-wrap--compact">
          <table className="data-table">
            <thead>
              <tr>
                <th>E-posta</th>
                <th>Ad Soyad</th>
                <th>Rol</th>
                <th>Durum</th>
                <th>Son Giriş</th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="cell-mono">{u.email}</td>
                  <td>
                    {u.fullName}
                    {u.mustChangePassword && <span className="platform-tag">Şifre değişmeli</span>}
                  </td>
                  <td>{ROLE_LABEL[u.role] ?? u.role}</td>
                  <td>
                    <span className={`status-badge ${u.isActive ? 'status-badge--active' : 'status-badge--passive'}`}>
                      {u.isActive ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td>{formatDateTime(u.lastLoginAt)}</td>
                  <td>
                    <div className="settings-row-actions">
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => {
                          setModalError('')
                          setForm({ id: u.id, fullName: u.fullName, email: u.email, role: u.role, password: '', mustChangePassword: false })
                        }}
                      >
                        Düzenle
                      </button>
                      <button type="button" className="btn btn-sm" onClick={() => void toggleActive(u)}>
                        {u.isActive ? 'Pasif Yap' : 'Aktif Yap'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => {
                          setModalError('')
                          setPwValue('')
                          setPwForce(true)
                          setPwTarget(u)
                        }}
                      >
                        Şifre Sıfırla
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {form && (
        <PlatformModal
          title={form.id ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı'}
          onClose={() => setForm(null)}
          footer={
            <>
              <button type="button" className="btn btn-sm" onClick={() => setForm(null)}>
                İptal
              </button>
              <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void saveUser()}>
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </>
          }
        >
          {modalError && <div className="alert alert-error">{modalError}</div>}
          <div className="form-grid form-grid--2">
            <div className="form-group">
              <label>Ad Soyad</label>
              <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            </div>
            <div className="form-group">
              <label>E-posta</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Rol</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as PlatformTenantUser['role'] })}>
                {(['ADMIN', 'STAFF', 'VIEWER'] as const).map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </select>
            </div>
            {!form.id && (
              <>
                <div className="form-group">
                  <label>Geçici Şifre</label>
                  <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="off" />
                </div>
                <label className="platform-check form-group--wide">
                  <input
                    type="checkbox"
                    checked={form.mustChangePassword}
                    onChange={(e) => setForm({ ...form, mustChangePassword: e.target.checked })}
                  />
                  İlk girişte şifre değiştirmeye zorla
                </label>
              </>
            )}
          </div>
        </PlatformModal>
      )}

      {pwTarget && (
        <PlatformModal
          title={`Şifre Sıfırla — ${pwTarget.email}`}
          onClose={() => setPwTarget(null)}
          footer={
            <>
              <button type="button" className="btn btn-sm" onClick={() => setPwTarget(null)}>
                İptal
              </button>
              <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void resetPassword()}>
                Şifreyi Kaydet
              </button>
            </>
          }
        >
          {modalError && <div className="alert alert-error">{modalError}</div>}
          <div className="form-group">
            <label>Yeni Geçici Şifre</label>
            <input value={pwValue} onChange={(e) => setPwValue(e.target.value)} autoComplete="off" />
          </div>
          <label className="platform-check">
            <input type="checkbox" checked={pwForce} onChange={(e) => setPwForce(e.target.checked)} />
            Sonraki girişte şifre değiştirmeye zorla
          </label>
        </PlatformModal>
      )}
    </DataPanel>
  )
}

/* ------------------------------------------------------------------ */
/* Audit                                                               */
/* ------------------------------------------------------------------ */

function AuditPanel(): JSX.Element {
  const [rows, setRows] = useState<PlatformAuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setRows(await platformApi.audit(200))
    } catch (err) {
      setError(platformErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <DataPanel
      title="Denetim Kaydı"
      subtitle="Platform işlemleri (son 200)"
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
        <EmptyState message="Henüz denetim kaydı yok." compact />
      ) : (
        <div className="table-wrap table-wrap--compact table-wrap--scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Yönetici</th>
                <th>İşlem</th>
                <th>Kooperatif</th>
                <th>Ayrıntı</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{formatDateTime(r.createdAt)}</td>
                  <td>{r.adminEmail || (r.adminId ? r.adminId : 'Sistem')}</td>
                  <td className="cell-mono">{r.action}</td>
                  <td>{r.tenantName || r.tenantId || '—'}</td>
                  <td className="cell-ellipsis" title={JSON.stringify(r.detail)}>
                    {r.detail && typeof r.detail === 'object' && Object.keys(r.detail as object).length > 0
                      ? JSON.stringify(r.detail)
                      : '—'}
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

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

type Dialog =
  | { kind: 'create' }
  | { kind: 'expiry'; tenant: PlatformTenant }
  | { kind: 'delete'; tenant: PlatformTenant }
  | { kind: 'backup'; tenant: PlatformTenant }
  | { kind: 'restore'; tenant: PlatformTenant }
  | null

export default function PlatformDashboardPage(): JSX.Element {
  const toast = useActionToast()
  const ask = useAskDialog()
  const [tab, setTab] = useState<PageTab>('tenants')
  const [summary, setSummary] = useState<PlatformSummary | null>(null)
  const [tenants, setTenants] = useState<PlatformTenant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dialog, setDialog] = useState<Dialog>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const [s, t] = await Promise.allSettled([platformApi.summary(), platformApi.listTenants()])
    if (s.status === 'fulfilled') setSummary(s.value)
    if (t.status === 'fulfilled') setTenants(t.value)
    else setError(platformErrorMessage(t.reason))
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('tr-TR')
    return tenants.filter((t) => {
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false
      if (q && !t.name.toLocaleLowerCase('tr-TR').includes(q)) return false
      return true
    })
  }, [tenants, search, statusFilter])

  const selected = tenants.find((t) => t.id === selectedId) ?? null

  const derived = useMemo<PlatformSummary>(
    () =>
      summary ?? {
        tenantCount: tenants.length,
        activeCount: tenants.filter((t) => t.status === 'ACTIVE').length,
        suspendedCount: tenants.filter((t) => t.status === 'SUSPENDED').length,
        archivedCount: tenants.filter((t) => t.status === 'ARCHIVED').length,
        demoCount: tenants.filter((t) => t.isDemo).length,
        expiringSoonCount: tenants.filter((t) => {
          const d = daysRemaining(t.usageExpiresAt)
          return d !== null && d <= USAGE_WARNING_DAYS
        }).length,
        userCount: tenants.reduce((n, t) => n + t.userCount, 0),
        memberCount: tenants.reduce((n, t) => n + t.memberCount, 0)
      },
    [summary, tenants]
  )

  const changeStatus = async (t: PlatformTenant, status: PlatformTenantStatus): Promise<void> => {
    if (status === t.status) return
    if (status !== 'ACTIVE') {
      const ok = await ask.confirm(
        `“${t.name}” durumu “${STATUS_LABEL[status]}” yapılacak. Kullanıcılar bu kooperatife giriş yapamaz.`,
        { title: 'Durum Değiştir', confirmLabel: 'Uygula', variant: 'warning' }
      )
      if (!ok) return
    }
    setBusyId(t.id)
    try {
      await platformApi.setStatus(t.id, status)
      toast.success('Durum güncellendi', `${t.name}: ${STATUS_LABEL[status]}`)
      await load()
    } catch (err) {
      toast.fail('Durum güncellenemedi', platformErrorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  const enterSupport = async (t: PlatformTenant): Promise<void> => {
    const ok = await ask.confirm(
      `“${t.name}” kooperatifine destek modunda girilecek. Tüm işlemler denetim kaydına yazılır.`,
      { title: 'Destek Modu', confirmLabel: 'Gir', variant: 'warning' }
    )
    if (!ok) return
    setBusyId(t.id)
    try {
      const res = await platformApi.impersonate(t.id)
      const tenantId = res.tenantId ?? t.id
      saveToken(res.token)
      saveTenantId(tenantId)
      saveSupportSession({
        tenantId,
        tenantName: res.tenantName ?? t.name,
        startedAt: new Date().toISOString()
      })
      window.location.assign('/')
    } catch (err) {
      toast.fail('Destek modu başlatılamadı', platformErrorMessage(err))
      setBusyId(null)
    }
  }

  return (
    <div className="platform-page">
      <DesktopTabs
        tabs={[
          { key: 'tenants', label: 'Kooperatifler' },
          { key: 'audit', label: 'Denetim Kaydı' }
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'audit' ? (
        <AuditPanel />
      ) : (
        <>
          <div className="platform-stats">
            <StatPanel label="Toplam Kooperatif" value={derived.tenantCount} variant="info" />
            <StatPanel label="Aktif" value={derived.activeCount} variant="credit" />
            <StatPanel label="Askıda" value={derived.suspendedCount} variant="accent" />
            <StatPanel label="Arşiv" value={derived.archivedCount} />
            {derived.demoCount !== undefined && <StatPanel label="Demo" value={derived.demoCount} />}
            {derived.expiringSoonCount !== undefined && (
              <StatPanel
                label={`Süresi ≤${USAGE_WARNING_DAYS} gün`}
                value={derived.expiringSoonCount}
                variant={derived.expiringSoonCount > 0 ? 'danger' : 'default'}
              />
            )}
            {derived.userCount !== undefined && <StatPanel label="Kullanıcı" value={derived.userCount} />}
            {derived.memberCount !== undefined && <StatPanel label="Üye" value={derived.memberCount} />}
          </div>

          <DataPanel
            title="Kooperatifler"
            subtitle="Tüm kiracılar"
            noPadding
            actions={
              <>
                <input
                  className="platform-search"
                  type="search"
                  placeholder="Kooperatif ara..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <select
                  className="platform-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                >
                  <option value="ALL">Tüm durumlar</option>
                  <option value="ACTIVE">Aktif</option>
                  <option value="SUSPENDED">Askıda</option>
                  <option value="ARCHIVED">Arşiv</option>
                </select>
                <button type="button" className="btn btn-sm" onClick={() => void load()}>
                  Yenile
                </button>
                <button type="button" className="btn btn-sm btn-primary" onClick={() => setDialog({ kind: 'create' })}>
                  Yeni Kooperatif / Demo
                </button>
              </>
            }
          >
            {error && <div className="alert alert-error platform-inline-alert">{error}</div>}
            {loading ? (
              <div className="page-loading">Kooperatifler yükleniyor...</div>
            ) : filtered.length === 0 ? (
              <EmptyState message="Kriterlere uyan kooperatif bulunamadı." compact />
            ) : (
              <div className="table-wrap table-wrap--compact table-wrap--scroll">
                <table className="data-table data-table--selectable">
                  <thead>
                    <tr>
                      <th>Kooperatif</th>
                      <th>Durum</th>
                      <th className="text-right">Üye</th>
                      <th className="text-right">Kullanıcı</th>
                      <th>Son Giriş</th>
                      <th>Kullanım Süresi</th>
                      <th>Oluşturulma</th>
                      <th>İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((t) => (
                      <tr
                        key={t.id}
                        className={`clickable${t.id === selectedId ? ' selected' : ''}`}
                        onClick={() => setSelectedId(t.id)}
                      >
                        <td>
                          <strong>{t.name}</strong>
                          {t.isDemo && <span className="platform-tag">Demo</span>}
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <select
                            className="platform-status-select"
                            value={t.status}
                            disabled={busyId === t.id}
                            onChange={(e) => void changeStatus(t, e.target.value as PlatformTenantStatus)}
                            aria-label={`${t.name} durumu`}
                          >
                            {(Object.keys(STATUS_LABEL) as PlatformTenantStatus[]).map((s) => (
                              <option key={s} value={s}>
                                {STATUS_LABEL[s]}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="text-right">{t.memberCount}</td>
                        <td className="text-right">{t.userCount}</td>
                        <td>{formatDateTime(t.lastUserLoginAt)}</td>
                        <td>
                          <ExpiryCell iso={t.usageExpiresAt} />
                        </td>
                        <td>{formatDate(t.createdAt)}</td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="settings-row-actions platform-row-actions">
                            <button
                              type="button"
                              className="btn btn-sm btn-accent"
                              disabled={busyId === t.id || t.status !== 'ACTIVE'}
                              title={t.status !== 'ACTIVE' ? 'Yalnız aktif kooperatiflere girilebilir' : 'Destek modunda gir'}
                              onClick={() => void enterSupport(t)}
                            >
                              Destek
                            </button>
                            <button type="button" className="btn btn-sm" onClick={() => setDialog({ kind: 'expiry', tenant: t })}>
                              Süre
                            </button>
                            <button type="button" className="btn btn-sm" onClick={() => setDialog({ kind: 'backup', tenant: t })}>
                              Yedek
                            </button>
                            <button type="button" className="btn btn-sm" onClick={() => setDialog({ kind: 'restore', tenant: t })}>
                              Geri Yükle
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-danger"
                              disabled={t.status !== 'ARCHIVED'}
                              title={t.status !== 'ARCHIVED' ? 'Yalnızca arşivlenmiş kooperatifler silinebilir' : 'Kalıcı sil'}
                              onClick={() => setDialog({ kind: 'delete', tenant: t })}
                            >
                              Sil
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </DataPanel>

          {selected ? (
            <TenantUsersPanel key={selected.id} tenant={selected} />
          ) : (
            <p className="platform-hint">Kullanıcıları yönetmek için tablodan bir kooperatif seçin.</p>
          )}
        </>
      )}

      {dialog?.kind === 'create' && (
        <CreateTenantModal onClose={() => setDialog(null)} onCreated={() => void load()} />
      )}
      {dialog?.kind === 'expiry' && (
        <UsageExpiryModal tenant={dialog.tenant} onClose={() => setDialog(null)} onSaved={() => void load()} />
      )}
      {dialog?.kind === 'delete' && (
        <DeleteTenantModal
          tenant={dialog.tenant}
          onClose={() => setDialog(null)}
          onDeleted={() => {
            if (selectedId === dialog.tenant.id) setSelectedId(null)
            void load()
          }}
        />
      )}
      {dialog?.kind === 'backup' && <BackupModal tenant={dialog.tenant} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'restore' && (
        <RestoreModal tenant={dialog.tenant} onClose={() => setDialog(null)} onDone={() => void load()} />
      )}
    </div>
  )
}
