import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type {
  AccrualReportResult,
  DebtorPartnersReport,
  GeneralBalanceReport,
  InterestReportResult,
  NonPayingReport,
  Partner,
  PartnerLedgerPeriodPreset,
  PartnerLedgerReport,
  PaymentReportResult,
  ReportFilters,
  ReportType
} from '@shared/types'
import DataPanel from '../../components/ui/DataPanel'
import EmptyState from '../../components/ui/EmptyState'
import PartnerDebtSchedulePanel from '../../components/ledger/PartnerDebtSchedulePanel'
import StatPanel from '../../components/ui/StatPanel'
import TableToolbar from '../../components/ui/TableToolbar'
import PartnerLedgerView from '../../components/reports/PartnerLedgerView'
import MemberAccountStatementPanel from '../../components/reports/MemberAccountStatementPanel'
import PartnerSearchSelect from '../../components/partners/PartnerSearchSelect'
import { formatDate, formatMoney, MONTH_NAMES } from '../../utils/format'
import { resolveActivePeriod } from '../../utils/usage'
import { parseMoneyInput } from '@shared/moneyInput'
import MoneyAmountInput from '../../components/ui/MoneyAmountInput'
import { buildYearOptions } from '@shared/yearOptions'

const LEDGER_PERIOD_PRESETS: Array<{ value: PartnerLedgerPeriodPreset; label: string }> = [
  { value: 'all', label: 'Tüm dönemler' },
  { value: 'last_12_months', label: 'Son 12 Ay' },
  { value: 'this_year', label: 'Bu Yıl' },
  { value: 'last_year', label: 'Geçen Yıl' },
  { value: 'custom', label: 'Özel Tarih Aralığı' }
]

const REPORT_ITEMS: Array<{ key: ReportType; label: string }> = [
  { key: 'general-balance', label: 'Genel Bakiye' },
  { key: 'debtor-partners', label: 'Borçlu Üyeler' },
  { key: 'non-paying', label: 'Ödeme Yapmayan Üyeler' },
  { key: 'accrual', label: 'Tahakkuk Raporu' },
  { key: 'payment', label: 'Tahsilat Raporu' },
  { key: 'interest', label: 'Faiz Raporu' },
  { key: 'partner-ledger', label: 'Üye Cari Ekstresi' },
  { key: 'member-statement', label: 'Üye Hesap Ekstresi' },
  { key: 'partner-debt-schedule', label: 'Üye Borç Cetveli' }
]

const REPORT_TITLES: Record<ReportType, string> = {
  'general-balance': 'Genel Bakiye Raporu',
  'debtor-partners': 'Borçlu Üyeler Raporu',
  'non-paying': 'Ödeme Yapmayan Üyeler Raporu',
  accrual: 'Tahakkuk Raporu',
  payment: 'Tahsilat Raporu',
  interest: 'Faiz Raporu',
  'partner-ledger': 'Üye Cari Ekstresi',
  'member-statement': 'Üye Hesap Ekstresi',
  'partner-debt-schedule': 'Üye Borç Cetveli'
}


type ReportData =
  | GeneralBalanceReport
  | DebtorPartnersReport
  | NonPayingReport
  | AccrualReportResult
  | PaymentReportResult
  | InterestReportResult
  | PartnerLedgerReport
  | null

