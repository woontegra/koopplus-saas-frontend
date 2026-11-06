import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import { deactivatePartner, getPartner } from '../api/partners'
import type { Partner } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { canWriteMembers } from '../auth/roles'
import MemberFormModal from '../components/members/MemberFormModal'
import { formatDateTr, formatMoneyTr, formatShareRatioTr } from '../utils/format'

function cityDistrict(partner: Partner): string {
  const city = partner.city?.trim()
  const district = partner.district?.trim()
  if (city && district) return `${city} / ${district}`
  return city || district || '—'
}

function DetailRow({ label, value }: { label: string; value: ReactNode }): JSX.Element {
  return (
    <div className="member-detail__row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

export default function MemberDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>()
  const { token, tenantId, activeRole } = useAuth()
  const canWrite = canWriteMembers(activeRole)

  const [partner, setPartner] = useState<Partner | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [deactivating, setDeactivating] = useState(false)

  const load = useCallback(async () => {
    if (!token || !tenantId || !id) return
    setLoading(true)
    setError('')
    try {
      const data = await getPartner(id, { token, tenantId })
      setPartner(data.partner)
    } catch (err) {
      setPartner(null)
      setError(err instanceof ApiError ? err.message : 'Üye yüklenemedi')
    } finally {
      setLoading(false)
    }
  }, [token, tenantId, id])

  useEffect(() => {
    void load()
  }, [load])

  const onDeactivate = async (): Promise<void> => {
    if (!canWrite || !token || !tenantId || !partner || !partner.isActive) return
    const ok = window.confirm(
      'Üye pasif yapılacak. Kayıtlar silinmez; listede pasif olarak görünür. Devam edilsin mi?'
    )
    if (!ok) return
    setDeactivating(true)
    setError('')
    try {
      const data = await deactivatePartner(partner.id, { token, tenantId })
      setPartner(data.partner)
      setSuccess('Üye pasif yapıldı.')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Pasife alma başarısız')
    } finally {
      setDeactivating(false)
    }
  }

  if (loading) {
    return (
      <section className="data-panel">
        <div className="data-panel__body">
          <p className="placeholder-copy">Üye yükleniyor…</p>
        </div>
      </section>
    )
  }

  if (!partner) {
    return (
      <section className="data-panel">
        <div className="data-panel__header">
          <h1 className="data-panel__title">Üye Detayı</h1>
        </div>
        <div className="data-panel__body">
          {error ? <div className="alert alert-error">{error}</div> : null}
          <Link className="btn btn--ghost" to="/uyeler">
            ← Üyelere Dön
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="data-panel member-detail">
      <div className="data-panel__header member-detail__header">
        <div>
          <p className="member-detail__eyebrow">Üye No {partner.partnerNo}</p>
          <h1 className="data-panel__title">{partner.fullName}</h1>
          <div className="member-detail__badges">
            <span
              className={
                partner.isActive
                  ? 'status-badge status-badge--active'
                  : 'status-badge status-badge--inactive'
              }
            >
              {partner.isActive ? 'Aktif' : 'Pasif'}
            </span>
            {partner.interestExempt ? (
              <span className="status-badge status-badge--exempt">Faiz muaf</span>
            ) : null}
          </div>
        </div>
        <div className="member-detail__actions">
          <Link className="btn btn--ghost" to="/uyeler">
            ← Üyelere Dön
          </Link>
          {canWrite ? (
            <>
              <button type="button" className="btn btn--primary" onClick={() => setShowModal(true)}>
                Düzenle
              </button>
              {partner.isActive ? (
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => void onDeactivate()}
                  disabled={deactivating}
                >
                  Pasif Yap
                </button>
              ) : null}
            </>
          ) : null}
        </div>
      </div>

      <div className="data-panel__body">
        {error ? <div className="alert alert-error">{error}</div> : null}
        {success ? <div className="alert alert-success">{success}</div> : null}

        <div className="member-detail__balance">
          <span>Güncel bakiye</span>
          <strong>{formatMoneyTr(partner.balance)}</strong>
          <em>Backend hesaplaması · yerel hesap yok</em>
        </div>

        <dl className="member-detail__grid">
          <DetailRow label="Telefon" value={partner.phone?.trim() || '—'} />
          <DetailRow label="E-posta" value={partner.email?.trim() || '—'} />
          <DetailRow label="T.C. / Vergi No" value={partner.taxId?.trim() || '—'} />
          <DetailRow label="Giriş Tarihi" value={formatDateTr(partner.joinDate)} />
          <DetailRow label="İl / İlçe" value={cityDistrict(partner)} />
          <DetailRow label="Pay Oranı" value={formatShareRatioTr(partner.shareRatio)} />
          <DetailRow label="Devreden Bakiye" value={formatMoneyTr(partner.openingBalance)} />
          <DetailRow
            label="Faiz muafiyeti"
            value={
              partner.interestExempt
                ? partner.interestExemptNote?.trim() || 'Evet'
                : 'Hayır'
            }
          />
          <DetailRow label="Adres" value={partner.address?.trim() || '—'} />
          <DetailRow label="Not" value={partner.notes?.trim() || '—'} />
        </dl>

        <p className="member-detail__note">
          Üye silme arayüzü bu aşamada kapalıdır. Soft-delete ledger/ödeme cascade riski için
          rapor bölümüne bakın; pasife alma kayıtları korur.
        </p>
      </div>

      {showModal && canWrite ? (
        <MemberFormModal
          partner={partner}
          onClose={() => setShowModal(false)}
          onSaved={(updated) => {
            setPartner(updated)
            setShowModal(false)
            setSuccess('Üye güncellendi.')
          }}
        />
      ) : null}
    </section>
  )
}
