import { useCallback, useMemo, useState } from 'react'
import type { Partner } from '@shared/types'
import { parseMoneyInput } from '@shared/moneyInput'
import { formatShareRatioTr, resolveShareRatio } from '@shared/shareRatio'
import PartnerSearchSelect from '../partners/PartnerSearchSelect'
import MoneyAmountInput from '../ui/MoneyAmountInput'
import { MONTH_NAMES } from '../../utils/format'
import { resolveActivePeriod } from '../../utils/usage'
import { useActionToast } from '../../hooks/useActionToast'

interface AddDueModalProps {
  partners: Partner[]
  initialPartnerId?: number
  onClose: () => void
  onSaved: () => void
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}

export default function AddDueModal({
  partners,
  initialPartnerId,
  onClose,
  onSaved
}: AddDueModalProps): JSX.Element {
  const toast = useActionToast()
  const active = resolveActivePeriod()
  const [partnerId, setPartnerId] = useState<number | ''>(initialPartnerId ?? '')
  const [periodYear, setPeriodYear] = useState(active.year)
  const [selectedMonths, setSelectedMonths] = useState<number[]>([])
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const parsedAmount = useMemo(() => parseMoneyInput(amount) ?? 0, [amount])

  const toggleMonth = useCallback((month: number) => {
    setSelectedMonths((prev) =>
      prev.includes(month) ? prev.filter((m) => m !== month) : [...prev, month].sort((a, b) => a - b)
    )
    setSuccessMsg('')
  }, [])

  const selectAll = useCallback(() => {
    setSelectedMonths(Array.from({ length: 12 }, (_, i) => i + 1))
    setSuccessMsg('')
  }, [])

  const clearAll = useCallback(() => {
    setSelectedMonths([])
    setSuccessMsg('')
  }, [])

  const totalAmount = useMemo(() => {
    if (parsedAmount <= 0 || selectedMonths.length === 0) return 0
    return parsedAmount * selectedMonths.length
  }, [parsedAmount, selectedMonths])

  const selectedPartner = useMemo(
    () => partners.find((p) => p.id === partnerId),
    [partners, partnerId]
  )

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')

    if (!partnerId) {
      setError('Üye seçilmelidir.')
      return
    }
    if (selectedMonths.length === 0) {
      setError('En az bir dönem ayı seçilmelidir.')
      return
    }
    if (!amount.trim()) {
      setError('Aidat tutarı girilmelidir.')
      return
    }
    if (parsedAmount <= 0) {
      setError('Aidat tutarı 0\'dan büyük olmalıdır.')
      return
    }

    setSubmitting(true)

    const res = await window.api.memberDebtTable.createMultipleDues({
      partner_id: Number(partnerId),
      period_year: periodYear,
      period_months: selectedMonths,
      amount: parsedAmount,
      description: description.trim() || null
    })
    setSubmitting(false)

    if (res.success && res.data) {
      if (res.data.created_count > 0) {
        setSuccessMsg(res.data.message)
        onSaved()
        setTimeout(() => onClose(), 1500)
      } else {
        setError(res.data.message)
        toast.warn('Aidat kaydedilemedi', res.data.message)
      }
    } else {
      setError(res.error ?? 'Aidat kaydedilemedi')
      toast.fail('Aidat kaydedilemedi', res.error)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>Aidat Gir</h3>
          <button type="button" className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <form className="modal-body" onSubmit={handleSubmit}>
          {error && <div className="alert alert-error">{error}</div>}
          {successMsg && <div className="alert alert-success">{successMsg}</div>}

          <div className="form-grid form-grid--2">
            <div className="form-group form-group--wide">
              <label>Üye *</label>
              <PartnerSearchSelect
                partners={partners}
                value={partnerId}
                onChange={setPartnerId}
              />
              {selectedPartner ? (
                <p className="form-hint">
                  Üyenin pay oranı: {formatShareRatioTr(resolveShareRatio(selectedPartner.share_ratio, selectedPartner.share_count))}
                </p>
              ) : null}
            </div>

            <div className="form-group">
              <label>Dönem Yılı *</label>
              <input
                type="number"
                value={periodYear}
                onChange={(e) => setPeriodYear(Number(e.target.value))}
              />
            </div>

            <div className="form-group">
              <label>Aidat Tutarı *</label>
              <MoneyAmountInput
                value={amount}
                onValueChange={(value) => { setAmount(value); setSuccessMsg('') }}
                placeholder="4.000,00"
              />
            </div>

            <div className="form-group form-group--wide">
              <label>Açıklama</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Opsiyonel açıklama"
              />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '0.25rem' }}>
            <label>Dönem Ayları *</label>
            <div className="month-checkbox-grid">
              <div className="month-checkbox-grid__actions">
                <button type="button" className="btn-link" onClick={selectAll}>Tümünü Seç</button>
                <button type="button" className="btn-link" onClick={clearAll}>Temizle</button>
                {selectedMonths.length > 0 && (
                  <span className="month-checkbox-grid__count">{selectedMonths.length} ay seçildi</span>
                )}
              </div>
              <div className="month-checkbox-grid__list">
                {MONTH_NAMES.map((name, i) => {
                  const month = i + 1
                  const checked = selectedMonths.includes(month)
                  return (
                    <label key={month} className={`month-checkbox-grid__item${checked ? ' month-checkbox-grid__item--checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleMonth(month)}
                      />
                      <span>{name}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          </div>

          {selectedMonths.length > 1 && (
            <div className="month-multi-info">
              Birden fazla ay seçildiğinde son ödeme tarihi her ayın son günü olarak oluşturulur.
            </div>
          )}

          {selectedMonths.length > 0 && parsedAmount > 0 && (
            <div className="month-multi-summary">
              {selectedMonths.length} ay seçildi. Toplam <strong>{formatMoney(totalAmount)} ₺</strong> aidat oluşturulacak.
            </div>
          )}

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
