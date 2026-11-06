import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type {
  HistoricalInterestApplyResult,
  HistoricalInterestPreviewResult,
  Partner,
  PartnerAccrualDebtOption
} from '../../shared/types'
import InterestPolicyInfoBar from './InterestPolicyInfoBar'
import DataPanel from '../ui/DataPanel'
import EmptyState from '../ui/EmptyState'
import StatPanel from '../ui/StatPanel'
import { interestStatusClass, isApplicableInterestStatus } from './historicalInterestUi'
import {
  formatDate,
  formatMoney,
  formatPeriod,
  MONTH_NAMES,
  todayISO
} from '../../utils/format'
import { useActionToast } from '../../hooks/useActionToast'
import { useAskDialog } from '../../hooks/useAskDialog'

type DebtScope = 'all' | 'selected'

interface DebtPreviewRow {
  ledger_entry_id: number
  period_label: string
  principal_amount: number
  due_date: string
  remaining_principal: number
  calculated_interest: number
  status_label: string
  preview: HistoricalInterestPreviewResult
}

function debtPeriodLabel(debt: PartnerAccrualDebtOption): string {
  if (debt.accrual_period_year && debt.accrual_period_month) {
    return formatPeriod(debt.accrual_period_year, debt.accrual_period_month)
  }
  return formatDate(debt.entry_date)
}

function buildStatusLabel(preview: HistoricalInterestPreviewResult): string {
  if (preview.summary.applicable_count > 0) {
    return `${preview.summary.applicable_count} ay faiz hesaplanacak`
  }
  if (preview.summary.missing_policy_count > 0) {
    return 'Faiz kararı eksik'
  }
  return 'İşlenecek faiz yok'
}

