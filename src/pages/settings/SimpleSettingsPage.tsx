import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext, useSearchParams } from 'react-router-dom'
import type {
  AppSettingsAll,
  BackupInfo,
  ChangeOwnPasswordPayload,
  ChangeOwnSecurityQuestionPayload,
  GeneralSettingsPayload
} from '@shared/types'
import { SECURITY_QUESTION_CUSTOM } from '@shared/securityQuestions'
import { useAuth } from '../../auth/AuthContext'
import SecurityQuestionFields, {
  EMPTY_SECURITY_QUESTION_FORM,
  resolveInitialSecurityQuestion,
  type SecurityQuestionFormValues
} from '../../components/auth/SecurityQuestionFields'
import DataPanel from '../../components/ui/DataPanel'
import CityDistrictFields from '../../components/ui/CityDistrictFields'
import type { AppLayoutContext } from '../../components/layout/AppLayout'
import { useActionToast } from '../../hooks/useActionToast'

type SettingsSection = 'general' | 'password' | 'backup' | 'sample'

type SampleDataInfo = {
  has_sample_data: boolean
  total: number
  counts: Record<string, number>
}

function CooperativeSection({
  initial,
  onSaved
}: {
  initial: AppSettingsAll['general']
  onSaved: (data: AppSettingsAll) => void
}): JSX.Element {
  const toast = useActionToast()
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setForm(initial)
  }, [initial])

  const handleSave = async (): Promise<void> => {
    if (!form.cooperative_name.trim()) {
      setError('Kooperatif adı zorunludur.')
      return
    }
    setSaving(true)
    setError('')
    setMessage('')
    const payload: GeneralSettingsPayload = { ...form }
    const res = await window.api.settings.updateGeneral(payload)
    setSaving(false)
    if (res.success && res.data) {
      setMessage('Kooperatif bilgileri kaydedildi.')
      toast.success('Ayarlar kaydedildi', 'Kooperatif bilgileri başarıyla kaydedildi.')
      onSaved(res.data)
    } else {
      setError(res.error ?? 'Kayıt başarısız')
      toast.fail('Ayarlar kaydedilemedi', res.error)
    }
  }

  return (
    <DataPanel title="Kooperatif Bilgileri" subtitle="Rapor ve çıktılarda kullanılacak bilgiler">
      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}
      <div className="form-grid form-grid--2">
        <div className="form-group form-group--wide">
          <label>Kooperatif Adı *</label>
          <input
            value={form.cooperative_name}
            onChange={(e) => setForm({ ...form, cooperative_name: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label>Yetkili Kişi</label>
          <input
            value={form.authorized_person}
            onChange={(e) => setForm({ ...form, authorized_person: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label>Telefon</label>
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label>E-posta</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label>Adres</label>
          <input
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
        </div>
        <CityDistrictFields
          city={form.city}
          district={form.district}
          onChange={(nextCity, nextDistrict) =>
            setForm({ ...form, city: nextCity, district: nextDistrict })
          }
        />
      </div>
      <div className="settings-actions">
        <button type="button" className="btn btn-sm btn-primary" disabled={saving} onClick={handleSave}>
          {saving ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
      </div>
    </DataPanel>
  )
}

function PasswordSection({ onSecurityUpdated }: { onSecurityUpdated: () => void }): JSX.Element {
  const toast = useActionToast()
  const [passwordForm, setPasswordForm] = useState<ChangeOwnPasswordPayload>({
    current_password: '',
    password: '',
    password_confirm: ''
  })
  const [securityForm, setSecurityForm] = useState({
    current_password: '',
    ...EMPTY_SECURITY_QUESTION_FORM
  })
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null)
  const [hasSecurityQuestion, setHasSecurityQuestion] = useState(true)
  const [loadingSecurity, setLoadingSecurity] = useState(true)
  const [savingPassword, setSavingPassword] = useState(false)
  const [savingSecurity, setSavingSecurity] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [securityMessage, setSecurityMessage] = useState('')
  const [securityError, setSecurityError] = useState('')

  useEffect(() => {
    let active = true
    window.api.auth.getOwnSecurityStatus().then((res) => {
      if (!active) return
      setLoadingSecurity(false)
      if (res.success && res.data) {
        setHasSecurityQuestion(res.data.has_security_question)
        setCurrentQuestion(res.data.security_question)
        if (res.data.security_question) {
          setSecurityForm((prev) => ({
            ...prev,
            ...resolveInitialSecurityQuestion(res.data!.security_question)
          }))
        }
      }
    })
    return () => {
      active = false
    }
  }, [])

  const handlePasswordSave = async (): Promise<void> => {
    setSavingPassword(true)
    setPasswordError('')
    setPasswordMessage('')
    const res = await window.api.auth.changeOwnPassword(passwordForm)
    setSavingPassword(false)
    if (res.success) {
      setPasswordMessage('Şifreniz güncellendi.')
      toast.success('Şifre değiştirildi', 'Şifreniz başarıyla güncellendi.')
      setPasswordForm({ current_password: '', password: '', password_confirm: '' })
    } else {
      setPasswordError(res.error ?? 'Şifre güncellenemedi')
      toast.fail('Şifre değiştirilemedi', res.error)
    }
  }

  const handleSecuritySave = async (): Promise<void> => {
    setSavingSecurity(true)
    setSecurityError('')
    setSecurityMessage('')
    const payload: ChangeOwnSecurityQuestionPayload = {
      current_password: securityForm.current_password,
      security_question: securityForm.security_question,
      security_question_custom: securityForm.security_question_custom,
      security_answer: securityForm.security_answer
    }
    const res = await window.api.auth.changeOwnSecurityQuestion(payload)
    setSavingSecurity(false)
    if (res.success) {
      setSecurityMessage('Güvenlik sorunuz güncellendi.')
      setSecurityForm({
        current_password: '',
        ...resolveInitialSecurityQuestion(
          securityForm.security_question === SECURITY_QUESTION_CUSTOM
            ? securityForm.security_question_custom
            : securityForm.security_question
        )
      })
      setHasSecurityQuestion(true)
      setCurrentQuestion(
        securityForm.security_question === SECURITY_QUESTION_CUSTOM
          ? securityForm.security_question_custom.trim()
          : securityForm.security_question
      )
      onSecurityUpdated()
      toast.success('Güvenlik sorusu kaydedildi', 'Güvenlik sorunuz başarıyla güncellendi.')
    } else {
      setSecurityError(res.error ?? 'Güvenlik sorusu güncellenemedi')
      toast.fail('Güvenlik sorusu kaydedilemedi', res.error)
    }
  }

  return (
    <>
      {!loadingSecurity && !hasSecurityQuestion && (
        <div className="settings-security-hint">
          Şifre kurtarma için güvenlik sorunuzu tanımlayın.
        </div>
      )}

      <DataPanel title="Şifre Değiştir" subtitle="Giriş şifrenizi güncelleyin">
        {passwordError && <div className="alert alert-error">{passwordError}</div>}
        {passwordMessage && <div className="alert alert-success">{passwordMessage}</div>}
        <div className="form-grid form-grid--2">
          <div className="form-group form-group--wide">
            <label>Mevcut Şifre</label>
            <input
              type="password"
              autoComplete="current-password"
              value={passwordForm.current_password}
              onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Yeni Şifre</label>
            <input
              type="password"
              autoComplete="new-password"
              value={passwordForm.password}
              onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Yeni Şifre Tekrar</label>
            <input
              type="password"
              autoComplete="new-password"
              value={passwordForm.password_confirm}
              onChange={(e) => setPasswordForm({ ...passwordForm, password_confirm: e.target.value })}
            />
          </div>
        </div>
        <div className="settings-actions">
          <button
            type="button"
            className="btn btn-sm btn-primary"
            disabled={savingPassword}
            onClick={handlePasswordSave}
          >
            {savingPassword ? 'Kaydediliyor...' : 'Şifreyi Güncelle'}
          </button>
        </div>
      </DataPanel>

      <DataPanel
        title="Güvenlik Sorusu Değiştir"
        subtitle={
          currentQuestion
            ? `Mevcut soru: ${currentQuestion}`
            : 'Şifre kurtarma için güvenlik sorusu tanımlayın'
        }
      >
        {securityError && <div className="alert alert-error">{securityError}</div>}
        {securityMessage && <div className="alert alert-success">{securityMessage}</div>}
        <div className="form-grid form-grid--2">
          <div className="form-group form-group--wide">
            <label>Mevcut Şifre</label>
            <input
              type="password"
              autoComplete="current-password"
              value={securityForm.current_password}
              onChange={(e) =>
                setSecurityForm({ ...securityForm, current_password: e.target.value })
              }
            />
          </div>
          <SecurityQuestionFields
            values={{
              security_question: securityForm.security_question,
              security_question_custom: securityForm.security_question_custom,
              security_answer: securityForm.security_answer
            }}
            onChange={(values: SecurityQuestionFormValues) =>
              setSecurityForm({ ...securityForm, ...values })
            }
          />
        </div>
        <div className="settings-actions">
          <button
            type="button"
            className="btn btn-sm btn-primary"
            disabled={savingSecurity}
            onClick={handleSecuritySave}
          >
            {savingSecurity ? 'Kaydediliyor...' : 'Güvenlik Sorusunu Kaydet'}
          </button>
        </div>
      </DataPanel>
    </>
  )
}

function BackupSettingsSection({
  info,
  onRefresh
}: {
  info: BackupInfo | null
  onRefresh: () => void
}): JSX.Element {
  const toast = useActionToast()
  const { reloadSettings } = useOutletContext<AppLayoutContext>()
  const [changingFolder, setChangingFolder] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const folderPickerOk =
    typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function'

  const handleChangeFolder = async (): Promise<void> => {
    setChangingFolder(true)
    setError('')
    setMessage('')
    const res = await window.api.backup.selectBackupFolder()
    setChangingFolder(false)
    if (res.success && res.data) {
      setMessage('Yedekleme klasörü güncellendi.')
      toast.success('Ayarlar kaydedildi', `Klasör: ${res.data.folder}`)
      reloadSettings()
      onRefresh()
    } else if (res.error !== 'Klasör seçilmedi') {
      setError(res.error ?? 'Yedekleme klasörü seçilemedi')
      toast.fail('Ayarlar kaydedilemedi', res.error)
    }
  }

  return (
    <DataPanel
      title="Yedekleme Ayarları"
      subtitle="Yedek dosyalarının kaydedileceği klasör"
    >
      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}
      {!folderPickerOk && (
        <div className="alert alert-warning">
          Klasör seçimi için Chrome veya Edge kullanın; bu tarayıcıda yedekler İndirilenler
          klasörüne iner.
        </div>
      )}
      <div className="form-grid">
        <div className="form-group form-group--wide">
          <label>Yedekleme Klasörü</label>
          <input readOnly value={info?.backup_folder || 'Henüz seçilmedi'} />
        </div>
      </div>
      <p className="settings-hint" style={{ marginTop: 8, color: 'var(--kat-text-secondary)', fontSize: 12 }}>
        Otomatik yedek: uygulama açıkken günde bir (saklanan son 10 dosya). Masaüstünde ayrı
        sıklık/saklama ayar alanı yoktur.
      </p>
      <div className="settings-actions">
        <button
          type="button"
          className="btn btn-sm btn-primary"
          disabled={changingFolder || !folderPickerOk}
          onClick={handleChangeFolder}
        >
          {changingFolder ? 'Seçiliyor...' : 'Klasör Değiştir'}
        </button>
        <Link to="/yedekleme" className="btn btn-sm">
          Yedekleme Sayfasına Git
        </Link>
      </div>
    </DataPanel>
  )
}

function SampleDataSection(): JSX.Element {
  const toast = useActionToast()
  const [info, setInfo] = useState<SampleDataInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [clearing, setClearing] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const res = await window.api.settings.getSampleData()
    if (res.success && res.data) setInfo(res.data)
    else setError(res.error ?? 'Örnek veri bilgisi alınamadı')
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const handleClear = async (): Promise<void> => {
    const ok = window.confirm(
      'Örnek (demo) veriler silinecek. Sizin girdiğiniz kayıtlar korunur. Devam edilsin mi?'
    )
    if (!ok) return
    setClearing(true)
    setError('')
    const res = await window.api.settings.clearSampleData()
    setClearing(false)
    if (res.success && res.data) {
      toast.success('Örnek veriler temizlendi', res.data.message)
      await load()
    } else {
      setError(res.error ?? 'Temizleme başarısız')
      toast.fail('Örnek veriler silinemedi', res.error)
    }
  }

  return (
    <DataPanel
      title="Örnek Veriler"
      subtitle="Demo kooperatifte otomatik üretilen örnek kayıtlar"
    >
      {error && <div className="alert alert-error">{error}</div>}
      {loading ? (
        <p className="muted">Yükleniyor…</p>
      ) : info?.has_sample_data ? (
        <>
          <p>
            Bu kooperatifte <strong>{info.total}</strong> örnek kayıt işaretli. Temizleme yalnızca
            örnek olarak işaretlenen kayıtları siler; sizin girdiğiniz veriler kalır.
          </p>
          <div className="settings-actions">
            <button
              type="button"
              className="btn btn-sm btn-danger-outline"
              disabled={clearing}
              onClick={() => void handleClear()}
            >
              {clearing ? 'Siliniyor…' : 'Örnek verileri temizle'}
            </button>
          </div>
        </>
      ) : (
        <p className="muted">Temizlenecek örnek veri yok.</p>
      )}
    </DataPanel>
  )
}

export default function SimpleSettingsPage(): JSX.Element {
  const { user, refreshSession, isAdmin } = useAuth()
  const [searchParams] = useSearchParams()
  const sectionParam = searchParams.get('section')
  const initialSection: SettingsSection =
    sectionParam === 'password' ||
    sectionParam === 'backup' ||
    sectionParam === 'general' ||
    sectionParam === 'sample'
      ? sectionParam
      : 'general'
  const [section, setSection] = useState<SettingsSection>(() => {
    if (!isAdmin && (initialSection === 'sample' || initialSection === 'backup')) return 'general'
    return initialSection
  })
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<AppSettingsAll | null>(null)
  const [backupInfo, setBackupInfo] = useState<BackupInfo | null>(null)

  const loadAll = useCallback(async () => {
    setLoading(true)
    const settingsRes = await window.api.settings.getAll()
    if (settingsRes.success && settingsRes.data) setSettings(settingsRes.data)
    if (isAdmin) {
      const backupRes = await window.api.backup.getInfo()
      if (backupRes.success && backupRes.data) setBackupInfo(backupRes.data)
    }
    setLoading(false)
  }, [isAdmin])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const navItems = useMemo(() => {
    const items: Array<{ key: SettingsSection; label: string }> = [
      { key: 'general', label: 'Kooperatif Bilgileri' },
      { key: 'password', label: 'Şifre Değiştir' }
    ]
    if (isAdmin) {
      items.push({ key: 'backup', label: 'Yedekleme Ayarları' })
      items.push({ key: 'sample', label: 'Örnek Veriler' })
    }
    return items
  }, [isAdmin])

  if (loading || !settings) {
    return <div className="page-loading">Ayarlar yükleniyor...</div>
  }

  return (
    <div className="settings-page simple-settings-page">
      {user && !user.has_security_question && section !== 'password' && (
        <div className="settings-security-hint settings-security-hint--page">
          Şifre kurtarma için{' '}
          <button type="button" className="settings-security-hint__link" onClick={() => setSection('password')}>
            güvenlik sorunuzu tanımlayın
          </button>
          .
        </div>
      )}

      <div className="settings-page__layout">
        <nav className="settings-nav">
          {navItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`settings-nav__item${section === item.key ? ' settings-nav__item--active' : ''}`}
              onClick={() => setSection(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="settings-page__content">
          {section === 'general' && (
            <CooperativeSection
              initial={settings.general}
              onSaved={(data) => setSettings(data)}
            />
          )}
          {section === 'password' && (
            <PasswordSection
              onSecurityUpdated={() => {
                refreshSession()
              }}
            />
          )}
          {section === 'backup' && isAdmin && (
            <BackupSettingsSection info={backupInfo} onRefresh={loadAll} />
          )}
          {section === 'sample' && isAdmin && <SampleDataSection />}
        </div>
      </div>
    </div>
  )
}
