import { useState } from 'react'
import type { MemberPaymentHistoryItem } from '@shared/types'
import { formatMoneyInputFromNumber, parseMoneyInput } from '@shared/moneyInput'
import MoneyAmountInput from '../ui/MoneyAmountInput'
import { useActionToast } from '../../hooks/useActionToast'

interface EditPaymentModalProps {
  payment: MemberPaymentHistoryItem
  memberLabel: string
  partnerId: number
  onClose: () => void
  onSaved: () => void
}

export default function EditPaymentModal({
  payment,
  memberLabel,
  partnerId,
  onClose,
  onSaved
}: EditPaymentModalProps): JSX.Element {
  const toast = useActionToast()
  const [paymentDate, setPaymentDate] = useState(payment.payment_date)
  const [amount, setAmount] = useState(formatMoneyInputFromNumber(payment.amount))
  const [description, setDescription] = useState(payment.description ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    const parsedAmount = parseMoneyInput(amount)
    if (parsedAmount == null || parsedAmount <= 0) {
      setError('Geçerli bir tutar girin')
      return
    }

    setSubmitting(true)
    setError('')
    const res = await window.api.memberDebtTable.updatePayment(payment.payment_id, partnerId, {
      payment_date: paymentDate,
      amount: parsedAmount,
      description: description.trim() || null
    })
    setSubmitting(false)

    if (res.success) {
      onSaved()
      onClose()
    } else {
      setError(res.error ?? 'Ödeme kaydı güncellenemedi.')
      toast.fail('Tahsilat güncellenemedi', res.error)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>Ödeme Düzenle</h3>
          <button type="button" className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <form className="modal-body" onSubmit={handleSubmit}>
          {payment.is_bank_import && (
            <div className="alert alert-warning">
              Bu ödeme banka aktarımıyla oluşmuştur. Tarih veya tutarı değiştirirseniz banka
              ekstresiyle birebir uyum bozulabilir.
            </div>
          )}
          {error && <div className="alert alert-error">{error}</div>}
          <div className="form-grid form-grid--2">
            <div className="form-group form-group--wide">
              <label>Üye</label>
              <input type="text" value={memberLabel} readOnly disabled />
            </div>
            <div className="form-group">
              <label>Kaynak</label>
              <input type="text" value={payment.source_label ?? 'Manuel Ödeme'} readOnly disabled />
            </div>
            <div className="form-group">
              <label>Ödeme Tarihi</label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Ödeme Tutarı</label>
              <MoneyAmountInput value={amount} onValueChange={setAmount} />
            </div>
            <div className="form-group form-group--wide">
              <label>Açıklama</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
          <div className="settings-actions">
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
