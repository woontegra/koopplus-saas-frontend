import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { Partner } from '@shared/types'
import MemberInfoPanel from '../../components/member/MemberInfoPanel'
import DataPanel from '../../components/ui/DataPanel'
import { formatMoney } from '../../utils/format'
import PartnerFormModal from '../partners/PartnerFormModal'
import { useActionToast } from '../../hooks/useActionToast'
import { useAskDialog } from '../../hooks/useAskDialog'

export default function SimpleMemberDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useActionToast()
  const ask = useAskDialog()
  const partnerId = Number(id)
  const [partner, setPartner] = useState<Partner | null>(null)
  const [debtBalance, setDebtBalance] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showEditModal, setShowEditModal] = useState(false)

  const load = useCallback(async () => {
    if (!Number.isFinite(partnerId) || partnerId <= 0) {
      setError('Geçersiz üye kaydı.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    const [partnerRes, listRes] = await Promise.all([
      window.api.partners.get(partnerId),
      window.api.partners.listWithDebtBalance()
    ])
    setLoading(false)

    if (partnerRes.success && partnerRes.data) {
      setPartner(partnerRes.data)
      const balanceRow = listRes.success
        ? listRes.data?.find((item) => item.id === partnerId)
        : undefined
      setDebtBalance(balanceRow?.debt_balance ?? balanceRow?.balance ?? 0)
    } else {
      setPartner(null)
      setError(partnerRes.error ?? 'Üye kaydı bulunamadı.')
    }
  }, [partnerId])

  useEffect(() => {
    load()
  }, [load])

  const handleDelete = async (): Promise<void> => {
    if (!partner) return

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
      toast.success('Üye silindi', 'Üye kaydı başarıyla silindi.')
      navigate('/uyeler')
    } else {
      toast.fail('Üye silinemedi', deleteRes.error)
    }
  }

  if (loading) {
    return <div className="page-loading">Üye bilgileri yükleniyor...</div>
  }

  if (error || !partner) {
    return (
      <div className="simple-member-detail-page">
        <div className="alert alert-error">{error || 'Üye kaydı bulunamadı.'}</div>
        <button type="button" className="btn btn-sm" onClick={() => navigate('/uyeler')}>
          ← Üyelere Dön
        </button>
      </div>
    )
  }

  return (
    <div className="simple-member-detail-page">
      {success && (
        <div className="alert alert-success" onAnimationEnd={() => setSuccess('')}>
          {success}
        </div>
      )}

      <DataPanel title="Üye Detayı" subtitle="Kayıtlı üye bilgileri">
        <MemberInfoPanel partner={partner} variant="full" />

        <div className="member-detail-summary">
          <span>
            <strong>Güncel Borç:</strong> {formatMoney(debtBalance)}
          </span>
        </div>

        <div className="member-detail-actions">
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => navigate(`/uye-borc-tablosu/${partner.id}`)}
          >
            Borç Tablosu Aç
          </button>
          <button type="button" className="btn btn-sm" onClick={() => setShowEditModal(true)}>
            Düzenle
          </button>
          <button type="button" className="btn btn-sm btn-danger" onClick={handleDelete}>
            Sil
          </button>
          <button type="button" className="btn btn-sm" onClick={() => navigate('/uyeler')}>
            ← Üyelere Dön
          </button>
        </div>
      </DataPanel>

      {showEditModal && (
        <PartnerFormModal
          partner={partner}
          onClose={() => setShowEditModal(false)}
          onSaved={() => {
            setShowEditModal(false)
            setSuccess('Üye bilgileri güncellendi.')
            toast.success('Üye güncellendi', 'Üye bilgileri başarıyla kaydedildi.')
            load()
          }}
        />
      )}
    </div>
  )
}
