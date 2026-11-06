import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { MemberPaymentScope, Partner } from '@shared/types'
import { parseMoneyInput } from '@shared/moneyInput'
import PartnerSearchSelect from '../partners/PartnerSearchSelect'
import MoneyAmountInput from '../ui/MoneyAmountInput'
import { todayISO } from '../../utils/format'
import { useActionToast } from '../../hooks/useActionToast'

export interface OpenAidatPeriodOption {
  year: number
  month: number
  label: string
}

interface AddPaymentModalProps {
  partners: Partner[]
  initialPartnerId?: number
  openPeriods?: OpenAidatPeriodOption[]
  onClose: () => void
  onSaved: () => void
}

function partnerLabel(partner: Partner): string {
  return `${partner.partner_no} — ${partner.full_name}`
}

export default function AddPaymentModal({
  partners,
  initialPartnerId,
  openPeriods = [],
  onClose,
  onSaved
}: AddPaymentModalProps): JSX.Element | null {
  const toast = useActionToast()
  const titleId = useId()
  const modalRef = useRef<HTMLDivElement>(null)
  const amountInputRef = useRef<HTMLInputElement>(null)
  const [partnerId, setPartnerId] = useState<number | ''>(initialPartnerId ?? '')
  const [paymentDate, setPaymentDate] = useState(todayISO())
  const [amount, setAmount] = useState('')
  const [paymentScope, setPaymentScope] = useState<MemberPaymentScope>('GENERAL')
  const [targetPeriod, setTargetPeriod] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const lockedPartner = initialPartnerId
    ? partners.find((partner) => partner.id === initialPartnerId) ?? null
    : null

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && !submitting) {
        event.preventDefault()
        onClose()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose, submitting])

  useEffect(() => {
    const focusTimer = window.requestAnimationFrame(() => {
      amountInputRef.current?.focus()
    })
    return () => window.cancelAnimationFrame(focusTimer)
  }, [])

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    const parsedAmount = parseMoneyInput(amount)
    if (!partnerId || parsedAmount == null || parsedAmount <= 0) {
      setError('Üye, tarih ve tutar zorunludur')
      return
    }
    const target = targetPeriod.split('-').map(Number)
    if (paymentScope === 'PERIOD' && (target.length !== 2 || !target[0] || !target[1])) {
      setError('Belirli dönem ödemesi için açık aidat dönemi seçin')
      return
    }

    setSubmitting(true)
    setError('')
    const res = await window.api.memberDebtTable.createPayment({
      partner_id: Number(partnerId),
      payment_date: paymentDate,
      amount: parsedAmount,
      payment_scope: paymentScope,
      target_period_year: paymentScope === 'PERIOD' ? target[0] : null,
      target_period_month: paymentScope === 'PERIOD' ? target[1] : null,
      description: description.trim() || null
    })
    setSubmitting(false)

    if (res.success) {
      onSaved()
    } else {
      setError(res.error ?? 'Ödeme kaydedilemedi')
      toast.fail('Tahsilat kaydedilemedi', res.error)
    }
  }

  return createPortal(
    <div
      className="modal-overlay"
      onMouseDown={(event) => {
        if (!submitting && event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        ref={modalRef}
        className="modal modal--wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h3 id={titleId}>Tahsilat</h3>
          <button type="button" className="modal-close" onClick={onClose} disabled={submitting}>
            ×
          </button>
        </div>
        <form className="modal-body" onSubmit={handleSubmit}>
          {error && <div className="alert alert-error">{error}</div>}
          <p className="settings-hint">
            Genel ödemede önce aidat faiz/borçları, ardından ek borçlar kapatılır.
          </p>
          <div className="form-grid form-grid--2">
            <div className="form-group form-group--wide">
              <label>Üye *</label>
              {lockedPartner ? (
                <input type="text" value={partnerLabel(lockedPartner)} readOnly disabled />
              ) : (
                <PartnerSearchSelect
                  partners={partners}
                  value={partnerId}
                  onChange={setPartnerId}
                  allowEmpty={false}
                  disabled={submitting}
                />
              )}
            </div>
            <div className="form-group">
              <label>Ödeme Tarihi *</label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                disabled={submitting}
                autoFocus={!lockedPartner}
              />
            </div>
            <div className="form-group">
              <label>Ödenen Tutar *</label>
              <MoneyAmountInput
                ref={amountInputRef}
                value={amount}
                onValueChange={setAmount}
                disabled={submitting}
                autoFocus={!!lockedPartner}
              />
            </div>
            <div className="form-group">
              <label>Ödeme Türü</label>
              <select
                value={paymentScope}
                onChange={(e) => setPaymentScope(e.target.value as MemberPaymentScope)}
                disabled={submitting}
              >
                <option value="GENERAL">Genel Ödeme</option>
                <option value="PERIOD">Belirli Döneme Ödeme</option>
                <option value="AIDAT_ONLY">Sadece Aidat Borcuna</option>
                <option value="EXTRA_ONLY">Sadece Ek Borçlara</option>
              </select>
            </div>
            {paymentScope === 'PERIOD' && (
              <div className="form-group">
                <label>Aidat Dönemi *</label>
                <select
                  value={targetPeriod}
                  onChange={(e) => setTargetPeriod(e.target.value)}
                  disabled={submitting}
                >
                  <option value="">Dönem seçin</option>
                  {openPeriods.map((period) => (
                    <option key={`${period.year}-${period.month}`} value={`${period.year}-${period.month}`}>
                      {period.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="form-group full-width">
              <label>Açıklama</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tahsilatla ilgili açıklama, not veya detay yazabilirsiniz..."
                className="member-payment-description"
                disabled={submitting}
              />
            </div>
          </div>
          <div className="settings-actions">
            <button type="button" className="btn btn-sm" onClick={onClose} disabled={submitting}>
              İptal
            </button>
            <button type="submit" className="btn btn-sm btn-primary" disabled={submitting}>
              {submitting ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
