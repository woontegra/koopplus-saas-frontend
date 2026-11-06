import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { CooperativeCreatePayload, CooperativeRecord } from '@shared/types'
import { requireTrialEmail, requireTurkishMobile } from '@shared/trialContact'
import { useCooperatives } from '../../context/CooperativeContext'
import DataPanel from '../../components/ui/DataPanel'
import DesktopTabs from '../../components/ui/DesktopTabs'
import EmptyState from '../../components/ui/EmptyState'
import CityDistrictFields from '../../components/ui/CityDistrictFields'
import { formatDateTime } from '../../utils/format'
import { useActionToast } from '../../hooks/useActionToast'

type TabKey = 'ACTIVE' | 'ARCHIVED'

const EMPTY_FORM: CooperativeCreatePayload = {
  cooperative_name: '',
  authorized_person: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  district: '',
  admin_full_name: '',
  admin_email: '',
  admin_phone: '',
  admin_password: '',
  admin_password_confirm: '',
  open_after_create: true
}

function validateCreateForm(form: CooperativeCreatePayload): string | null {
  if (!form.cooperative_name.trim()) return 'Kooperatif adı zorunludur.'
  if (!form.admin_full_name.trim()) return 'Yönetici adı soyadı zorunludur.'
  try {
    requireTrialEmail(form.admin_email)
  } catch (error) {
    return error instanceof Error ? error.message : 'Geçerli bir e-posta adresi girin.'
  }
  try {
    requireTurkishMobile(form.admin_phone)
  } catch (error) {
    return error instanceof Error ? error.message : 'Geçerli bir Türkiye cep telefonu girin.'
  }
  if (!form.admin_password) return 'Şifre boş olamaz.'
  if (form.admin_password.length < 6) return 'Şifre en az 6 karakter olmalıdır.'
  if (form.admin_password !== form.admin_password_confirm) return 'Şifreler eşleşmiyor.'
  return null
}

function statusLabel(status: CooperativeRecord['status']): string {
  return status === 'ARCHIVED' ? 'Arşivlenmiş' : 'Aktif'
}

