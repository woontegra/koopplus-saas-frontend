import { useState } from 'react'
import { triggerBrowserDownload } from '../../desktopApi/downloadHelpers'
import { useActionToast } from '../../hooks/useActionToast'
import { useAskDialog } from '../../hooks/useAskDialog'
import PlatformModal from '../../platform/PlatformModal'
import {
  platformApi,
  platformDownloadBackup,
  platformErrorMessage,
  platformRestoreAndWait,
  type NewTenantAdmin,
  type PlatformTenantStatus
} from '../../platform/platformApi'
import { readFileAsBase64 } from '../../utils/fileBase64'
import { formatDate } from '../../utils/format'
import { effectiveExpiry, endOfDayIso, STATUS_LABEL, toDateInput } from './platformUi'

export type TenantRef = {
  id: string
  name: string
  status: PlatformTenantStatus
  isDemo?: boolean
  usageExpiresAt: string | null
  demoExpiresAt?: string | null
  suspensionReason?: string | null
}

const DEMO_DAY_OPTIONS = [7, 14, 30, 60, 90]

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

export function CreateTenantModal({
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
  const [createdInfo, setCreatedInfo] = useState<{
    emailOk: boolean
    emailError: string | null
    temporaryPassword: string | null
    licenseKey: string | null
  } | null>(null)

  const submit = async (): Promise<void> => {
    if (!name.trim()) return setError('Kooperatif adı zorunludur.')
    if (!admin.fullName.trim() || !admin.email.trim()) return setError('İlk yönetici bilgileri zorunludur.')
    if (admin.password.length < 8) return setError('Geçici şifre en az 8 karakter olmalıdır.')
    setSaving(true)
    setError('')
    try {
      const adminBody = { ...admin, fullName: admin.fullName.trim(), email: admin.email.trim() }
      const result = demo
        ? await platformApi.createDemoTenant({ name: name.trim(), days, admin: adminBody })
        : await platformApi.createTenant({
            name: name.trim(),
            usageExpiresAt: expiry ? endOfDayIso(expiry) : null,
            admin: adminBody
          })
      const emailOk = result.email?.ok !== false
      const emailError = result.email?.error ?? null
      const temporaryPassword = result.admin?.temporaryPassword ?? null
      const licenseKey = result.admin?.licenseKey ?? result.tenant.licenseKey ?? null
      if (!emailOk) {
        setCreatedInfo({
          emailOk: false,
          emailError,
          temporaryPassword: temporaryPassword || admin.password,
          licenseKey
        })
        toast.warn('E-posta gönderilemedi', emailError || 'Kooperatif oluştu; şifreyi şimdi kopyalayın.')
        onCreated()
        return
      }
      toast.success('Kooperatif oluşturuldu', demo ? `Demo (${days} gün) hazır.` : 'Hoş geldin e-postası gönderildi.')
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
      {createdInfo && (
        <div className="alert alert-warning">
          <strong>E-posta gönderilemedi.</strong> {createdInfo.emailError || 'SMTP hatası'}
          <div style={{ marginTop: 8 }}>
            {createdInfo.licenseKey && (
              <div>
                Lisans: <code>{createdInfo.licenseKey}</code>
              </div>
            )}
            {createdInfo.temporaryPassword && (
              <div>
                Geçici şifre (yalnız şimdi): <code>{createdInfo.temporaryPassword}</code>
              </div>
            )}
          </div>
          <button type="button" className="btn btn-sm" style={{ marginTop: 8 }} onClick={onClose}>
            Kapat
          </button>
        </div>
      )}
      <div className="platform-segment" role="tablist">
        <button
          type="button"
          className={`platform-segment__item${!demo ? ' is-active' : ''}`}
          onClick={() => setDemo(false)}
          disabled={!!createdInfo}
        >
          Normal
        </button>
        <button
          type="button"
          className={`platform-segment__item${demo ? ' is-active' : ''}`}
          onClick={() => setDemo(true)}
          disabled={!!createdInfo}
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

/** Süre uzat: +gün, tarihe kadar, demo → yıllık. */
export function ExtendModal({
  tenant,
  onClose,
  onSaved
}: {
  tenant: TenantRef
  onClose: () => void
  onSaved: () => void
}): JSX.Element {
  const toast = useActionToast()
  const currentExpiry = effectiveExpiry(tenant)
  const [mode, setMode] = useState<'days' | 'date'>('days')
  const [days, setDays] = useState('30')
  const [toDate, setToDate] = useState(toDateInput(currentExpiry))
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  /** Varsayılan: örnek verileri sil, müşteri verisini koru */
  const [keepSampleData, setKeepSampleData] = useState(false)

  const run = async (body: Parameters<typeof platformApi.extendTenant>[1], okMsg: string): Promise<void> => {
    setSaving(true)
    setError('')
    try {
      await platformApi.extendTenant(tenant.id, { ...body, ...(note.trim() ? { note: note.trim() } : {}) })
      toast.success('Süre güncellendi', `${tenant.name}: ${okMsg}`)
      onSaved()
      onClose()
    } catch (err) {
      setError(platformErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const submit = (): void => {
    if (mode === 'days') {
      const n = Math.trunc(Number(days))
      if (!Number.isFinite(n) || n <= 0 || n > 3660) return setError('Gün sayısı 1–3660 arasında olmalıdır.')
      void run({ days: n }, `+${n} gün`)
    } else {
      if (!toDate) return setError('Bitiş tarihi seçin.')
      void run({ toDate: endOfDayIso(toDate) }, formatDate(toDate))
    }
  }

  const convert = async (): Promise<void> => {
    await run(
      { convertToYearly: true, keepSampleData },
      keepSampleData
        ? 'yıllığa çevrildi (+1 yıl, örnek veriler korundu)'
        : 'yıllığa çevrildi (+1 yıl, örnek veriler silindi)'
    )
  }

  return (
    <PlatformModal
      title={`Süre Uzat — ${tenant.name}`}
      onClose={onClose}
      footer={
        <>
          {tenant.isDemo && (
            <button type="button" className="btn btn-sm btn-accent" disabled={saving} onClick={() => void convert()}>
              Yıllığa Çevir (+1 yıl)
            </button>
          )}
          <button type="button" className="btn btn-sm" onClick={onClose}>
            İptal
          </button>
          <button type="button" className="btn btn-primary" disabled={saving} onClick={submit}>
            {saving ? 'Kaydediliyor...' : 'Uzat'}
          </button>
        </>
      }
    >
      {error && <div className="alert alert-error">{error}</div>}
      <p className="platform-muted" style={{ marginTop: 0 }}>
        Mevcut bitiş: <strong>{currentExpiry ? formatDate(currentExpiry) : 'Sınırsız'}</strong>
        {tenant.isDemo ? ' (demo)' : ''}. Süre dolmuşsa bugünden itibaren uzatılır ve kooperatif aktifleştirilir.
      </p>
      {tenant.isDemo && (
        <fieldset className="form-group" style={{ marginBottom: 12 }}>
          <legend style={{ fontSize: 13, fontWeight: 600 }}>Yıllığa çevirirken örnek veriler</legend>
          <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
            <input
              type="radio"
              name="keepSampleData"
              checked={!keepSampleData}
              onChange={() => setKeepSampleData(false)}
            />
            <span>Örnek verileri sil, müşterinin girdiği verileri koru (varsayılan)</span>
          </label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <input
              type="radio"
              name="keepSampleData"
              checked={keepSampleData}
              onChange={() => setKeepSampleData(true)}
            />
            <span>Örnek verileri koru</span>
          </label>
        </fieldset>
      )}
      <div className="platform-segment" role="tablist">
        <button
          type="button"
          className={`platform-segment__item${mode === 'days' ? ' is-active' : ''}`}
          onClick={() => setMode('days')}
        >
          Gün ekle
        </button>
        <button
          type="button"
          className={`platform-segment__item${mode === 'date' ? ' is-active' : ''}`}
          onClick={() => setMode('date')}
        >
          Tarihe kadar
        </button>
      </div>
      {mode === 'days' ? (
        <>
          <div className="form-group">
            <label>Eklenecek gün</label>
            <input type="number" min={1} max={3660} value={days} onChange={(e) => setDays(e.target.value)} />
          </div>
          <div className="platform-chips">
            {[7, 14, 30, 90, 180, 365].map((d) => (
              <button key={d} type="button" className="btn btn-sm" onClick={() => setDays(String(d))}>
                +{d} gün
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="form-group">
          <label>Yeni bitiş tarihi</label>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
      )}
      <div className="form-group" style={{ marginTop: 12 }}>
        <label>Not (opsiyonel)</label>
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
      </div>
    </PlatformModal>
  )
}

/** Durum değiştir — SUSPENDED için sebep zorunlu. */
export function StatusModal({
  tenant,
  onClose,
  onSaved
}: {
  tenant: TenantRef
  onClose: () => void
  onSaved: () => void
}): JSX.Element {
  const toast = useActionToast()
  const [status, setStatus] = useState<PlatformTenantStatus>(tenant.status)
  const [reason, setReason] = useState(tenant.suspensionReason ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async (): Promise<void> => {
    if (status === tenant.status && status !== 'SUSPENDED') return onClose()
    if (status === 'SUSPENDED' && !reason.trim()) return setError('Askıya alma sebebi zorunludur.')
    setSaving(true)
    setError('')
    try {
      await platformApi.setStatus(tenant.id, status, status === 'SUSPENDED' ? reason.trim() : undefined)
      toast.success('Durum güncellendi', `${tenant.name}: ${STATUS_LABEL[status]}`)
      onSaved()
      onClose()
    } catch (err) {
      setError(platformErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <PlatformModal
      title={`Durum Değiştir — ${tenant.name}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-sm" onClick={onClose}>
            İptal
          </button>
          <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void submit()}>
            {saving ? 'Kaydediliyor...' : 'Uygula'}
          </button>
        </>
      }
    >
      {error && <div className="alert alert-error">{error}</div>}
      <div className="form-group">
        <label>Durum</label>
        <select value={status} onChange={(e) => setStatus(e.target.value as PlatformTenantStatus)}>
          {(Object.keys(STATUS_LABEL) as PlatformTenantStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>
      {status === 'SUSPENDED' && (
        <div className="form-group">
          <label>Askıya alma sebebi * (kullanıcılara giriş ekranında gösterilir)</label>
          <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
        </div>
      )}
      {status !== 'ACTIVE' && (
        <div className="alert alert-warning">Kullanıcılar bu kooperatife giriş yapamaz.</div>
      )}
    </PlatformModal>
  )
}

export function DeleteTenantModal({
  tenant,
  onClose,
  onDeleted
}: {
  tenant: TenantRef
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

export function BackupModal({ tenant, onClose }: { tenant: TenantRef; onClose: () => void }): JSX.Element {
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

export function RestoreModal({
  tenant,
  onClose,
  onDone
}: {
  tenant: TenantRef
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
