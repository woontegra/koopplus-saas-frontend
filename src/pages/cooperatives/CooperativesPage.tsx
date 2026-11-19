import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { CooperativeRecord } from '@shared/types'
import { useAuth } from '../../auth/AuthContext'
import { useCooperatives } from '../../context/CooperativeContext'
import DataPanel from '../../components/ui/DataPanel'
import DesktopTabs from '../../components/ui/DesktopTabs'
import EmptyState from '../../components/ui/EmptyState'
import { useAskDialog } from '../../hooks/useAskDialog'
import { useActionToast } from '../../hooks/useActionToast'
import { platformApi, platformErrorMessage } from '../../platform/platformApi'
import { formatDate, formatDateTime } from '../../utils/format'
import { desktopAuthRequest } from '../../desktopApi/apiResult'
import CityDistrictFields from '../../components/ui/CityDistrictFields'

/** Web sitesindeki KoopPlus satın alma sayfası (ek kooperatif lisansı). */
export const KOOPPLUS_PURCHASE_URL = 'https://www.woontegra.com/yazilimlar/kooperatif-yonetim-yazilimi'

interface EntitlementSummary {
  total: number
  used: number
  remaining: number
  nextExpiresAt: string | null
}

type TabKey = 'ACTIVE' | 'ARCHIVED'

function statusLabel(status: CooperativeRecord['status']): string {
  return status === 'ARCHIVED' ? 'Arşivlenmiş' : 'Aktif'
}