export default function CooperativesPage(): JSX.Element {
  const toast = useActionToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const {
    cooperatives,
    currentId,
    openCooperative,
    createCooperative,
    archiveCooperative,
    unarchiveCooperative,
    loadError
  } = useCooperatives()

  const [tab, setTab] = useState<TabKey>('ACTIVE')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<CooperativeCreatePayload>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [actingId, setActingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setShowModal(true)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const filtered = useMemo(
    () => cooperatives.filter((item) => item.status === tab),
    [cooperatives, tab]
  )

  const activeCount = cooperatives.filter((item) => item.status === 'ACTIVE').length
  const archivedCount = cooperatives.filter((item) => item.status === 'ARCHIVED').length

  const handleCreate = async (): Promise<void> => {
    const validationError = validateCreateForm(form)
    if (validationError) {
      setError(validationError)
      return
    }
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const created = await createCooperative(form)
      setShowModal(false)
      setForm(EMPTY_FORM)
      const createdMessage = form.open_after_create
        ? `${created.name} oluşturuldu ve açıldı.`
        : `${created.name} oluşturuldu.`
      setMessage(createdMessage)
      toast.success('Kooperatif oluşturuldu', createdMessage)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Kooperatif oluşturulamadı'
      setError(message)
      toast.fail('Kooperatif oluşturulamadı', message)
    } finally {
      setSaving(false)
    }
  }

  const runAction = async (id: string, action: () => Promise<void>, success: string): Promise<void> => {
    setActingId(id)
    setError('')
    setMessage('')
    try {
      await action()
      setMessage(success)
      if (success.includes('arşivlendi')) {
        toast.success('Kooperatif arşivlendi', success)
      } else if (success.includes('arşivden')) {
        toast.success('Kooperatif geri alındı', success)
      } else {
        toast.success('Kooperatif açıldı', success)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'İşlem başarısız'
      setError(message)
      toast.fail('İşlem tamamlanamadı', message)
    } finally {
      setActingId(null)
    }
  }

  return (
    <div className="cooperatives-page">
      {loadError && <div className="alert alert-error">{loadError}</div>}
      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      <DataPanel
        title="Kooperatifler"
        subtitle="Aynı kurulumda birden fazla kooperatif dosyası yönetin"
        actions={
          <button type="button" className="btn btn-sm btn-primary" onClick={() => setShowModal(true)}>
            + Yeni Kooperatif
          </button>
        }
      >
        <DesktopTabs
          tabs={[
            { key: 'ACTIVE', label: `Aktif Kooperatifler (${activeCount})` },
            { key: 'ARCHIVED', label: `Arşivlenmiş Kooperatifler (${archivedCount})` }
          ]}
          active={tab}
          onChange={setTab}
        />

        {filtered.length === 0 ? (
          <EmptyState
            title={tab === 'ACTIVE' ? 'Aktif kooperatif yok' : 'Arşivlenmiş kooperatif yok'}
            message={
              tab === 'ACTIVE'
                ? 'Yeni bir kooperatif oluşturarak ayrı bir hesap dosyası açabilirsiniz.'
                : 'Tamamlanan kooperatifler burada saklanır. Veriler silinmez.'
            }
          />
        ) : (
          <div className="coop-card-grid">
            {filtered.map((item) => {
              const isCurrent = item.id === currentId
              const busy = actingId === item.id
              return (
                <article
                  key={item.id}
                  className={`coop-card${isCurrent ? ' coop-card--current' : ''}${item.status === 'ARCHIVED' ? ' coop-card--archived' : ''}`}
                >
                  <div className="coop-card__top">
                    <h3 className="coop-card__name">{item.name}</h3>
                    <div className="coop-card__badges">
                      <span
                        className={`status-badge ${item.status === 'ACTIVE' ? 'status-badge--active' : 'status-badge--archived'}`}
                      >
                        {statusLabel(item.status)}
                      </span>
                      {isCurrent && <span className="status-badge status-badge--current">Şu anda açık</span>}
                    </div>
                  </div>
                  <dl className="coop-card__meta">
                    <div>
                      <dt>Oluşturulma</dt>
                      <dd>{formatDateTime(item.created_at)}</dd>
                    </div>
                    <div>
                      <dt>Son açılma</dt>
                      <dd>{item.last_opened_at ? formatDateTime(item.last_opened_at) : '—'}</dd>
                    </div>
                  </dl>
                  <div className="coop-card__actions">
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      disabled={busy || isCurrent}
                      onClick={() =>
                        void runAction(item.id, () => openCooperative(item.id), `${item.name} açıldı.`)
                      }
                    >
                      {isCurrent ? 'Açık' : 'Aç'}
                    </button>
                    {item.status === 'ACTIVE' ? (
                      <button
                        type="button"
                        className="btn btn-sm"
                        disabled={busy}
                        onClick={() =>
                          void runAction(item.id, () => archiveCooperative(item.id), `${item.name} arşivlendi.`)
                        }
                      >
                        Arşivle
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-sm"
                        disabled={busy}
                        onClick={() =>
                          void runAction(
                            item.id,
                            () => unarchiveCooperative(item.id),
                            `${item.name} arşivden çıkarıldı.`
                          )
                        }
                      >
                        Arşivden Çıkar
                      </button>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </DataPanel>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal modal--wide">
            <div className="modal-header">
              <h3>Yeni Kooperatif</h3>
            </div>
            <div className="modal-body">
              <p className="coop-create-hint">
                Yeni kooperatif ayrı bir veritabanı dosyasında tutulur. Mevcut kooperatifin üyeleri,
                aidatları, hesapları ve kullanıcıları kopyalanmaz.
              </p>
              <h4 className="coop-create-section">Kooperatif Bilgileri</h4>
              <div className="form-grid form-grid--2">
                <div className="form-group form-group--wide">
                  <label>Kooperatif Adı *</label>
                  <input
                    value={form.cooperative_name}
                    onChange={(e) => setForm({ ...form, cooperative_name: e.target.value })}
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label>Yetkili Kişi</label>
                  <input
                    value={form.authorized_person ?? ''}
                    onChange={(e) => setForm({ ...form, authorized_person: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Telefon</label>
                  <input
                    value={form.phone ?? ''}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>E-posta</label>
                  <input
                    type="email"
                    value={form.email ?? ''}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Adres</label>
                  <input
                    value={form.address ?? ''}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </div>
                <CityDistrictFields
                  city={form.city ?? ''}
                  district={form.district ?? ''}
                  onChange={(nextCity, nextDistrict) =>
                    setForm({ ...form, city: nextCity, district: nextDistrict })
                  }
                />
              </div>
              <h4 className="coop-create-section">Yönetici Hesabı</h4>
              <p className="coop-create-hint">
                Bu kullanıcı yalnızca yeni kooperatifin ilk yöneticisidir. Yetkili kişi alanından ayrıdır.
              </p>
              <div className="form-grid form-grid--2">
                <div className="form-group">
                  <label>Ad Soyad *</label>
                  <input
                    value={form.admin_full_name}
                    onChange={(e) => setForm({ ...form, admin_full_name: e.target.value })}
                    autoComplete="off"
                  />
                </div>
                <div className="form-group">
                  <label>E-posta Adresi *</label>
                  <input
                    type="email"
                    value={form.admin_email}
                    onChange={(e) => setForm({ ...form, admin_email: e.target.value })}
                    autoComplete="off"
                  />
                </div>
                <div className="form-group">
                  <label>Telefon Numarası *</label>
                  <input
                    value={form.admin_phone}
                    onChange={(e) => setForm({ ...form, admin_phone: e.target.value })}
                    inputMode="tel"
                    autoComplete="off"
                    placeholder="05XX XXX XX XX"
                  />
                </div>
                <div className="form-group">
                  <label>Şifre *</label>
                  <input
                    type="password"
                    value={form.admin_password}
                    onChange={(e) => setForm({ ...form, admin_password: e.target.value })}
                    autoComplete="new-password"
                  />
                </div>
                <div className="form-group">
                  <label>Şifre Tekrar *</label>
                  <input
                    type="password"
                    value={form.admin_password_confirm}
                    onChange={(e) => setForm({ ...form, admin_password_confirm: e.target.value })}
                    autoComplete="new-password"
                  />
                </div>
              </div>
              <label className="coop-create-open">
                <input
                  type="checkbox"
                  checked={Boolean(form.open_after_create)}
                  onChange={(e) => setForm({ ...form, open_after_create: e.target.checked })}
                />
                Oluşturduktan sonra bu kooperatifi aç
              </label>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-sm"
                disabled={saving}
                onClick={() => {
                  setShowModal(false)
                  setForm(EMPTY_FORM)
                }}
              >
                Vazgeç
              </button>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                disabled={saving}
                onClick={() => void handleCreate()}
              >
                {saving ? 'Oluşturuluyor...' : 'Kooperatif Oluştur'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
