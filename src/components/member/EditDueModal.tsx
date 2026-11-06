import { useEffect, useState } from 'react'
import type { MemberDebtTableRow } from '@shared/types'
import { formatMoneyInputFromNumber, parseMoneyInput } from '@shared/moneyInput'
import MoneyAmountInput from '../ui/MoneyAmountInput'
import { MONTH_NAMES } from '../../utils/format'
import { useActionToast } from '../../hooks/useActionToast'

interface EditDueModalProps {
  row: MemberDebtTableRow
  partnerId: number
  onClose: () => void
  onSaved: () => void
}

export default function EditDueModal({
  row,
  partnerId,
  onClose,
  onSaved
}: EditDueModalProps): JSX.Element {
  const toast = useActionToast()
  const [periodMonth, setPeriodMonth] = useState(row.period_month)
  const [periodYear, setPeriodYear] = useState(row.period_year)
  const [amount, setAmount] = useState(formatMoneyInputFromNumber(row.monthly_due))
  const [dueDate, setDueDate] = useState(row.due_date)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    window.api.memberDebtTable.defaultDueDate(periodYear, periodMonth).then((res) => {
      if (res.success && res.data && dueDate === row.due_date) {
        // keep user value unless period changed
      }
    })
  }, [periodYear, periodMonth, dueDate, row.due_date])

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    const parsedAmount = parseMoneyInput(amount)
    if (parsedAmount == null || parsedAmount <= 0) {
      setError('Geçerli bir tutar girin')
      return
    }

    setSubmitting(true)
    setError('')
    const res = await window.api.memberDebtTable.updateDue(row.ledger_entry_id, partnerId, {
      period_year: periodYear,
      period_month: periodMonth,
      amount: parsedAmount,
      due_date: dueDate
    })
    setSubmitting(false)

    if (res.success) {
      onSaved()
      onClose()
    } else {
      setError(res.error ?? 'Güncellenemedi')
      toast.fail('Aidat güncellenemedi', res.error)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>Aidat Düzenle — {row.period_label}</h3>
          <button type="button" className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <form className="modal-body" onSubmit={handleSubmit}>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="form-grid form-grid--2">
            <div className="form-group">
              <label>Dönem Ayı</label>
              <select
                value={periodMonth}
                onChange={(e) => setPeriodMonth(Number(e.target.value))}
              >
                {MONTH_NAMES.map((name, index) => (
                  <option key={name} value={index + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Dönem Yılı</label>
              <input
                type="number"
                value={periodYear}
                onChange={(e) => setPeriodYear(Number(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label>Aidat Tutarı</label>
              <MoneyAmountInput value={amount} onValueChange={setAmount} />
            </div>
            <div className="form-group">
              <label>Son Ödeme Tarihi</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
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
