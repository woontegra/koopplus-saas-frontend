import { useCallback, useEffect, useState } from 'react'

import { useNavigate, useSearchParams } from 'react-router-dom'

import type { Partner } from '@shared/types'
import { formatShareRatioTr, resolveShareRatio } from '@shared/shareRatio'

import DataPanel from '../../components/ui/DataPanel'
import { useAppKeyboard } from '../../hooks/useAppKeyboard'

import EmptyState from '../../components/ui/EmptyState'

import StatusBadge from '../../components/ui/StatusBadge'

import TableToolbar from '../../components/ui/TableToolbar'

import { formatDate, formatMoney } from '../../utils/format'

import PartnerFormModal from '../partners/PartnerFormModal'
import MemberImportModal from '../../components/member/MemberImportModal'
import { useAuth } from '../../auth/AuthContext'
import { useActionToast } from '../../hooks/useActionToast'
import { useAskDialog } from '../../hooks/useAskDialog'



function cityDistrict(partner: Partner): string {

  const city = partner.city?.trim()

  const district = partner.district?.trim()

  if (city && district) return `${city} / ${district}`

  return city || district || '—'

}



export default function SimpleMembersPage(): JSX.Element {

  const navigate = useNavigate()
  const { canWrite } = useAuth()
  const toast = useActionToast()
  const ask = useAskDialog()
  const [searchParams, setSearchParams] = useSearchParams()

  const [partners, setPartners] = useState<Partner[]>([])

  const [search, setSearch] = useState('')

  const [loading, setLoading] = useState(true)

  const [success, setSuccess] = useState('')

  const [error, setError] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [editPartner, setEditPartner] = useState<Partner | null>(null)
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null)

  const openEditForPartner = useCallback((partner: Partner): void => {
    void (async () => {
      const res = await window.api.partners.get(partner.id)
      if (res.success && res.data) setEditPartner(res.data)
      else setEditPartner(partner)
      setShowModal(true)
    })()
  }, [])

  useAppKeyboard({
    onF2: () => {
      if (showModal || showImportModal) return
      const partner = partners.find((item) => item.id === selectedMemberId)
      if (partner) openEditForPartner(partner)
    }
  })



  const load = useCallback(async () => {

    setLoading(true)

    setError('')

    const res = await window.api.partners.listWithDebtBalance({

      search: search.trim() || undefined

    })

    setLoading(false)

    if (res.success && res.data) setPartners(res.data)

    else setError(res.error ?? 'Üyeler yüklenemedi')

  }, [search])



  useEffect(() => {

    load()

  }, [load])



  useEffect(() => {

    if (searchParams.get('action') === 'new') {

      setEditPartner(null)

      setShowModal(true)

      setSearchParams({}, { replace: true })

    }

  }, [searchParams, setSearchParams])



  const openDetail = (partnerId: number): void => {

    navigate(`/uyeler/${partnerId}`)

  }



  const openEdit = async (partner: Partner): Promise<void> => {

    const res = await window.api.partners.get(partner.id)

    if (res.success && res.data) {

      setEditPartner(res.data)

      setShowModal(true)

      return

    }

    setEditPartner(partner)

    setShowModal(true)

  }



  const handleDelete = async (partner: Partner): Promise<void> => {

    const previewRes = await window.api.partners.getDeletePreview(partner.id)

    if (!previewRes.success || !previewRes.data) {
      toast.fail('Üye silinemedi', previewRes.error)
      return
    }



    const { has_records } = previewRes.data

    const confirmMessage = has_records

      ? 'Bu üyeye ait aidat ve ödeme kayıtları var. Üyeyi silerseniz bu kayıtlar da silinir. Devam etmek istiyor musunuz?'

      : 'Bu üye silinecek. Devam etmek istiyor musunuz?'



    if (!(await ask.confirm(confirmMessage))) return



    const deleteRes = await window.api.partners.delete(partner.id)

    if (deleteRes.success) {
      setSuccess(deleteRes.data?.message ?? 'Üye silindi.')
      toast.success('Üye silindi', 'Üye kaydı başarıyla silindi.')
      load()
    } else {
      toast.fail('Üye silinemedi', deleteRes.error)
    }

  }



  return (

    <div className="simple-members-page">

      {success && (

        <div className="alert alert-success" onAnimationEnd={() => setSuccess('')}>

          {success}

        </div>

      )}

      {error && <div className="alert alert-error">{error}</div>}



      <DataPanel

        title="Üyeler"

        subtitle="Kayıtlı kooperatif üyeleri"

        actions={
          <div className="simple-members-page__actions">
            {canWrite && (
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setShowImportModal(true)}
              >
                Excel&apos;den Üye Aktar
              </button>
            )}
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => {
                setEditPartner(null)
                setShowModal(true)
              }}
            >
              + Yeni Üye
            </button>
          </div>
        }

        noPadding

      >

        <TableToolbar meta={`${partners.length} üye`}>

          <input

            className="field-input field-input--search"

            placeholder="Üye no, ad, telefon..."

            value={search}

            onChange={(e) => setSearch(e.target.value)}

          />

        </TableToolbar>



        {loading ? (

          <div className="page-loading">Üyeler yükleniyor...</div>

        ) : partners.length === 0 ? (

          <EmptyState message="Kayıtlı üye bulunamadı." compact />

        ) : (
          <>
            <div className="mobile-card-list" aria-label="Üye kartları">
              {partners.map((p) => (
                <article
                  key={`card-${p.id}`}
                  className={`mobile-card${selectedMemberId === p.id ? ' is-selected' : ''}`}
                  onClick={() => setSelectedMemberId(p.id)}
                >
                  <div className="mobile-card__head">
                    <strong className="mobile-card__title">{p.full_name}</strong>
                    <StatusBadge active={p.is_active === 1} />
                  </div>
                  <dl className="mobile-card__meta">
                    <div>
                      <dt>Üye No</dt>
                      <dd className="cell-mono">{p.partner_no}</dd>
                    </div>
                    <div>
                      <dt>Telefon</dt>
                      <dd>{p.phone || '—'}</dd>
                    </div>
                    <div>
                      <dt>Bakiye</dt>
                      <dd className="money debit">{formatMoney(p.debt_balance ?? p.balance ?? 0)}</dd>
                    </div>
                    <div>
                      <dt>Pay</dt>
                      <dd className="cell-mono">
                        {formatShareRatioTr(resolveShareRatio(p.share_ratio, p.share_count))}
                      </dd>
                    </div>
                  </dl>
                  <div className="mobile-card__actions row-actions">
                    <button type="button" className="btn btn-sm" onClick={() => openDetail(p.id)}>
                      Detay
                    </button>
                    <button type="button" className="btn btn-sm" onClick={() => openEdit(p)}>
                      Düzenle
                    </button>
                    <button type="button" className="btn btn-sm btn-danger" onClick={() => handleDelete(p)}>
                      Sil
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <div className="table-wrap table-wrap--sticky-first desktop-only-table">
              <table className="data-table simple-members-table">
                <thead>
                  <tr>
                    <th>Üye No</th>
                    <th>Ad Soyad / Ünvan</th>
                    <th>Telefon</th>
                    <th className="simple-members-table__hide-narrow">E-posta</th>
                    <th className="simple-members-table__hide-narrow">İl / İlçe</th>
                    <th className="simple-members-table__hide-narrow">Giriş Tarihi</th>
                    <th className="text-right">Pay Oranı</th>
                    <th>Durum</th>
                    <th className="text-right">Bakiye</th>
                    <th className="text-center simple-members-table__actions-col">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {partners.map((p) => (
                    <tr
                      key={p.id}
                      className={selectedMemberId === p.id ? 'data-table__row--selected' : ''}
                      onClick={() => setSelectedMemberId(p.id)}
                      onDoubleClick={() => openEditForPartner(p)}
                    >
                      <td className="cell-mono">{p.partner_no}</td>
                      <td>
                        {p.full_name}
                        {p.interest_exempt === 1 && (
                          <span className="interest-exempt-badge">FAİZ MUAF</span>
                        )}
                      </td>
                      <td>{p.phone || '—'}</td>
                      <td className="cell-ellipsis simple-members-table__hide-narrow">{p.email || '—'}</td>
                      <td className="simple-members-table__hide-narrow">{cityDistrict(p)}</td>
                      <td className="simple-members-table__hide-narrow">
                        {p.join_date ? formatDate(p.join_date) : '—'}
                      </td>
                      <td className="text-right cell-mono">
                        {formatShareRatioTr(resolveShareRatio(p.share_ratio, p.share_count))}
                      </td>
                      <td>
                        <StatusBadge active={p.is_active === 1} />
                      </td>
                      <td className="money text-right debit">
                        {formatMoney(p.debt_balance ?? p.balance ?? 0)}
                        {(p.carried_forward_credit ?? 0) > 0.005 && (
                          <div className="simple-members-table__carried-forward">
                            Devreden: {formatMoney(p.carried_forward_credit ?? 0)}
                          </div>
                        )}
                      </td>
                      <td className="text-center">
                        <div className="row-actions">
                          <button type="button" className="btn btn-xs" onClick={() => openDetail(p.id)}>
                            Detay
                          </button>
                          <button type="button" className="btn btn-xs" onClick={() => openEdit(p)}>
                            Düzenle
                          </button>
                          <button
                            type="button"
                            className="btn btn-xs btn-danger"
                            onClick={() => handleDelete(p)}
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
          </>
        )}

      </DataPanel>



      {showImportModal && (
        <MemberImportModal
          onClose={() => setShowImportModal(false)}
          onImported={(message) => {
            setSuccess(message)
            toast.success('İçe aktarma tamamlandı', message || 'Üye listesi içe aktarıldı.')
            load()
          }}
        />
      )}

      {showModal && (

        <PartnerFormModal

          partner={editPartner}

          onClose={() => {

            setShowModal(false)

            setEditPartner(null)

          }}

          onSaved={() => {

            const wasEdit = !!editPartner

            setShowModal(false)

            setEditPartner(null)

            setSuccess(wasEdit ? 'Üye güncellendi.' : 'Yeni üye eklendi.')
            if (wasEdit) {
              toast.success('Üye güncellendi', 'Üye bilgileri başarıyla kaydedildi.')
            } else {
              toast.success('Üye kaydedildi', 'Üye bilgileri başarıyla kaydedildi.')
            }
            load()

          }}

        />

      )}

    </div>

  )

}