export default function SinglePartnerInterestTab(): JSX.Element {
  const toast = useActionToast()
  const ask = useAskDialog()
  const [partners, setPartners] = useState<Partner[]>([])
  const [partnerId, setPartnerId] = useState<number | ''>('')
  const [debts, setDebts] = useState<PartnerAccrualDebtOption[]>([])
  const [debtScope, setDebtScope] = useState<DebtScope>('all')
  const [ledgerEntryId, setLedgerEntryId] = useState<number | ''>('')
  const [endDate, setEndDate] = useState(todayISO())
  const [rows, setRows] = useState<DebtPreviewRow[]>([])
  const [selectedMonthlyPreview, setSelectedMonthlyPreview] =
    useState<HistoricalInterestPreviewResult | null>(null)
  const [loadingDebts, setLoadingDebts] = useState(false)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [creatingPolicy, setCreatingPolicy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<HistoricalInterestApplyResult | null>(null)
  const [policyMessage, setPolicyMessage] = useState('')

  useEffect(() => {
    window.api.partners.list({ is_active: 1 }).then((res) => {
      if (res.success && res.data) setPartners(res.data)
    })
  }, [])

  useEffect(() => {
    if (!partnerId) {
      setDebts([])
      setLedgerEntryId('')
      setRows([])
      setSelectedMonthlyPreview(null)
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
        setError(res.error ?? 'Borç listesi yüklenemedi')
      }
    })
  }, [partnerId])

  const eligibleDebts = useMemo(
    () =>
      debts.filter(
        (debt) =>
          debt.due_date &&
          debt.due_date < endDate &&
          debt.remaining_principal > 0
      ),
    [debts, endDate]
  )

  const targetDebts = useMemo(() => {
    if (debtScope === 'all') return eligibleDebts
    const selected = eligibleDebts.find((debt) => debt.ledger_entry_id === ledgerEntryId)
    return selected ? [selected] : []
  }, [debtScope, eligibleDebts, ledgerEntryId])

  const loadPreview = useCallback(async () => {
    if (!partnerId || targetDebts.length === 0) {
      setRows([])
      setSelectedMonthlyPreview(null)
      return
    }

    setLoadingPreview(true)
    setError('')
    setPolicyMessage('')

    const previewRows: DebtPreviewRow[] = []
    for (const debt of targetDebts) {
      const res = await window.api.interest.previewHistorical({
        partner_id: Number(partnerId),
        ledger_entry_id: debt.ledger_entry_id,
        end_date: endDate
      })
      if (res.success && res.data) {
        previewRows.push({
          ledger_entry_id: debt.ledger_entry_id,
          period_label: debtPeriodLabel(debt),
          principal_amount: res.data.principal_amount,
          due_date: res.data.due_date,
          remaining_principal: debt.remaining_principal,
          calculated_interest: res.data.summary.total_interest,
          status_label: buildStatusLabel(res.data),
          preview: res.data
        })
      } else {
        setError(res.error ?? 'Faiz ön izlemesi yüklenemedi')
        setLoadingPreview(false)
        return
      }
    }

    setRows(previewRows)
    setSelectedMonthlyPreview(
      debtScope === 'selected' && previewRows.length === 1 ? previewRows[0].preview : null
    )
    setLoadingPreview(false)
  }, [partnerId, targetDebts, endDate, debtScope])

  useEffect(() => {
    loadPreview()
  }, [loadPreview])

  const summary = useMemo(() => {
    const principalTotal = roundMoney(rows.reduce((sum, row) => sum + row.principal_amount, 0))
    const applicableMonths = rows.reduce((sum, row) => sum + row.preview.summary.applicable_count, 0)
    const missingMonths = rows.reduce(
      (sum, row) => sum + row.preview.summary.missing_policy_count,
      0
    )
    const totalInterest = roundMoney(rows.reduce((sum, row) => sum + row.calculated_interest, 0))
    return {
      principalTotal,
      applicableMonths,
      missingMonths,
      totalInterest,
      grandTotal: roundMoney(principalTotal + totalInterest)
    }
  }, [rows])

  const missingYears = useMemo(() => {
    const years = new Set<number>()
    for (const row of rows) {
      for (const year of row.preview.missing_policy_years) years.add(year)
    }
    return [...years].sort((a, b) => a - b)
  }, [rows])

  const policyGapWarning = useMemo(() => {
    if (summary.missingMonths <= 0) return null
    const totalMonths = rows.reduce((sum, row) => sum + row.preview.summary.total_months, 0)
    return `Bu borç için ${totalMonths} ay gecikme bulundu. Ancak ${summary.missingMonths} ay için faiz kararı olmadığı için sadece ${summary.applicableMonths} aya faiz hesaplandı. Eksik yıllar için Sistem Ayarları > Faiz Kararları bölümünden karar ekleyin.`
  }, [rows, summary.applicableMonths, summary.missingMonths])

  const handleCreateMissingYears = async (): Promise<void> => {
    if (missingYears.length === 0) return
    const confirmMsg = `${missingYears.join(', ')} yılları için aylık %5 aktif faiz kararı oluşturulacak. Devam edilsin mi?`
    if (!(await ask.confirm(confirmMsg))) return

    setCreatingPolicy(true)
    setPolicyMessage('')
    const res = await window.api.interestPolicies.createForYears({
      years: missingYears,
      monthly_rate: 5,
      is_active: 1,
      description_prefix: 'Geçmiş gecikme faizi'
    })
    setCreatingPolicy(false)

    if (res.success && res.data) {
      setPolicyMessage(res.data.message)
      toast.success('Faiz kararı kaydedildi', res.data.message)
      loadPreview()
    } else {
      setPolicyMessage(res.error ?? 'Faiz kararları eklenemedi')
      toast.fail('Faiz kararı kaydedilemedi', res.error)
    }
  }

  const handleApply = async (): Promise<void> => {
    if (!partnerId || rows.length === 0) return

    const applicableRows = rows.filter((row) => row.preview.summary.applicable_count > 0)
    if (applicableRows.length === 0) {
      setError('İşlenecek faiz kaydı bulunamadı.')
      return
    }

    const confirmMsg = [
      `${applicableRows.length} borç için geçmiş faiz işlenecek.`,
      `Toplam faiz: ${formatMoney(summary.totalInterest)}`,
      '',
      'Devam edilsin mi?'
    ].join('\n')
    if (!(await ask.confirm(confirmMsg))) return

    setSubmitting(true)
    setError('')
    setResult(null)

    let processed = 0
    let totalInterest = 0
    for (const row of applicableRows) {
      const res = await window.api.interest.applyHistorical({
        partner_id: Number(partnerId),
        ledger_entry_id: row.ledger_entry_id,
        end_date: endDate,
        description: `${row.period_label} geçmiş dönem faizi`
      })
      if (!res.success || !res.data) {
        setSubmitting(false)
        setError(res.error ?? 'Faiz işletme başarısız')
        toast.fail('Faiz işlemi tamamlanamadı', res.error)
        return
      }
      processed += res.data.processed_count
      totalInterest += res.data.total_interest
    }

    setSubmitting(false)
    setResult({
      run_id: 0,
      processed_count: processed,
      total_interest: roundMoney(totalInterest),
      total_principal: summary.principalTotal,
      skipped_count: 0,
      message: `${processed} ay için geçmiş faiz işlendi. Toplam: ${formatMoney(totalInterest)}`
    })
    toast.success(
      'Faiz işlemi tamamlandı',
      `${processed} ay için geçmiş faiz işlendi. Toplam: ${formatMoney(totalInterest)}`
    )
    loadPreview()
  }

  return (
    <div className="interest-tab">
      <InterestPolicyInfoBar calculationDate={endDate} missingYears={missingYears} />

      {error && <div className="alert alert-error">{error}</div>}
      {result && <div className="alert alert-success">{result.message}</div>}
      {policyMessage && (
        <div
          className={`alert ${policyMessage.includes('eklenemedi') ? 'alert-error' : 'alert-success'}`}
        >
          {policyMessage}
        </div>
      )}

      {policyGapWarning && (
        <div className="alert alert-policy-gap">
          <strong>Faiz kararı eksik dönemler var</strong>
          <p>{policyGapWarning}</p>
          {missingYears.length > 0 && (
            <p className="alert-policy-gap__detail">
              Eksik yıllar: {missingYears.join(', ')}
            </p>
          )}
          <div className="alert-policy-gap__actions">
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={handleCreateMissingYears}
              disabled={creatingPolicy}
            >
              {creatingPolicy ? 'Ekleniyor...' : 'Eksik Yıllara %5 Karar Ekle'}
            </button>
            <Link to="/ayarlar?section=interest" className="btn btn-sm">
              Faiz Kararlarına Git
            </Link>
          </div>
        </div>
      )}

      <DataPanel title="Tek Ortak Faizi" subtitle="Geçmiş aidat borçları için faiz hesaplama">
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
            <label>Hesaplama Tarihi</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value)
                setResult(null)
              }}
            />
          </div>
          <div className="form-group">
            <label>Borç Seçimi</label>
            <select
              value={debtScope}
              onChange={(e) => setDebtScope(e.target.value as DebtScope)}
              disabled={!partnerId}
            >
              <option value="all">Tüm vadesi geçmiş aidat borçları</option>
              <option value="selected">Seçili borç</option>
            </select>
          </div>
          {debtScope === 'selected' && (
            <div className="form-group">
              <label>Ana Borç</label>
              <select
                value={ledgerEntryId}
                disabled={!partnerId || loadingDebts || eligibleDebts.length === 0}
                onChange={(e) => setLedgerEntryId(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">
                  {loadingDebts
                    ? 'Yükleniyor...'
                    : eligibleDebts.length === 0
                      ? 'Vadesi geçmiş borç yok'
                      : 'Borç seçin'}
                </option>
                {eligibleDebts.map((debt) => (
                  <option key={debt.ledger_entry_id} value={debt.ledger_entry_id}>
                    {debtPeriodLabel(debt)} — {formatMoney(debt.remaining_principal)} kalan
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="accruals-form__actions">
          <button type="button" className="btn btn-sm" onClick={loadPreview} disabled={loadingPreview}>
            {loadingPreview ? 'Hesaplanıyor...' : 'Önizle'}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleApply}
            disabled={
              submitting ||
              loadingPreview ||
              rows.length === 0 ||
              summary.applicableMonths === 0
            }
          >
            {submitting ? 'İşleniyor...' : 'Faizleri İşlet'}
          </button>
        </div>
      </DataPanel>

      {!partnerId ? (
        <EmptyState message="Faiz hesaplamak için ortak seçin." compact />
      ) : loadingPreview && rows.length === 0 ? (
        <div className="page-loading">Faiz ön izlemesi hesaplanıyor...</div>
      ) : rows.length === 0 ? (
        <EmptyState message="Seçilen kriterlere uygun vadesi geçmiş borç bulunamadı." compact />
      ) : (
        <>
          <div className="interest-summary-grid interest-summary-grid--compact">
            <StatPanel label="Ana borç toplamı" value={formatMoney(summary.principalTotal)} variant="debit" />
            <StatPanel label="Faiz hesaplanan ay" value={summary.applicableMonths} variant="accent" />
            <StatPanel
              label="Faiz kararı olmayan ay"
              value={summary.missingMonths}
              variant={summary.missingMonths > 0 ? 'debit' : undefined}
            />
            <StatPanel label="Toplam faiz" value={formatMoney(summary.totalInterest)} variant="debit" />
            <StatPanel label="Ana borç + faiz" value={formatMoney(summary.grandTotal)} variant="debit" />
          </div>

          <DataPanel title="Borç Özeti" noPadding>
            <div className="table-wrap table-wrap--compact">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Borç Dönemi</th>
                    <th className="text-right">Ana Borç</th>
                    <th>Son Ödeme</th>
                    <th className="text-right">Kalan Ana Borç</th>
                    <th className="text-right">Hesaplanan Faiz</th>
                    <th>Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.ledger_entry_id}>
                      <td>{row.period_label}</td>
                      <td className="money debit">{formatMoney(row.principal_amount)}</td>
                      <td>{formatDate(row.due_date)}</td>
                      <td className="money debit">{formatMoney(row.remaining_principal)}</td>
                      <td className="money debit">{formatMoney(row.calculated_interest)}</td>
                      <td>{row.status_label}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DataPanel>

          {selectedMonthlyPreview && (
            <DataPanel title="Aylık Faiz Detayı" noPadding>
              <div className="table-wrap table-wrap--compact table-wrap--scroll-tall">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Ay/Yıl</th>
                      <th className="text-right">Kalan Ana Borç</th>
                      <th className="text-right">Faiz Oranı</th>
                      <th className="text-right">Faiz Tutarı</th>
                      <th>Durum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedMonthlyPreview.rows.map((row) => (
                      <tr
                        key={`${row.interest_period_year}-${row.interest_period_month}`}
                        className={isApplicableInterestStatus(row.status) ? 'row-risk' : 'row-muted'}
                      >
                        <td>
                          {MONTH_NAMES[row.interest_period_month - 1]} {row.interest_period_year}
                        </td>
                        <td className="money debit">{formatMoney(row.remaining_principal)}</td>
                        <td className="text-right">
                          {row.interest_rate > 0 ? `%${row.interest_rate}` : '—'}
                        </td>
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
            </DataPanel>
          )}
        </>
      )}
    </div>
  )
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}