export default function CooperativesPage(): JSX.Element {
  const toast = useActionToast()
  const ask = useAskDialog()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user, memberships, tenantId, clearTenant, refreshSession } = useAuth()
  const isPlatformAdmin = Boolean(user?.isPlatformAdmin)
  const { cooperatives, currentId, openCooperative, reload, loadError } = useCooperatives()

  const [tab, setTab] = useState<TabKey>('ACTIVE')
  const [actingId, setActingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [entitlement, setEntitlement] = useState<EntitlementSummary | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCity, setNewCity] = useState('')
  const [newDistrict, setNewDistrict] = useState('')
  const [creating, setCreating] = useState(false)

  const loadEntitlement = useCallback(async (): Promise<void> => {
    const res = await desktopAuthRequest<EntitlementSummary>('/api/cooperatives/entitlement')
    if (res.success && res.data) setEntitlement(res.data)
  }, [])

  useEffect(() => {
    if (isPlatformAdmin) return
    void loadEntitlement()
  }, [isPlatformAdmin, loadEntitlement])

  const remaining = entitlement?.remaining ?? 0

  const resetCreateForm = (): void => {
    setShowCreate(false)
    setNewName('')
    setNewCity('')
    setNewDistrict('')
  }

  const runCreate = async (): Promise<void> => {
    const name = newName.trim()
    if (name.length < 2) {
      setError('Kooperatif adı en az 2 karakter olmalı.')
      return
    }
    setCreating(true)
    setError('')
    setMessage('')
    try {
      const res = await desktopAuthRequest<{ cooperative: { id: string; name: string } }>('/api/cooperatives', {
        method: 'POST',
        body: { name, city: newCity, district: newDistrict }
      })
      if (!res.success || !res.data) throw new Error(res.error || 'Kooperatif açılamadı')
      await refreshSession()
      await reload()
      await loadEntitlement()
      resetCreateForm()
      const success = `${res.data.cooperative.name} açıldı. Listeden “Aç” ile geçiş yapabilirsiniz.`
      setMessage(success)
      toast.success('Kooperatif açıldı', success)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'İşlem başarısız'
      setError(msg)
      toast.fail('Kooperatif açılamadı', msg)
    } finally {
      setCreating(false)
    }
  }

  useEffect(() => {
    if (searchParams.get('action') !== 'new') return
    setSearchParams({}, { replace: true })
    if (isPlatformAdmin) {
      navigate('/platform?create=1', { replace: true })
    } else {
      // Üst menüdeki “+ Yeni Kooperatif”: hakkı varsa form açılır, yoksa ek lisans bilgisi görünür.
      setShowCreate(true)
    }
  }, [searchParams, setSearchParams, isPlatformAdmin, navigate])

  const membershipIds = useMemo(
    () => new Set(memberships.map((m) => m.tenantId)),
    [memberships]
  )

  const visible = useMemo(
    () => cooperatives.filter((item) => membershipIds.has(item.id)),
    [cooperatives, membershipIds]
  )

  const filtered = useMemo(() => visible.filter((item) => item.status === tab), [visible, tab])

  const activeCount = visible.filter((item) => item.status === 'ACTIVE').length
  const archivedCount = visible.filter((item) => item.status === 'ARCHIVED').length

  const runOpen = async (id: string, name: string): Promise<void> => {
    setActingId(id)
    setError('')
    setMessage('')
    try {
      await openCooperative(id)
      setMessage(`${name} açıldı.`)
      toast.success('Kooperatif açıldı', `${name} açıldı.`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'İşlem başarısız'
      setError(msg)
      toast.fail('İşlem tamamlanamadı', msg)
    } finally {
      setActingId(null)
    }
  }

  const runArchiveToggle = async (
    item: CooperativeRecord,
    nextStatus: 'ARCHIVED' | 'ACTIVE'
  ): Promise<void> => {
    if (!isPlatformAdmin) return
    const label = nextStatus === 'ARCHIVED' ? 'Arşivlenmiş' : 'Aktif'
    if (nextStatus === 'ARCHIVED') {
      const ok = await ask.confirm(
        `“${item.name}” durumu “${label}” yapılacak. Kullanıcılar bu kooperatife giriş yapamaz.`,
        { title: 'Durum Değiştir', confirmLabel: 'Uygula', variant: 'warning' }
      )
      if (!ok) return
    }

    setActingId(item.id)
    setError('')
    setMessage('')
    try {
      await platformApi.setStatus(item.id, nextStatus)
      if (tenantId === item.id && nextStatus === 'ARCHIVED') {
        clearTenant()
      }
      await refreshSession()
      await reload()
      const success =
        nextStatus === 'ARCHIVED'
          ? `${item.name} arşivlendi.`
          : `${item.name} arşivden çıkarıldı.`
      setMessage(success)
      toast.success(
        nextStatus === 'ARCHIVED' ? 'Kooperatif arşivlendi' : 'Kooperatif geri alındı',
        success
      )
    } catch (err) {
      const msg = platformErrorMessage(err)
      setError(msg)
      toast.fail('İşlem tamamlanamadı', msg)
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
        subtitle="Yetkili olduğunuz kooperatifler arasında geçiş yapın"
        actions={
          isPlatformAdmin ? (
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => navigate('/platform?create=1')}
            >
              + Yeni Kooperatif
            </button>
          ) : remaining > 0 ? (
            <button
              type="button"
              className="btn btn-sm btn-primary"
              disabled={showCreate}
              onClick={() => setShowCreate(true)}
            >
              + Yeni Kooperatif
            </button>
          ) : undefined
        }
      >
        {!isPlatformAdmin && entitlement && (
          <div className="alert alert-info coop-entitlement-info" role="status">
            {entitlement.total > 0 ? (
              <span>
                Kooperatif hakkınız: <strong>{entitlement.used} / {entitlement.total}</strong> kullanıldı
                {' · '}Kalan: <strong>{entitlement.remaining}</strong>
                {entitlement.nextExpiresAt ? ` · Geçerlilik: ${formatDate(entitlement.nextExpiresAt)}` : ''}
              </span>
            ) : null}
            {remaining === 0 && (
              <span>
                {entitlement.total > 0 ? ' ' : ''}Yeni kooperatif eklemek için ek lisans gerekir.{' '}
                <a href={KOOPPLUS_PURCHASE_URL} target="_blank" rel="noopener noreferrer">
                  Ek lisans satın al
                </a>
              </span>
            )}
          </div>
        )}

        {!isPlatformAdmin && showCreate && remaining > 0 && (
          <form
            className="coop-create-form"
            onSubmit={(e) => {
              e.preventDefault()
              void runCreate()
            }}
          >
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="new-coop-name">Kooperatif Adı *</label>
                <input
                  id="new-coop-name"
                  type="text"
                  value={newName}
                  maxLength={200}
                  autoFocus
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <CityDistrictFields
                city={newCity}
                district={newDistrict}
                onChange={(city, district) => {
                  setNewCity(city)
                  setNewDistrict(district)
                }}
              />
            </div>
            <p className="coop-create-form__hint">
              Bu işlem 1 kooperatif hakkınızı kullanır (kalan: {remaining}). Yeni kooperatifin yöneticisi siz
              olursunuz; lisansı otomatik etkinleşir.
            </p>
            <div className="coop-card__actions">
              <button type="submit" className="btn btn-sm btn-primary" disabled={creating}>
                {creating ? 'Açılıyor…' : 'Kooperatifi Aç'}
              </button>
              <button type="button" className="btn btn-sm" disabled={creating} onClick={resetCreateForm}>
                İptal
              </button>
            </div>
          </form>
        )}

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
                ? 'Yetkili olduğunuz aktif bir kooperatif bulunmuyor.'
                : 'Yetkili olduğunuz arşivlenmiş kooperatif bulunmuyor.'
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
                      disabled={busy || isCurrent || item.status === 'ARCHIVED'}
                      onClick={() => void runOpen(item.id, item.name)}
                    >
                      {isCurrent ? 'Açık' : 'Aç'}
                    </button>
                    {isPlatformAdmin &&
                      (item.status === 'ACTIVE' ? (
                        <button
                          type="button"
                          className="btn btn-sm"
                          disabled={busy}
                          onClick={() => void runArchiveToggle(item, 'ARCHIVED')}
                        >
                          Arşivle
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-sm"
                          disabled={busy}
                          onClick={() => void runArchiveToggle(item, 'ACTIVE')}
                        >
                          Arşivden Çıkar
                        </button>
                      ))}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </DataPanel>
    </div>
  )
}
