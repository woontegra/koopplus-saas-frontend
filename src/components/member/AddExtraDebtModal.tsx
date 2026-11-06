import { useEffect, useState } from 'react'
import type { MemberExtraDebtType, Partner } from '@shared/types'
import { parseMoneyInput } from '@shared/moneyInput'
import { MEMBER_EXTRA_DEBT_TYPE_LABELS } from '@shared/cashCategories'
import MoneyAmountInput from '../ui/MoneyAmountInput'
import PartnerSearchSelect from '../partners/PartnerSearchSelect'
import { todayISO } from '../../utils/format'
import { useActionToast } from '../../hooks/useActionToast'

const DEBT_TYPES: MemberExtraDebtType[] = ['NOTARY_NOTICE', 'SEREFIYE', 'OTHER']

interface AddExtraDebtModalProps {
  partners: Partner[]
  initialPartnerId?: number
  onClose: () => void
  onSaved: () => void
}

export default function AddExtraDebtModal({
  partners,
  initialPartnerId,
  onClose,
  onSaved
}: AddExtraDebtModalProps): JSX.Element {
  const toast = useActionToast()
  const [partnerId, setPartnerId] = useState<number | ''>(initialPartnerId ?? '')
  const [debtType, setDebtType] = useState<MemberExtraDebtType>('NOTARY_NOTICE')
  const [debtDate, setDebtDate] = useState(todayISO())
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [interestEnabled, setInterestEnabled] = useState(false)
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (debtType === 'NOTARY_NOTICE') {
      setInterestEnabled(false)
    }
  }, [debtType])

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    const parsedAmount = parseMoneyInput(amount)
    if (!partnerId || parsedAmount == null || parsedAmount <= 0) {
      setError('Üye, tarih ve tutar zorunludur')
      return
    }

    setSubmitting(true)
    setError('')
    const res = await window.api.memberExtraDebts.create({
      partner_id: Number(partnerId),
      debt_date: debtDate,
      debt_type: debtType,
      amount: parsedAmount,
      due_date: dueDate || null,
      interest_enabled: debtType === 'NOTARY_NOTICE' ? 0 : interestEnabled ? 1 : 0,
      description: description.trim() || null
    })
    setSubmitting(false)

    if (res.success) {
      onSaved()
      onClose()
    } else {
      setError(res.error ?? 'Ek borç kaydedilemedi')
      toast.fail('Ek borç kaydedilemedi', res.error)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>Ek Borç Gir</h3>
          <button type="button" className="btn btn-sm" onClick={onClose}>
            Kapat
          </button>
        </div>
        <form className="modal-body" onSubmit={handleSubmit}>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="form-grid form-grid--2">
            <div className="form-group form-group--wide">
              <label>Üye *</label>
              <PartnerSearchSelect
                partners={partners}
                value={partnerId}
                onChange={setPartnerId}
              />
            </div>
            <div className="form-group">
              <label>İşlem Türü *</label>
              <select
                value={debtType}
                onChange={(e) => setDebtType(e.target.value as MemberExtraDebtType)}
              >
                {DEBT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {MEMBER_EXTRA_DEBT_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Tarih *</label>
              <input type="date" value={debtDate} onChange={(e) => setDebtDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Tutar *</label>
              <MoneyAmountInput value={amount} onValueChange={setAmount} />
            </div>
            <div className="form-group">
              <label>Son Ödeme Tarihi</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Faiz İşlesin mi?</label>
              <select
                value={interestEnabled ? '1' : '0'}
                disabled={debtType === 'NOTARY_NOTICE'}
                onChange={(e) => setInterestEnabled(e.target.value === '1')}
              >
                <option value="0">Hayır</option>
                <option value="1">Evet</option>
              </select>
            </div>
            <div className="form-group form-group--wide">
              <label>Açıklama</label>
              <input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-sm" onClick={onClose}>
              İptal
            </button>
            <button type="submit" className="btn btn-sm btn-primary" disabled={submitting}>
              {submitting ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
