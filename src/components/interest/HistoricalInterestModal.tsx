import { useCallback, useEffect, useMemo, useState } from 'react'
import type { HistoricalInterestApplyResult, HistoricalInterestPreviewResult } from '../../shared/types'
import HistoricalInterestPreviewBody from './HistoricalInterestPreviewBody'
import InterestPolicyInfoBar from './InterestPolicyInfoBar'
import {
  formatDate,
  formatMoney,
  formatPeriod,
  todayISO
} from '../../utils/format'
import { useActionToast } from '../../hooks/useActionToast'
import { useAskDialog } from '../../hooks/useAskDialog'

interface HistoricalInterestModalProps {
  partnerId: number
  ledgerEntryId: number
  onClose: () => void
  onApplied?: () => void
}

export default function HistoricalInterestModal({
  partnerId,
  ledgerEntryId,
  onClose,
  onApplied
}: HistoricalInterestModalProps): JSX.Element {
  const toast = useActionToast()
  const ask = useAskDialog()
  const [endDate, setEndDate] = useState(todayISO())
  const [preview, setPreview] = useState<HistoricalInterestPreviewResult | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<HistoricalInterestApplyResult | null>(null)

  const defaultDescription = useMemo(() => {
    if (!preview?.accrual_period_year || !preview.accrual_period_month) {
      return 'Geçmiş dönem gecikme faizi'
    }
    return `${formatPeriod(preview.accrual_period_year, preview.accrual_period_month)} geçmiş dönem faizi`
  }, [preview])

  const loadPreview = useCallback(async () => {
    setLoadingPreview(true)
    setError('')
    const res = await window.api.interest.previewHistorical({
      partner_id: partnerId,
      ledger_entry_id: ledgerEntryId,
      end_date: endDate
    })
    setLoadingPreview(false)

    if (res.success && res.data) {
      setPreview(res.data)
    } else {
      setPreview(null)
      setError(res.error ?? 'Geçmiş dönem faiz ön izlemesi yüklenemedi')
    }
  }, [partnerId, ledgerEntryId, endDate])

  useEffect(() => {
    loadPreview()
  }, [loadPreview])

  const handleApply = async (): Promise<void> => {
    if (!preview || preview.summary.applicable_count === 0) {
      setError('İşlenecek geçmiş dönem faiz kaydı bulunamadı.')
      return
    }

    const confirmMsg = [
      `Ana borç: ${formatMoney(preview.principal_amount)}`,
      `Toplam faiz: ${formatMoney(preview.summary.total_interest)}`,
      `Toplam: ${formatMoney(preview.total_debt)}`,
      '',
      'Geçmiş faizleri işlemek istiyor musunuz?'
    ].join('\n')

    if (!(await ask.confirm(confirmMsg))) return

    setSubmitting(true)
    setError('')
    setResult(null)

    const res = await window.api.interest.applyHistorical({
      partner_id: partnerId,
      ledger_entry_id: ledgerEntryId,
      end_date: endDate,
      description: defaultDescription
    })

    setSubmitting(false)

    if (res.success && res.data) {
      setResult(res.data)
      toast.success('Faiz işlemi tamamlandı', res.data.message)
      onApplied?.()
      loadPreview()
    } else {
      setError(res.error ?? 'Geçmiş faiz işletme başarısız')
      toast.fail('Faiz işlemi tamamlanamadı', res.error)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal modal--wide modal--tall">
        <div className="modal-header">
          <h3>Geçmiş Gecikme Faizi</h3>
          <button type="button" className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">
          {error && <div className="alert alert-error">{error}</div>}
          {result && <div className="alert alert-success">{result.message}</div>}

          <InterestPolicyInfoBar
            calculationDate={endDate}
            missingYears={preview?.missing_policy_years ?? []}
          />

          <div className="interest-modal-summary">
            <div className="interest-modal-summary__item">
              <span>Ortak</span>
              <strong>
                {preview ? `${preview.partner_no} — ${preview.full_name}` : '—'}
              </strong>
            </div>
            <div className="interest-modal-summary__item">
              <span>Borç dönemi</span>
              <strong>
                {preview
                  ? formatPeriod(preview.accrual_period_year, preview.accrual_period_month)
                  : '—'}
              </strong>
            </div>
            <div className="interest-modal-summary__item">
              <span>Ana borç</span>
              <strong>{preview ? formatMoney(preview.principal_amount) : '—'}</strong>
            </div>
            <div className="interest-modal-summary__item">
              <span>Son ödeme tarihi</span>
              <strong>{preview ? formatDate(preview.due_date) : '—'}</strong>
            </div>
            <div className="interest-modal-summary__item">
              <span>Hesaplama tarihi</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value)
                  setResult(null)
                }}
              />
            </div>
          </div>

          <HistoricalInterestPreviewBody
            preview={preview}
            loadingPreview={loadingPreview}
            partnerId={partnerId}
            ledgerEntryId={ledgerEntryId}
            endDate={endDate}
            onPreviewRefresh={loadPreview}
          />

          <div className="settings-actions">
            <button type="button" className="btn btn-sm" onClick={onClose}>
              Kapat
            </button>
            <button type="button" className="btn btn-sm" onClick={loadPreview} disabled={loadingPreview}>
              Önizle
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleApply}
              disabled={
                submitting ||
                loadingPreview ||
                !preview ||
                preview.summary.applicable_count === 0
              }
            >
              {submitting ? 'İşleniyor...' : 'Faizleri İşlet'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

