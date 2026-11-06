import { useCallback, useEffect, useMemo, useState } from 'react'
import type {
  HistoricalInterestApplyResult,
  HistoricalInterestPreviewResult,
  Partner,
  PartnerAccrualDebtOption
} from '../../shared/types'
import HistoricalInterestPreviewBody from './HistoricalInterestPreviewBody'
import DataPanel from '../ui/DataPanel'
import EmptyState from '../ui/EmptyState'
import {
  formatDate,
  formatMoney,
  formatPeriod,
  todayISO
} from '../../utils/format'
import { useActionToast } from '../../hooks/useActionToast'
import { useAskDialog } from '../../hooks/useAskDialog'

function debtLabel(debt: PartnerAccrualDebtOption): string {
  const period =
    debt.accrual_period_year && debt.accrual_period_month
      ? formatPeriod(debt.accrual_period_year, debt.accrual_period_month)
      : formatDate(debt.entry_date)
  return `${period} — ${debt.entry_type} — ${formatMoney(debt.remaining_principal)} kalan`
}

export default function HistoricalInterestPanel(): JSX.Element {
  const toast = useActionToast()
  const ask = useAskDialog()
  const [partners, setPartners] = useState<Partner[]>([])
  const [partnerId, setPartnerId] = useState<number | ''>('')
  const [debts, setDebts] = useState<PartnerAccrualDebtOption[]>([])
  const [ledgerEntryId, setLedgerEntryId] = useState<number | ''>('')
  const [endDate, setEndDate] = useState(todayISO())
  const [description, setDescription] = useState('')

  const [preview, setPreview] = useState<HistoricalInterestPreviewResult | null>(null)
  const [loadingDebts, setLoadingDebts] = useState(false)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<HistoricalInterestApplyResult | null>(null)

  const selectedDebt = useMemo(
    () => debts.find((debt) => debt.ledger_entry_id === ledgerEntryId) ?? null,
    [debts, ledgerEntryId]
  )

  const defaultDescription = useMemo(() => {
    if (!selectedDebt?.accrual_period_year || !selectedDebt.accrual_period_month) {
      return 'Geçmiş dönem gecikme faizi'
    }
    return `${formatPeriod(selectedDebt.accrual_period_year, selectedDebt.accrual_period_month)} geçmiş dönem faizi`
  }, [selectedDebt])

  useEffect(() => {
    window.api.partners.list({ is_active: 1 }).then((res) => {
      if (res.success && res.data) setPartners(res.data)
    })
  }, [])

  useEffect(() => {
    if (!partnerId) {
      setDebts([])
      setLedgerEntryId('')
      setPreview(null)
      return
    }

    setLoadingDebts(true)
    window.api.interest.listPartnerDebts(Number(partnerId)).then((res) => {
      setLoadingDebts(false)
      if (res.success && res.data) {
        setDebts(res.data)
        setLedgerEntryId(res.data[0]?.ledger_entry_id ?? '')
      } else {
        setDebts([])
        setLedgerEntryId('')
        setError(res.error ?? 'Ana borç listesi yüklenemedi')
      }
    })
  }, [partnerId])

  const loadPreview = useCallback(async () => {
    if (!partnerId || !ledgerEntryId) {
      setPreview(null)
      return
    }

    setLoadingPreview(true)
    setError('')
    const res = await window.api.interest.previewHistorical({
      partner_id: Number(partnerId),
      ledger_entry_id: Number(ledgerEntryId),
      end_date: endDate,
      description: description.trim() || undefined
    })
    setLoadingPreview(false)

    if (res.success && res.data) {
      setPreview(res.data)
    } else {
      setPreview(null)
      setError(res.error ?? 'Geçmiş dönem faiz ön izlemesi yüklenemedi')
    }
  }, [partnerId, ledgerEntryId, endDate, description])

  useEffect(() => {
    loadPreview()
  }, [loadPreview])

  const handleApply = async (): Promise<void> => {
    if (!partnerId || !ledgerEntryId || !preview) return

    const applicable = preview.summary.applicable_count
    if (applicable === 0) {
      setError('İşlenecek geçmiş dönem faiz kaydı bulunamadı.')
      return
    }

    const confirmMsg = [
      `${preview.partner_no} — ${preview.full_name}`,
      `${formatPeriod(preview.accrual_period_year, preview.accrual_period_month)} tahakkuk borcu`,
      `Son ödeme: ${formatDate(preview.due_date)} | Bitiş: ${formatDate(endDate)}`,
      `İşlenecek ay: ${applicable} | Atlanan ay: ${preview.summary.skipped_count}`,
      `Toplam faiz: ${formatMoney(preview.summary.total_interest)}`,
      '',
      'Geçmiş faizleri işlemek istiyor musunuz?'
    ].join('\n')

    if (!(await ask.confirm(confirmMsg))) return

    setSubmitting(true)
    setError('')
    setResult(null)

    const res = await window.api.interest.applyHistorical({
      partner_id: Number(partnerId),
      ledger_entry_id: Number(ledgerEntryId),
      end_date: endDate,
      description: description.trim() || defaultDescription
    })

    setSubmitting(false)

    if (res.success && res.data) {
      setResult(res.data)
      toast.success('Faiz işlemi tamamlandı', res.data.message)
      const debtsRes = await window.api.interest.listPartnerDebts(Number(partnerId))
      if (debtsRes.success && debtsRes.data) setDebts(debtsRes.data)
      loadPreview()
    } else {
      setError(res.error ?? 'Geçmiş faiz işletme başarısız')
      toast.fail('Faiz işlemi tamamlanamadı', res.error)
    }
  }

  return (
    <>
      {error && <div className="alert alert-error">{error}</div>}
      {result && <div className="alert alert-success">{result.message}</div>}

      <DataPanel title="Geçmiş Dönem Faiz Hesapla" subtitle="Tek tahakkuk borcu için ay ay faiz">
        <div className="form-grid">
          <div className="form-group">
            <label>Ortak</label>
            <select
              value={partnerId}
              onChange={(e) => {
                setPartnerId(e.target.value ? Number(e.target.value) : '')
                setResult(null)
              }}
            >
              <option value="">Ortak seçin</option>
              {partners.map((partner) => (
                <option key={partner.id} value={partner.id}>
                  {partner.partner_no} — {partner.full_name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Ana Borç / Tahakkuk</label>
            <select
              value={ledgerEntryId}
              disabled={!partnerId || loadingDebts || debts.length === 0}
              onChange={(e) => {
                setLedgerEntryId(e.target.value ? Number(e.target.value) : '')
                setResult(null)
              }}
            >
              <option value="">
                {loadingDebts ? 'Yükleniyor...' : debts.length === 0 ? 'Borç bulunamadı' : 'Borç seçin'}
              </option>
              {debts.map((debt) => (
                <option key={debt.ledger_entry_id} value={debt.ledger_entry_id}>
                  {debtLabel(debt)}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Son Ödeme Tarihi</label>
            <input type="date" value={selectedDebt?.due_date ?? ''} readOnly disabled />
          </div>

          <div className="form-group">
            <label>Bitiş Tarihi</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value)
                setResult(null)
              }}
            />
          </div>

          <div className="form-group form-group--wide">
            <label>Açıklama</label>
            <input
              value={description}
              placeholder={defaultDescription}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <div className="accruals-form__actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleApply}
            disabled={
              submitting ||
              loadingPreview ||
              !preview ||
              preview.summary.applicable_count === 0
            }
          >
            {submitting ? 'İşleniyor...' : 'Geçmiş Faizleri İşlet'}
          </button>
          <button type="button" className="btn btn-sm" onClick={loadPreview}>
            Önizlemeyi Yenile
          </button>
        </div>
      </DataPanel>

      <DataPanel title="Geçmiş Dönem Özet" subtitle={selectedDebt ? debtLabel(selectedDebt) : 'Borç seçilmedi'}>
        {!partnerId || !ledgerEntryId ? (
          <EmptyState message="Ön izleme için ortak ve ana borç seçin." compact />
        ) : (
          <HistoricalInterestPreviewBody
            preview={preview}
            loadingPreview={loadingPreview}
            partnerId={Number(partnerId)}
            ledgerEntryId={Number(ledgerEntryId)}
            endDate={endDate}
            onPreviewRefresh={loadPreview}
          />
        )}
      </DataPanel>
    </>
  )
}