export default function ReportsPage(): JSX.Element {
  const [searchParams] = useSearchParams()
  const activeNow = resolveActivePeriod()

  const initialReport = (searchParams.get('report') as ReportType) || 'general-balance'
  const initialPartnerId = Number(searchParams.get('partnerId')) || 0

  const [reportType, setReportType] = useState<ReportType>(
    REPORT_ITEMS.some((r) => r.key === initialReport) ? initialReport : 'general-balance'
  )
  const [partners, setPartners] = useState<Partner[]>([])
  const [activePeriod, setActivePeriod] = useState({
    month: activeNow.month,
    year: activeNow.year
  })

  const [gbFilters, setGbFilters] = useState({
    is_active: null as number | null,
    balance_status: 'all' as 'all' | 'debtor' | 'creditor' | 'zero',
    search: ''
  })
  const [debtorFilters, setDebtorFilters] = useState({
    min_balance: 0,
    is_active: null as number | null,
    search: ''
  })
  const [debtorMinBalanceText, setDebtorMinBalanceText] = useState('')
  const [nonPayingFilters, setNonPayingFilters] = useState({
    period_month: activeNow.month,
    period_year: activeNow.year,
    is_active: null as number | null
  })
  const [accrualFilters, setAccrualFilters] = useState({
    period_month: 0,
    period_year: 0,
    search: '',
    partner_id: 0
  })
  const [paymentFilters, setPaymentFilters] = useState({
    date_from: '',
    date_to: '',
    payment_method: '' as '' | 'Nakit' | 'Banka' | 'POS' | 'Diğer',
    search: '',
    receipt_no: ''
  })
  const [interestFilters, setInterestFilters] = useState({
    period_month: 0,
    period_year: 0,
    date_from: '',
    date_to: '',
    search: '',
    partner_id: 0
  })
  const [ledgerFilters, setLedgerFilters] = useState({
    partner_id: initialPartnerId,
    period_preset: 'all' as PartnerLedgerPeriodPreset,
    start_month: '',
    end_month: '',
    date_to: ''
  })

  const [data, setData] = useState<ReportData>(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [isDetailPdfLoading, setIsDetailPdfLoading] = useState(false)
  const [isInterestPdfLoading, setIsInterestPdfLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    Promise.all([
      window.api.partners.list(),
      window.api.settings.getActivePeriod()
    ]).then(([partnersRes, periodRes]) => {
      if (partnersRes.success && partnersRes.data) setPartners(partnersRes.data)
      if (periodRes.success && periodRes.data) {
        setActivePeriod({ month: periodRes.data.month, year: periodRes.data.year })
        setNonPayingFilters((f) => ({
          ...f,
          period_month: periodRes.data!.month,
          period_year: periodRes.data!.year
        }))
        setAccrualFilters((f) => ({
          ...f,
          period_month: periodRes.data!.month,
          period_year: periodRes.data!.year
        }))
        setInterestFilters((f) => ({
          ...f,
          period_month: periodRes.data!.month,
          period_year: periodRes.data!.year
        }))
      }
    })
  }, [])

  useEffect(() => {
    if (initialPartnerId > 0) {
      setLedgerFilters((f) => ({ ...f, partner_id: initialPartnerId }))
      if (initialReport === 'partner-debt-schedule') {
        setReportType('partner-debt-schedule')
      } else {
        setReportType('partner-ledger')
      }
    }
  }, [initialPartnerId, initialReport])

  const currentFilters = useMemo((): ReportFilters => {
    switch (reportType) {
      case 'general-balance':
        return gbFilters
      case 'debtor-partners':
        return debtorFilters
      case 'non-paying':
        return nonPayingFilters
      case 'accrual':
        return {
          period_month: accrualFilters.period_month || undefined,
          period_year: accrualFilters.period_year || undefined,
          search: accrualFilters.search || undefined
        }
      case 'payment':
        return {
          date_from: paymentFilters.date_from || undefined,
          date_to: paymentFilters.date_to || undefined,
          payment_method: paymentFilters.payment_method || undefined,
          search: paymentFilters.search || undefined,
          receipt_no: paymentFilters.receipt_no || undefined
        }
      case 'interest':
        return {
          period_month: interestFilters.period_month || undefined,
          period_year: interestFilters.period_year || undefined,
          date_from: interestFilters.date_from || undefined,
          date_to: interestFilters.date_to || undefined,
          search: interestFilters.search || undefined
        }
      case 'partner-ledger':
        return {
          partner_id: ledgerFilters.partner_id,
          period_preset: ledgerFilters.period_preset,
          start_month: ledgerFilters.period_preset === 'custom' ? ledgerFilters.start_month || null : null,
          end_month: ledgerFilters.period_preset === 'custom' ? ledgerFilters.end_month || null : null,
          date_to: ledgerFilters.date_to || undefined
        }
      default:
        return gbFilters
    }
  }, [
    reportType,
    gbFilters,
    debtorFilters,
    nonPayingFilters,
    accrualFilters,
    paymentFilters,
    interestFilters,
    ledgerFilters
  ])

  const loadReport = useCallback(async () => {
    if (reportType === 'partner-debt-schedule' || reportType === 'member-statement') {
      setData(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    setData(null)
    try {
      if (reportType === 'partner-ledger' && !ledgerFilters.partner_id) {
        setData(null)
        setLoading(false)
        return
      }

      let res: { success: boolean; data?: ReportData; error?: string }

      switch (reportType) {
        case 'general-balance':
          res = await window.api.reports.generalBalance(gbFilters)
          break
        case 'debtor-partners':
          res = await window.api.reports.debtorPartners(debtorFilters)
          break
        case 'non-paying':
          res = await window.api.reports.nonPayingPartners(nonPayingFilters)
          break
        case 'accrual':
          res = await window.api.reports.accrualReport({
            period_month: accrualFilters.period_month || undefined,
            period_year: accrualFilters.period_year || undefined,
            search: accrualFilters.search || undefined
          })
          break
        case 'payment':
          res = await window.api.reports.paymentReport({
            date_from: paymentFilters.date_from || undefined,
            date_to: paymentFilters.date_to || undefined,
            payment_method: paymentFilters.payment_method || undefined,
            search: paymentFilters.search || undefined,
            receipt_no: paymentFilters.receipt_no || undefined
          })
          break
        case 'interest':
          res = await window.api.reports.interestReport({
            period_month: interestFilters.period_month || undefined,
            period_year: interestFilters.period_year || undefined,
            date_from: interestFilters.date_from || undefined,
            date_to: interestFilters.date_to || undefined,
            search: interestFilters.search || undefined
          })
          break
        case 'partner-ledger':
          res = await window.api.reports.partnerLedger({
            partner_id: ledgerFilters.partner_id,
            period_preset: ledgerFilters.period_preset,
            start_month:
              ledgerFilters.period_preset === 'custom' ? ledgerFilters.start_month || null : null,
            end_month:
              ledgerFilters.period_preset === 'custom' ? ledgerFilters.end_month || null : null,
            date_to: ledgerFilters.date_to || undefined
          })
          break
        default:
          res = { success: false, error: 'Geçersiz rapor' }
      }

      if (res.success && res.data) {
        setData(res.data)
      } else {
        setError(res.error ?? 'Rapor yüklenemedi')
        setData(null)
      }
    } catch {
      setError('Rapor yüklenemedi')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [
    reportType,
    gbFilters,
    debtorFilters,
    nonPayingFilters,
    accrualFilters,
    paymentFilters,
    interestFilters,
    ledgerFilters
  ])

  useEffect(() => {
    loadReport()
  }, [loadReport])

  const handleExport = async (): Promise<void> => {
    if (reportType === 'partner-debt-schedule') {
      setError('Üye borç cetveli Excel dışa aktarımı rapor ekranındaki panelden yapılır.')
      return
    }
    if (reportType === 'partner-ledger' && !ledgerFilters.partner_id) {
      setError('Excel aktarımı için üye seçin.')
      return
    }
    setExporting(true)
    setError('')
    setMessage('')
    try {
      const res = await window.api.reports.exportExcel(reportType, currentFilters)
      if (res.success && res.data) {
        setMessage(`Excel dosyası kaydedildi: ${res.data.file_path}`)
      } else if (res.error !== 'Kayıt konumu seçilmedi') {
        setError(res.error ?? 'Excel aktarımı başarısız')
      }
    } catch {
      setError('Excel aktarımı başarısız. Lütfen tekrar deneyin.')
    } finally {
      setExporting(false)
    }
  }

  const handleExportPdfDetailed = async (): Promise<void> => {
    if (reportType !== 'partner-ledger' || !ledgerFilters.partner_id) {
      setError('PDF almak için üye cari ekstresi raporunda üye seçin.')
      return
    }
    setIsDetailPdfLoading(true)
    setError('')
    setMessage('')
    try {
      const res = await window.api.documents.savePartnerLedgerPdf({
        partner_id: ledgerFilters.partner_id,
        period_preset: ledgerFilters.period_preset,
        start_month:
          ledgerFilters.period_preset === 'custom' ? ledgerFilters.start_month || null : null,
        end_month:
          ledgerFilters.period_preset === 'custom' ? ledgerFilters.end_month || null : null,
        date_to: ledgerFilters.date_to || undefined
      })
      if (res.success && res.data) {
        setMessage(`Cari ekstre PDF kaydedildi: ${res.data.file_path}`)
      } else if (res.error !== 'Kayıt iptal edildi') {
        setError(res.error ?? 'PDF oluşturulamadı. Lütfen tekrar deneyin.')
      }
    } catch {
      setError('PDF oluşturulamadı. Lütfen tekrar deneyin.')
    } finally {
      setIsDetailPdfLoading(false)
    }
  }

  const handleExportInterestPdf = async (): Promise<void> => {
    if (reportType !== 'interest') {
      setError('PDF almak için faiz raporunu seçin.')
      return
    }
    setIsInterestPdfLoading(true)
    setError('')
    setMessage('')
    try {
      const res = await window.api.documents.saveInterestReportPdf({
        period_month: interestFilters.period_month || undefined,
        period_year: interestFilters.period_year || undefined,
        date_from: interestFilters.date_from || undefined,
        date_to: interestFilters.date_to || undefined,
        search: interestFilters.search || undefined
      })
      if (res.success && res.data) {
        setMessage(`Faiz raporu PDF kaydedildi: ${res.data.file_path}`)
      } else if (res.error !== 'Kayıt iptal edildi') {
        setError(res.error ?? 'PDF oluşturulamadı. Lütfen tekrar deneyin.')
      }
    } catch {
      setError('PDF oluşturulamadı. Lütfen tekrar deneyin.')
    } finally {
      setIsInterestPdfLoading(false)
    }
  }

  const yearOptions = buildYearOptions(activePeriod.year)

  return (
    <div className="reports-page">
      <div className="reports-page__layout">
        <nav className="settings-nav reports-nav">
          {REPORT_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`settings-nav__item${reportType === item.key ? ' settings-nav__item--active' : ''}`}
              onClick={() => {
                setData(null)
                setError('')
                setMessage('')
                setReportType(item.key)
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="reports-page__content">
          <div className="reports-page__header">
            <div>
              <h2 className="reports-page__title">{REPORT_TITLES[reportType]}</h2>
              <p className="reports-page__subtitle">Gerçek zamanlı veritabanı raporu</p>
            </div>
            <div className="reports-page__actions">
              {reportType === 'partner-ledger' && (
                <>
                  <button
                    type="button"
                    className="btn"
                    onClick={handleExportPdfDetailed}
                    disabled={
                      isDetailPdfLoading ||
                      loading ||
                      !ledgerFilters.partner_id
                    }
                  >
                    {isDetailPdfLoading ? 'PDF Hazırlanıyor...' : 'Cari Ekstre PDF'}
                  </button>
                </>
              )}
              {reportType === 'interest' && (
                <button
                  type="button"
                  className="btn"
                  onClick={handleExportInterestPdf}
                  disabled={isInterestPdfLoading || exporting || loading}
                >
                  {isInterestPdfLoading ? 'PDF Hazırlanıyor...' : "PDF'e Aktar"}
                </button>
              )}
              <div id="member-statement-pdf-slot" hidden={reportType !== 'member-statement'} />
              {reportType !== 'partner-debt-schedule' && reportType !== 'member-statement' && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleExport}
                disabled={exporting || isInterestPdfLoading || loading}
              >
                {exporting ? 'Aktarılıyor...' : "Excel'e Aktar"}
              </button>
              )}
            </div>
          </div>

          {error && <div className="alert alert-error">{error}</div>}
          {message && <div className="alert alert-success">{message}</div>}

          {reportType === 'member-statement' ? (
            <MemberAccountStatementPanel partners={partners} />
          ) : reportType === 'partner-debt-schedule' ? (
            <PartnerDebtSchedulePanel
              key={initialPartnerId > 0 ? initialPartnerId : 'reports'}
              partnerId={initialPartnerId > 0 ? initialPartnerId : undefined}
              lockPartner={initialPartnerId > 0}
            />
          ) : (
            <>
          <DataPanel title="Filtreler" noPadding>
            <TableToolbar meta="">
              {reportType === 'general-balance' && (
                <>
                  <select
                    className="field-select"
                    value={gbFilters.is_active ?? ''}
                    onChange={(e) =>
                      setGbFilters({
                        ...gbFilters,
                        is_active: e.target.value === '' ? null : Number(e.target.value)
                      })
                    }
                  >
                    <option value="">Tüm Üyeler</option>
                    <option value="1">Aktif</option>
                    <option value="0">Pasif</option>
                  </select>
                  <select
                    className="field-select"
                    value={gbFilters.balance_status}
                    onChange={(e) =>
                      setGbFilters({
                        ...gbFilters,
                        balance_status: e.target.value as typeof gbFilters.balance_status
                      })
                    }
                  >
                    <option value="all">Tüm Bakiyeler</option>
                    <option value="debtor">Borçlu</option>
                    <option value="creditor">Alacaklı</option>
                    <option value="zero">Sıfır Bakiye</option>
                  </select>
                  <input
                    className="field-input field-input--search"
                    placeholder="Üye no veya ad..."
                    value={gbFilters.search}
                    onChange={(e) => setGbFilters({ ...gbFilters, search: e.target.value })}
                  />
                </>
              )}

              {reportType === 'debtor-partners' && (
                <>
                  <MoneyAmountInput
                    className="field-input"
                    placeholder="Min. bakiye"
                    value={debtorMinBalanceText}
                    onValueChange={(value) => {
                      setDebtorMinBalanceText(value)
                      setDebtorFilters({
                        ...debtorFilters,
                        min_balance: parseMoneyInput(value) ?? 0
                      })
                    }}
                  />
                  <select
                    className="field-select"
                    value={debtorFilters.is_active ?? ''}
                    onChange={(e) =>
                      setDebtorFilters({
                        ...debtorFilters,
                        is_active: e.target.value === '' ? null : Number(e.target.value)
                      })
                    }
                  >
                    <option value="">Tüm Üyeler</option>
                    <option value="1">Aktif</option>
                    <option value="0">Pasif</option>
                  </select>
                  <input
                    className="field-input field-input--search"
                    placeholder="Üye no veya ad..."
                    value={debtorFilters.search}
                    onChange={(e) => setDebtorFilters({ ...debtorFilters, search: e.target.value })}
                  />
                </>
              )}

              {reportType === 'non-paying' && (
                <>
                  <select
                    className="field-select"
                    value={nonPayingFilters.period_month}
                    onChange={(e) =>
                      setNonPayingFilters({
                        ...nonPayingFilters,
                        period_month: Number(e.target.value)
                      })
                    }
                  >
                    {MONTH_NAMES.map((name, i) => (
                      <option key={name} value={i + 1}>
                        {name}
                      </option>
                    ))}
                  </select>
                  <select
                    className="field-select"
                    value={nonPayingFilters.period_year}
                    onChange={(e) =>
                      setNonPayingFilters({
                        ...nonPayingFilters,
                        period_year: Number(e.target.value)
                      })
                    }
                  >
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                  <select
                    className="field-select"
                    value={nonPayingFilters.is_active ?? ''}
                    onChange={(e) =>
                      setNonPayingFilters({
                        ...nonPayingFilters,
                        is_active: e.target.value === '' ? null : Number(e.target.value)
                      })
                    }
                  >
                    <option value="">Tüm Üyeler</option>
                    <option value="1">Aktif</option>
                    <option value="0">Pasif</option>
                  </select>
                </>
              )}

              {reportType === 'accrual' && (
                <>
                  <select
                    className="field-select"
                    value={accrualFilters.period_month || ''}
                    onChange={(e) =>
                      setAccrualFilters({
                        ...accrualFilters,
                        period_month: e.target.value ? Number(e.target.value) : 0
                      })
                    }
                  >
                    <option value="">Tüm Aylar</option>
                    {MONTH_NAMES.map((name, i) => (
                      <option key={name} value={i + 1}>
                        {name}
                      </option>
                    ))}
                  </select>
                  <select
                    className="field-select"
                    value={accrualFilters.period_year || ''}
                    onChange={(e) =>
                      setAccrualFilters({
                        ...accrualFilters,
                        period_year: e.target.value ? Number(e.target.value) : 0
                      })
                    }
                  >
                    <option value="">Tüm Yıllar</option>
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                  <div className="reports-partner-search">
                    <PartnerSearchSelect
                      partners={partners}
                      value={accrualFilters.partner_id || ''}
                      onChange={(nextId) => {
                        const id = nextId ? Number(nextId) : 0
                        const selected = partners.find((p) => p.id === id)
                        setAccrualFilters({
                          ...accrualFilters,
                          partner_id: id,
                          search: selected?.partner_no ?? ''
                        })
                      }}
                      allowEmpty
                      emptyLabel="Tüm üyeler"
                      placeholder="Üye no, ad soyad veya TC ile ara..."
                    />
                  </div>
                </>
              )}

              {reportType === 'payment' && (
                <>
                  <input
                    type="date"
                    className="field-input"
                    value={paymentFilters.date_from}
                    onChange={(e) =>
                      setPaymentFilters({ ...paymentFilters, date_from: e.target.value })
                    }
                  />
                  <input
                    type="date"
                    className="field-input"
                    value={paymentFilters.date_to}
                    onChange={(e) =>
                      setPaymentFilters({ ...paymentFilters, date_to: e.target.value })
                    }
                  />
                  <select
                    className="field-select"
                    value={paymentFilters.payment_method}
                    onChange={(e) =>
                      setPaymentFilters({
                        ...paymentFilters,
                        payment_method: e.target.value as typeof paymentFilters.payment_method
                      })
                    }
                  >
                    <option value="">Tüm Yöntemler</option>
                    <option value="Nakit">Nakit</option>
                    <option value="Banka">Banka</option>
                    <option value="POS">POS</option>
                    <option value="Diğer">Diğer</option>
                  </select>
                  <input
                    className="field-input field-input--search"
                    placeholder="Üye no veya ad..."
                    value={paymentFilters.search}
                    onChange={(e) => setPaymentFilters({ ...paymentFilters, search: e.target.value })}
                  />
                  <input
                    className="field-input"
                    placeholder="Makbuz no"
                    value={paymentFilters.receipt_no}
                    onChange={(e) =>
                      setPaymentFilters({ ...paymentFilters, receipt_no: e.target.value })
                    }
                  />
                </>
              )}

              {reportType === 'interest' && (
                <>
                  <select
                    className="field-select"
                    value={interestFilters.period_month || ''}
                    onChange={(e) =>
                      setInterestFilters({
                        ...interestFilters,
                        period_month: e.target.value ? Number(e.target.value) : 0
                      })
                    }
                    title="Rapor dönemi (ay sonu tarihi)"
                  >
                    <option value="">Bugün (dönem yok)</option>
                    {MONTH_NAMES.map((name, i) => (
                      <option key={name} value={i + 1}>
                        {name}
                      </option>
                    ))}
                  </select>
                  <select
                    className="field-select"
                    value={interestFilters.period_year || ''}
                    onChange={(e) =>
                      setInterestFilters({
                        ...interestFilters,
                        period_year: e.target.value ? Number(e.target.value) : 0
                      })
                    }
                    title="Rapor yılı (ay sonu tarihi)"
                  >
                    <option value="">Yıl yok</option>
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                  <input
                    type="date"
                    className="field-input"
                    value={interestFilters.date_to}
                    onChange={(e) =>
                      setInterestFilters({ ...interestFilters, date_to: e.target.value })
                    }
                    title="Rapor tarihi (üye borç tablosu ile aynı)"
                    placeholder="Rapor tarihi"
                  />
                  <div className="reports-partner-search">
                    <PartnerSearchSelect
                      partners={partners}
                      value={interestFilters.partner_id || ''}
                      onChange={(nextId) => {
                        const id = nextId ? Number(nextId) : 0
                        const selected = partners.find((p) => p.id === id)
                        setInterestFilters({
                          ...interestFilters,
                          partner_id: id,
                          search: selected?.partner_no ?? ''
                        })
                      }}
                      allowEmpty
                      emptyLabel="Tüm üyeler"
                      placeholder="Üye no, ad soyad veya TC ile ara..."
                    />
                  </div>
                </>
              )}

              {reportType === 'partner-ledger' && (
                <>
                  <div className="reports-partner-search">
                    <PartnerSearchSelect
                      partners={partners}
                      value={ledgerFilters.partner_id || ''}
                      onChange={(nextId) =>
                        setLedgerFilters({
                          ...ledgerFilters,
                          partner_id: nextId ? Number(nextId) : 0
                        })
                      }
                      allowEmpty
                      emptyLabel="Üye seçin..."
                      placeholder="Üye no, ad soyad veya TC ile ara..."
                    />
                  </div>
                  <select
                    className="field-select"
                    value={ledgerFilters.period_preset}
                    onChange={(e) =>
                      setLedgerFilters({
                        ...ledgerFilters,
                        period_preset: e.target.value as PartnerLedgerPeriodPreset
                      })
                    }
                    aria-label="Dönem"
                  >
                    {LEDGER_PERIOD_PRESETS.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                  {ledgerFilters.period_preset === 'custom' ? (
                    <>
                      <label className="field">
                        <span>Başlangıç dönemi</span>
                        <input
                          type="month"
                          className="field-input"
                          value={ledgerFilters.start_month}
                          onChange={(e) =>
                            setLedgerFilters({ ...ledgerFilters, start_month: e.target.value })
                          }
                        />
                      </label>
                      <label className="field">
                        <span>Bitiş dönemi</span>
                        <input
                          type="month"
                          className="field-input"
                          value={ledgerFilters.end_month}
                          onChange={(e) =>
                            setLedgerFilters({ ...ledgerFilters, end_month: e.target.value })
                          }
                        />
                      </label>
                    </>
                  ) : null}
                </>
              )}

              <button type="button" className="btn btn-sm" onClick={loadReport}>
                Yenile
              </button>
            </TableToolbar>
          </DataPanel>

          {loading ? (
            <div className="page-loading">Rapor yükleniyor...</div>
          ) : (
            <ReportResultView reportType={reportType} data={data} />
          )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function ReportResultView({
  reportType,
  data
}: {
  reportType: ReportType
  data: ReportData
}): JSX.Element {
  if (!data) {
    if (reportType === 'partner-ledger') {
      return (
        <EmptyState
          title="Üye seçilmedi"
          message="Cari ekstre raporu için filtrelerden bir üye seçin."
          compact
        />
      )
    }
    return <EmptyState message="Rapor verisi bulunamadı." compact />
  }

  switch (reportType) {
    case 'general-balance': {
      const d = data as GeneralBalanceReport
      return (
        <>
          <div className="reports-summary">
            <StatPanel label="Toplam Üye" value={d.summary.total_partners} />
            <StatPanel label="Borçlu Üye" value={d.summary.debtor_count} variant="accent" />
            <StatPanel label="Toplam Borç" value={formatMoney(d.summary.total_debit)} variant="debit" />
            <StatPanel label="Toplam Tahsilat" value={formatMoney(d.summary.total_collected)} variant="credit" />
            <StatPanel label="Kalan Bakiye" value={formatMoney(d.summary.total_remaining)} variant="debit" />
          </div>
          <ReportTable
            emptyMessage="Seçilen filtrelere uygun üye bulunamadı."
            count={d.rows.length}
            headers={[
              'Üye No',
              'Ad Soyad / Ünvan',
              'Telefon',
              'Toplam Borç',
              'Toplam Ödeme',
              'Toplam Faiz',
              'Güncel Bakiye',
              'Durum'
            ]}
            rows={d.rows.map((r) => [
              r.partner_no,
              r.full_name,
              r.phone || '—',
              formatMoney(r.total_debit),
              formatMoney(r.total_payment),
              formatMoney(r.total_interest),
              formatMoney(r.balance),
              r.status
            ])}
          />
        </>
      )
    }
    case 'debtor-partners': {
      const d = data as DebtorPartnersReport
      return (
        <>
          <div className="reports-summary">
            <StatPanel label="Borçlu Üye" value={d.summary.debtor_count} variant="accent" />
            <StatPanel label="Toplam Borç" value={formatMoney(d.summary.total_debt)} variant="debit" />
          </div>
          <ReportTable
            emptyMessage="Borçlu üye bulunamadı."
            count={d.rows.length}
            headers={[
              'Üye No',
              'Ad Soyad / Ünvan',
              'Telefon',
              'E-posta',
              'Adres',
              'Güncel Bakiye',
              'En Eski Borç Dönemi',
              'Son Ödeme'
            ]}
            rows={d.rows.map((r) => [
              r.partner_no,
              r.full_name,
              r.phone || '—',
              r.email || '—',
              r.address || '—',
              formatMoney(r.balance),
              r.oldest_debt_period || '—',
              formatDate(r.last_payment_date)
            ])}
          />
        </>
      )
    }
    case 'non-paying': {
      const d = data as NonPayingReport
      return (
        <>
          <div className="reports-summary">
            <StatPanel label="Tahakkuk Yapılan" value={d.summary.accrued_partner_count} />
            <StatPanel label="Tam Ödeyen" value={d.summary.fully_paid_count} variant="credit" />
            <StatPanel label="Eksik/Ödemeyen" value={d.summary.unpaid_or_partial_count} variant="accent" />
            <StatPanel label="Toplam Kalan" value={formatMoney(d.summary.total_remaining)} variant="debit" />
          </div>
          <ReportTable
            emptyMessage="Seçilen dönemde eksik veya hiç ödeme yapmayan üye bulunamadı."
            count={d.rows.length}
            headers={[
              'Üye No',
              'Ad Soyad / Ünvan',
              'Dönem',
              'Tahakkuk',
              'Ödenen',
              'Kalan',
              'Son Ödeme',
              'Gecikme'
            ]}
            rows={d.rows.map((r) => [
              r.partner_no,
              r.full_name,
              r.period,
              formatMoney(r.accrual_amount),
              formatMoney(r.paid_amount),
              formatMoney(r.remaining_amount),
              formatDate(r.due_date),
              r.delay_status
            ])}
          />
        </>
      )
    }
    case 'accrual': {
      const d = data as AccrualReportResult
      return (
        <>
          <div className="reports-summary">
            <StatPanel label="Aidat Adedi" value={d.summary.accrual_count} />
            <StatPanel label="Toplam Aidat" value={formatMoney(d.summary.total_amount)} variant="debit" />
          </div>
          <ReportTable
            emptyMessage="Seçilen filtrelere uygun aktif aidat bulunamadı."
            count={d.rows.length}
            headers={[
              'Dönem',
              'Son Ödeme',
              'Üye No',
              'Ad Soyad / Ünvan',
              'Aidat Tutarı',
              'Açıklama'
            ]}
            rows={d.rows.map((r) => [
              r.period,
              formatDate(r.due_date),
              r.partner_no,
              r.full_name,
              formatMoney(r.amount),
              r.description || '—'
            ])}
          />
        </>
      )
    }
    case 'payment': {
      const d = data as PaymentReportResult
      return (
        <>
          <div className="reports-summary">
            <StatPanel label="Toplam Tahsilat" value={formatMoney(d.summary.total_collected)} variant="credit" />
            <StatPanel label="Nakit" value={formatMoney(d.summary.cash_total)} />
            <StatPanel label="Banka" value={formatMoney(d.summary.bank_total)} />
            <StatPanel label="POS" value={formatMoney(d.summary.pos_total)} />
            <StatPanel label="Diğer" value={formatMoney(d.summary.other_total)} />
          </div>
          <ReportTable
            emptyMessage="Seçilen filtrelere uygun tahsilat bulunamadı."
            count={d.rows.length}
            headers={[
              'Tarih',
              'Üye No',
              'Ad Soyad / Ünvan',
              'Yöntem',
              'Makbuz No',
              'Açıklama',
              'Tutar'
            ]}
            rows={d.rows.map((r) => [
              formatDate(r.payment_date),
              r.partner_no,
              r.full_name,
              r.payment_method,
              r.receipt_no || '—',
              r.description || '—',
              formatMoney(r.amount)
            ])}
          />
        </>
      )
    }
    case 'interest': {
      const d = data as InterestReportResult
      if (!d.summary || !Array.isArray(d.rows)) {
        return <EmptyState message="Faiz raporu yükleniyor..." compact />
      }
      return (
        <>
          <div className="reports-summary">
            <StatPanel label="Üye Sayısı" value={d.summary.partner_count} />
            <StatPanel label="Toplam Kalan Ana Borç" value={formatMoney(d.summary.total_principal)} variant="debit" />
            <StatPanel label="Toplam Kalan Faiz" value={formatMoney(d.summary.total_interest)} variant="accent" />
          </div>
          <ReportTable
            emptyMessage="Seçilen filtrelere uygun kalan gecikme faizi bulunamadı."
            count={d.rows.length}
            headers={[
              'Aidat Dönemi',
              'Rapor Tarihi',
              'Üye No',
              'Ad Soyad / Ünvan',
              'Kalan Ana Borç',
              'Oran %',
              'Kalan Gecikme Faizi',
              'Açıklama'
            ]}
            rows={d.rows.map((r) => [
              r.period,
              formatDate(r.calculation_date),
              r.partner_no,
              r.full_name,
              r.principal_amount != null ? formatMoney(r.principal_amount) : '—',
              r.interest_rate != null ? `%${r.interest_rate}` : '—',
              formatMoney(r.interest_amount),
              r.description || '—'
            ])}
          />
        </>
      )
    }
    case 'partner-ledger': {
      const d = data as PartnerLedgerReport
      return <PartnerLedgerView data={d} />
    }
    default:
      return <EmptyState message="Rapor türü tanınmadı." compact />
  }
}

function ReportTable({
  headers,
  rows,
  count,
  emptyMessage
}: {
  headers: string[]
  rows: string[][]
  count: number
  emptyMessage: string
}): JSX.Element {
  const moneyColumnStart = headers.findIndex((h) =>
    ['Toplam Borç', 'Toplam Ödeme', 'Toplam Faiz', 'Güncel Bakiye', 'Tahakkuk', 'Ödenen', 'Kalan', 'Tutar', 'Borç', 'Alacak', 'Bakiye', 'Ana Borç', 'Faiz Tutarı'].includes(h)
  )

  return (
    <DataPanel title="Rapor Sonucu" subtitle={`${count} kayıt`} noPadding>
      {count === 0 ? (
        <EmptyState message={emptyMessage} compact />
      ) : (
        <div className="table-wrap table-wrap--scroll-tall">
          <table className="data-table">
            <thead>
              <tr>
                {headers.map((h) => (
                  <th
                    key={h}
                    className={
                      moneyColumnStart >= 0 && headers.indexOf(h) >= moneyColumnStart
                        ? 'text-right'
                        : undefined
                    }
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td
                      key={j}
                      className={
                        moneyColumnStart >= 0 && j >= moneyColumnStart ? 'money' : undefined
                      }
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DataPanel>
  )
}
