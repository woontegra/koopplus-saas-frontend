import { useCallback, useEffect, useMemo, useState } from 'react'
import type {
  InterestPreviewResult,
  InterestRunResult
} from '../../shared/types'
import InterestPolicyInfoBar from './InterestPolicyInfoBar'
import DataPanel from '../ui/DataPanel'
import EmptyState from '../ui/EmptyState'
import StatPanel from '../ui/StatPanel'
import { interestStatusClass, isApplicableInterestStatus } from './historicalInterestUi'
import {
  formatDate,
  formatMoney,
  formatMonthYear,
  formatPeriod,
  MONTH_NAMES,
  todayISO
} from '../../utils/format'
import { buildYearOptions } from '../../shared/yearOptions'
import { useActionToast } from '../../hooks/useActionToast'
import { useAskDialog } from '../../hooks/useAskDialog'

export default function BulkInterestTab(): JSX.Element {
  const toast = useActionToast()
  const ask = useAskDialog()
  const now = new Date()
  const [periodMonth, setPeriodMonth] = useState(now.getMonth() + 1)
  const [periodYear, setPeriodYear] = useState(now.getFullYear())
  const [calculationDate, setCalculationDate] = useState(todayISO())
  const [description, setDescription] = useState('')
  const [preview, setPreview] = useState<InterestPreviewResult | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<InterestRunResult | null>(null)
  const [error, setError] = useState('')

  const yearOptions = useMemo(() => buildYearOptions(now.getFullYear()), [])

  const defaultDescription = useMemo(
    () => `${formatMonthYear(periodMonth, periodYear)} gecikme faizi`,
    [periodMonth, periodYear]
  )

  useEffect(() => {
    window.api.settings.getActivePeriod().then((res) => {
      if (res.success && res.data) {
        setPeriodMonth(res.data.month)
        setPeriodYear(res.data.year)
      }
    })
  }, [])

  const loadPreview = useCallback(async () => {
    setLoadingPreview(true)
    setError('')
    const res = await window.api.interest.preview(periodYear, periodMonth, calculationDate)
    setLoadingPreview(false)
    if (res.success && res.data) {
      setPreview(res.data)
    } else {
      setPreview(null)
      setError(res.error ?? 'Faiz ön izlemesi yüklenemedi')
    }
  }, [periodYear, periodMonth, calculationDate])

  useEffect(() => {
    loadPreview()
  }, [loadPreview])

  const policy = preview?.summary.policy ?? null
  const summary = preview?.summary

  const handleCreateRun = async (): Promise<void> => {
    if (!policy) {
      setError('Bu hesaplama tarihi için aktif faiz kararı bulunamadı.')
      return
    }
    if (!summary || summary.applicable_count === 0) {
      setError('İşlenecek faiz kaydı bulunamadı.')
      return
    }

    const confirmMsg = [
      `${formatPeriod(periodYear, periodMonth)} dönemi toplu gecikme faizi işlenecek.`,
      `Ortak: ${summary.partner_count} | Borç: ${summary.accrual_count}`,
      `Toplam ana borç: ${formatMoney(summary.total_remaining_principal)}`,
      `Toplam faiz: ${formatMoney(summary.total_interest)}`,
      '',
      'Onaylıyor musunuz?'
    ].join('\n')

    if (!(await ask.confirm(confirmMsg))) return

    setSubmitting(true)
    setError('')
    setResult(null)

    const res = await window.api.interest.createRun({
      period_year: periodYear,
      period_month: periodMonth,
      calculation_date: calculationDate,
      description: description.trim() || defaultDescription
    })

    setSubmitting(false)

    if (res.success && res.data) {
      setResult(res.data)
      toast.success('Faiz işlemi tamamlandı', res.data.message)
      loadPreview()
    } else {
      setError(res.error ?? 'Faiz işletme başarısız')
      toast.fail('Faiz işlemi tamamlanamadı', res.error)
    }
  }

  return (
    <div className="interest-tab">
      <InterestPolicyInfoBar calculationDate={calculationDate} />

      {error && <div className="alert alert-error">{error}</div>}
      {result && <div className="alert alert-success">{result.message}</div>}

      <DataPanel title="Toplu Faiz İşlet" subtitle="Tüm ortaklar için seçili ay gecikme faizi">
        <div className="form-grid">
          <div className="form-group">
            <label>Faiz Dönemi Ayı</label>
            <select value={periodMonth} onChange={(e) => setPeriodMonth(Number(e.target.value))}>
              {MONTH_NAMES.map((name, i) => (
                <option key={name} value={i + 1}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Faiz Dönemi Yılı</label>
            <select value={periodYear} onChange={(e) => setPeriodYear(Number(e.target.value))}>
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Hesaplama Tarihi</label>
            <input
              type="date"
              value={calculationDate}
              onChange={(e) => setCalculationDate(e.target.value)}
            />
          </div>
          <div className="form-group form-group--wide">
            <label>Açıklama (isteğe bağlı)</label>
            <input
              value={description}
              placeholder={defaultDescription}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <div className="accruals-form__actions">
          <button type="button" className="btn btn-sm" onClick={loadPreview} disabled={loadingPreview}>
            {loadingPreview ? 'Hesaplanıyor...' : 'Önizle'}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleCreateRun}
            disabled={
              submitting ||
              loadingPreview ||
              !policy ||
              (summary?.applicable_count ?? 0) === 0
            }
          >
            {submitting ? 'İşleniyor...' : 'Toplu Faizleri İşlet'}
          </button>
        </div>
      </DataPanel>

      {loadingPreview && !summary ? (
        <div className="page-loading">Faiz özeti hesaplanıyor...</div>
      ) : !summary ? (
        <EmptyState message="Ön izleme yüklenemedi." compact />
      ) : (
        <>
          <div className="interest-summary-grid interest-summary-grid--compact">
            <StatPanel label="Faiz uygulanacak ortak" value={summary.partner_count} />
            <StatPanel label="Faiz uygulanacak borç" value={summary.accrual_count} variant="accent" />
            <StatPanel
              label="Toplam ana borç"
              value={formatMoney(summary.total_remaining_principal)}
              variant="debit"
            />
            <StatPanel
              label="Toplam faiz"
              value={formatMoney(summary.total_interest)}
              variant="debit"
            />
          </div>

          <DataPanel title="Faiz Ön İzleme" noPadding>
            {preview.rows.length === 0 ? (
              <EmptyState message="Değerlendirilecek gecikmiş borç bulunamadı." compact />
            ) : (
              <div className="table-wrap table-wrap--compact table-wrap--scroll-tall">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Ortak</th>
                      <th>Borç Dönemi</th>
                      <th>Son Ödeme</th>
                      <th className="text-right">Kalan Ana Borç</th>
                      <th className="text-right">Faiz</th>
                      <th>Durum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((row) => (
                      <tr
                        key={row.related_ledger_entry_id}
                        className={isApplicableInterestStatus(row.status) ? 'row-risk' : 'row-muted'}
                      >
                        <td>
                          {row.partner_no} — {row.full_name}
                        </td>
                        <td>
                          {formatPeriod(row.accrual_period_year, row.accrual_period_month)}
                        </td>
                        <td>{formatDate(row.due_date)}</td>
                        <td className="money debit">{formatMoney(row.remaining_principal)}</td>
                        <td className="money debit">
                          {row.calculated_interest > 0 ? formatMoney(row.calculated_interest) : '—'}
                        </td>
                        <td>
                          <span className={`interest-status ${interestStatusClass(row.status)}`}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </DataPanel>
        </>
      )}
    </div>
  )
}
