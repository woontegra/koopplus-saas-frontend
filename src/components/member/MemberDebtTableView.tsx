import { useEffect, useMemo, useRef, useState } from 'react'
import { APP_SUBTITLE } from '@shared/branding'
import type {
  MemberDebtTableReport,
  MemberDebtTableRow,
  MemberExtraDebtRow,
  MemberPaymentHistoryItem
} from '@shared/types'
import { buildMemberDebtDisplaySummary } from '@shared/memberDebtTableSummary'
import { formatDate, formatMoney } from '../../utils/format'
import EmptyState from '../ui/EmptyState'
import MemberDebtAuditModal from './MemberDebtAuditModal'
import MemberDebtRowAllocationModal from './MemberDebtRowAllocationModal'
import MemberPaymentHistoryPanel from './MemberPaymentHistoryPanel'

interface MemberDebtTableViewProps {
  report: MemberDebtTableReport | null
  loading?: boolean
  previewMode?: boolean
  previewCooperativeName?: string
  canWrite?: boolean
  onEditRow?: (row: MemberDebtTableRow) => void
  onDeleteRow?: (row: MemberDebtTableRow) => void
  onEditExtraDebt?: (row: MemberExtraDebtRow) => void
  onDeleteExtraDebt?: (row: MemberExtraDebtRow) => void
  onEditPayment?: (item: MemberPaymentHistoryItem) => void
  onDeletePayment?: (item: MemberPaymentHistoryItem) => void
  onPreview?: () => void
  onPrint?: () => void
  onPdf?: () => void
  onExcel?: () => void
  onAllMembersPdf?: () => void
  onBackup?: () => void | Promise<void>
}

type MemberDebtTab = 'debt' | 'payments' | 'planned' | 'summary'
type PeriodViewFilter = 'open' | 'last12' | 'all' | `year:${number}`

const DUES_PAGE_SIZE = 25
const PAYMENTS_PREVIEW_COUNT = 5
const PAYMENTS_PAGE_SIZE = 10
const PLANNED_PAGE_SIZE = 20
const EPSILON = 0.005

const TAB_ITEMS: Array<{ id: MemberDebtTab; label: string }> = [
  { id: 'debt', label: 'Borç Tablosu' },
  { id: 'payments', label: 'Ödeme Geçmişi' },
  { id: 'planned', label: 'Planlanan Aidatlar' },
  { id: 'summary', label: 'Hesap Özeti' }
]

function resolveEmptyStateMessage(report: MemberDebtTableReport): string | null {
  const hasAidatRows = report.rows.length > 0
  const hasExtraDebts = (report.extra_debts?.length ?? 0) > 0
  const hasPayments = report.payment_history.length > 0
  const carriedForward = report.totals.carried_forward_credit ?? 0
  const generalDebt = report.totals.general_grand_total ?? report.totals.grand_total

  if (hasAidatRows || hasExtraDebts) {
    if (generalDebt <= EPSILON && carriedForward > EPSILON) {
      return 'Bu üyenin borcu bulunmuyor. Devreden ödeme bulunmaktadır.'
    }
    return null
  }

  if (hasPayments) {
    return 'Bu üye için henüz aidat veya ek borç kaydı yok. Yapılan ödemeler devreden ödeme olarak bekliyor.'
  }

  return 'Bu üye için henüz aidat, ek borç veya ödeme kaydı yok. Aidat Gir veya Ek Borç Gir ile kayıt ekleyin.'
}

function isPrincipalDebtRow(row: MemberDebtTableRow): boolean {
  return !row.is_payment_only && !row.is_interest_only
}

function periodCode(row: MemberDebtTableRow): number {
  return row.period_year * 12 + row.period_month
}

function remainingInterestOf(row: MemberDebtTableRow): number {
  return row.remaining_interest ?? row.delay_interest ?? 0
}

function isOpenDebtViewRow(row: MemberDebtTableRow, asOfDate: string): boolean {
  const remPrincipal = row.remaining_due
  const remInterest = remainingInterestOf(row)

  if (row.is_payment_only) return false
  if (row.is_interest_only) return remInterest > EPSILON
  if (row.row_status === 'not_due' || (row.due_date >= asOfDate && remPrincipal > EPSILON)) {
    return true
  }
  return remPrincipal > EPSILON || remInterest > EPSILON
}

function filterDebtRows(
  rows: MemberDebtTableRow[],
  filter: PeriodViewFilter,
  asOfDate: string
): MemberDebtTableRow[] {
  const chronological = [...rows].sort((a, b) => periodCode(a) - periodCode(b))

  if (filter === 'open') {
    return chronological.filter((row) => isOpenDebtViewRow(row, asOfDate))
  }
  if (filter === 'last12') return chronological.slice(-12)
  if (filter === 'all') return chronological
  if (filter.startsWith('year:')) {
    const year = Number(filter.slice(5))
    return chronological.filter((row) => row.period_year === year)
  }
  return chronological
}

function dueInterestAllocated(row: MemberDebtTableRow): number {
  return (row.payment_allocations ?? []).reduce(
    (sum, item) => sum + (item.applied_to_this_due_interest ?? 0),
    0
  )
}

function duePrincipalAllocated(row: MemberDebtTableRow): number {
  if (row.paid_principal_total != null) return row.paid_principal_total
  const onTime = row.paid_principal_on_time ?? 0
  const late = row.paid_principal_late ?? 0
  if (onTime > EPSILON || late > EPSILON) return onTime + late
  return row.paid_amount ?? 0
}

function rowHasAllocationDetail(row: MemberDebtTableRow): boolean {
  return (
    !row.is_payment_only &&
    ((row.payment_allocations?.length ?? 0) > 0 ||
      (row.interest_accrual_events?.length ?? 0) > 0 ||
      (row.source_interest_accruals?.length ?? 0) > 0)
  )
}

function paymentSourceLabel(item: MemberPaymentHistoryItem): string {
  if (item.source_label?.trim()) return item.source_label.trim()
  if (item.is_bank_import) return 'Banka Aktarımı'
  return item.payment_method?.trim() || 'Manuel'
}

function rowDisplayStatus(row: MemberDebtTableRow, asOfDate: string): string {
  if (row.is_interest_only) return 'Faiz'
  if (row.row_status === 'not_due' || row.due_date >= asOfDate) return 'Vadesi gelmedi'
  if ((row.remaining_due ?? 0) <= EPSILON && (row.remaining_interest ?? row.delay_interest ?? 0) <= EPSILON) {
    return row.row_status === 'closed_late' ? 'Geç ödendi' : 'Ödendi'
  }
  if (row.row_status === 'partial') return 'Kısmi'
  if (row.row_status === 'unpaid') return 'Gecikmede'
  if (row.row_status === 'closed_late') return 'Geç ödendi'
  if (row.row_status === 'closed_on_time') return 'Ödendi'
  return row.row_status_label ?? '—'
}

function rowStatusTone(row: MemberDebtTableRow, asOfDate: string): string {
  if (row.is_interest_only) return 'not_due'
  if (row.row_status === 'not_due' || row.due_date >= asOfDate) return 'not_due'
  if ((row.remaining_due ?? 0) <= EPSILON && (row.remaining_interest ?? row.delay_interest ?? 0) <= EPSILON) {
    return row.row_status === 'closed_late' ? 'late_paid' : 'paid'
  }
  if (row.row_status === 'partial') return 'partial'
  if (row.row_status === 'closed_late') return 'late_paid'
  if (row.row_status === 'closed_on_time') return 'paid'
  return 'overdue'
}

function InfoTip({ text }: { text: string }): JSX.Element {
  return (
    <span className="col-info-tip" title={text} aria-label={text}>
      ⓘ
    </span>
  )
}

function AllocationBar({
  interest,
  principal
}: {
  interest: number
  principal: number
}): JSX.Element {
  const total = Math.max(interest + principal, 0)
  const interestPct = total > EPSILON ? (interest / total) * 100 : 0
  const principalPct = total > EPSILON ? (principal / total) * 100 : 0
  return (
    <div className="alloc-bar" aria-hidden={total <= EPSILON}>
      <div className="alloc-bar__track">
        {interestPct > 0 && (
          <span className="alloc-bar__seg alloc-bar__seg--interest" style={{ width: `${interestPct}%` }} />
        )}
        {principalPct > 0 && (
          <span className="alloc-bar__seg alloc-bar__seg--principal" style={{ width: `${principalPct}%` }} />
        )}
      </div>
      <div className="alloc-bar__legend">
        <span className="alloc-bar__interest">{formatMoney(interest)} faize</span>
        <span aria-hidden> · </span>
        <span className="alloc-bar__principal">{formatMoney(principal)} ana paraya</span>
      </div>
    </div>
  )
}

export default function MemberDebtTableView({
  report,
  loading = false,
  previewMode = false,
  previewCooperativeName,
  canWrite = true,
  onEditRow,
  onDeleteRow,
  onEditExtraDebt,
  onDeleteExtraDebt,
  onEditPayment,
  onDeletePayment,
  onPreview,
  onPrint,
  onPdf,
  onExcel,
  onAllMembersPdf,
  onBackup
}: MemberDebtTableViewProps): JSX.Element {
  const [activeTab, setActiveTab] = useState<MemberDebtTab>('debt')
  const [auditOpen, setAuditOpen] = useState(false)
  const [allocationRow, setAllocationRow] = useState<MemberDebtTableRow | null>(null)
  const [periodFilter, setPeriodFilter] = useState<PeriodViewFilter>('last12')
  const [duesPage, setDuesPage] = useState(1)
  const [paymentsExpanded, setPaymentsExpanded] = useState(false)
  const [paymentsPage, setPaymentsPage] = useState(1)
  const [plannedPage, setPlannedPage] = useState(1)
  const [detailedView, setDetailedView] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const exportRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!exportOpen) return
    const onPointerDown = (event: MouseEvent): void => {
      if (!exportRef.current?.contains(event.target as Node)) setExportOpen(false)
    }
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setExportOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [exportOpen])

  const partnerId = report?.partner_id ?? null
  const reportRows = report?.rows ?? []
  const reportAsOfDate = report?.as_of_date ?? ''
  const reportPayments = report?.payment_history ?? []
  const plannedRows = report?.planned_rows ?? []

  useEffect(() => {
    setPeriodFilter('open')
    setDuesPage(1)
    setPaymentsExpanded(false)
    setPaymentsPage(1)
    setPlannedPage(1)
    setAllocationRow(null)
    setAuditOpen(false)
  }, [partnerId])

  useEffect(() => {
    setDuesPage(1)
  }, [periodFilter])

  const yearOptions = useMemo(() => {
    const years = new Set<number>()
    for (const row of reportRows) {
      if (Number.isFinite(row.period_year)) years.add(row.period_year)
    }
    return [...years].sort((a, b) => b - a)
  }, [reportRows])

  const filteredRows = useMemo(() => {
    if (!report) return []
    if (previewMode) return reportRows
    return filterDebtRows(reportRows, periodFilter, reportAsOfDate)
  }, [report, previewMode, reportRows, reportAsOfDate, periodFilter])

  const duesTotalPages = Math.max(1, Math.ceil(filteredRows.length / DUES_PAGE_SIZE))
  const safeDuesPage = Math.min(Math.max(1, duesPage), duesTotalPages)

  const pagedRows = useMemo(() => {
    if (previewMode) return filteredRows
    const start = (safeDuesPage - 1) * DUES_PAGE_SIZE
    return filteredRows.slice(start, start + DUES_PAGE_SIZE)
  }, [previewMode, filteredRows, safeDuesPage])

  useEffect(() => {
    if (duesPage !== safeDuesPage) setDuesPage(safeDuesPage)
  }, [duesPage, safeDuesPage])

  const paymentsNewestFirst = useMemo(() => {
    return [...reportPayments].sort((a, b) => {
      if (a.payment_date !== b.payment_date) return b.payment_date.localeCompare(a.payment_date)
      return b.payment_id - a.payment_id
    })
  }, [reportPayments])

  const paymentTotalCount = paymentsNewestFirst.length
  const paymentsTotalPages = Math.max(1, Math.ceil(paymentTotalCount / PAYMENTS_PAGE_SIZE))
  const safePaymentsPage = Math.min(Math.max(1, paymentsPage), paymentsTotalPages)

  const visiblePayments = useMemo(() => {
    if (previewMode) return paymentsNewestFirst
    if (!paymentsExpanded) return paymentsNewestFirst.slice(0, PAYMENTS_PREVIEW_COUNT)
    const start = (safePaymentsPage - 1) * PAYMENTS_PAGE_SIZE
    return paymentsNewestFirst.slice(start, start + PAYMENTS_PAGE_SIZE)
  }, [previewMode, paymentsNewestFirst, paymentsExpanded, safePaymentsPage])

  useEffect(() => {
    if (paymentsPage !== safePaymentsPage) setPaymentsPage(safePaymentsPage)
  }, [paymentsPage, safePaymentsPage])

  const plannedTotalPages = Math.max(1, Math.ceil(plannedRows.length / PLANNED_PAGE_SIZE))
  const safePlannedPage = Math.min(Math.max(1, plannedPage), plannedTotalPages)
  const pagedPlannedRows = useMemo(() => {
    if (previewMode) return plannedRows
    const start = (safePlannedPage - 1) * PLANNED_PAGE_SIZE
    return plannedRows.slice(start, start + PLANNED_PAGE_SIZE)
  }, [previewMode, plannedRows, safePlannedPage])

  useEffect(() => {
    if (plannedPage !== safePlannedPage) setPlannedPage(safePlannedPage)
  }, [plannedPage, safePlannedPage])

  const monthlyTimeline = report?.monthly_interest_timeline ?? []

  const openingInterestByPeriod = useMemo(() => {
    if (!monthlyTimeline.length) return new Map<string, number>()
    const timeline = [...monthlyTimeline].sort(
      (a, b) => a.period_year * 12 + a.period_month - (b.period_year * 12 + b.period_month)
    )
    const map = new Map<string, number>()
    let runningOpening = 0
    for (const item of timeline) {
      const key = `${item.period_year}-${item.period_month}`
      map.set(key, runningOpening)
      runningOpening = item.closing_interest_balance
    }
    return map
  }, [monthlyTimeline])

  if (loading) {
    return <div className="page-loading">Borç tablosu yükleniyor...</div>
  }

  if (!report) {
    return <EmptyState message="Üye seçin veya borç tablosunu yükleyin." compact />
  }

  const hasAidatRows = report.rows.length > 0
  const displaySummary = buildMemberDebtDisplaySummary(report)
  const { columns: columnTotals, categories } = displaySummary

  const isOverdueRow = (row: MemberDebtTableRow): boolean =>
    isPrincipalDebtRow(row) && row.remaining_due > EPSILON && row.due_date < report.as_of_date

  const hasExtraDebts = (report.extra_debts?.length ?? 0) > 0
  const hasPayments = report.payment_history.length > 0
  const hasPlannedRows = plannedRows.length > 0
  const plannedTotal = report.planned_total ?? 0
  const carriedForward = report.totals.carried_forward_credit ?? 0
  const audit = report.audit
  const principalApplied = audit?.payment_to_principal ?? columnTotals.totalPaidPrincipal
  const interestApplied = audit?.payment_to_interest ?? columnTotals.totalPaidInterest
  const extraApplied = audit?.payment_to_extra_debt ?? 0
  const emptyStateMessage = resolveEmptyStateMessage(report)
  const showRowActions = !previewMode && canWrite && (onEditRow || onDeleteRow)
  const showExtraActions = !previewMode && canWrite && (onEditExtraDebt || onDeleteExtraDebt)
  const showPaymentActions = !previewMode && canWrite && (onEditPayment || onDeletePayment)
  const showDetailColumn = !previewMode
  const showExportActions =
    !previewMode && (onPreview || onPrint || onPdf || onExcel || onAllMembersPdf || onBackup)

  const formatTotalCell = (value: string | number | null): string => {
    if (value == null) return '—'
    if (typeof value === 'number') return formatMoney(value)
    return value
  }

  if (!hasAidatRows && !hasExtraDebts && !hasPayments && !hasPlannedRows) {
    return <EmptyState message={emptyStateMessage ?? ''} compact />
  }

  const filterOptions: Array<{ key: PeriodViewFilter; label: string }> = [
    { key: 'last12', label: 'Son 12 Dönem' },
    { key: 'open', label: 'Açık Borçlar' },
    ...yearOptions.map((year) => ({ key: `year:${year}` as PeriodViewFilter, label: String(year) })),
    { key: 'all', label: 'Tüm Dönemler' }
  ]

  if (previewMode) {
    return (
      <div className="member-debt-table-wrap">
        <div className="member-debt-preview-header">
          <div className="member-debt-preview-header__coop">{previewCooperativeName}</div>
          <div className="member-debt-preview-header__subtitle">{APP_SUBTITLE}</div>
          <div className="member-debt-preview-header__meta">
            <span>
              Üye: {report.partner_no} — {report.full_name}
            </span>
            <span>Rapor tarihi: {formatDate(report.as_of_date)}</span>
          </div>
        </div>
        {emptyStateMessage && <div className="member-debt-empty-notice">{emptyStateMessage}</div>}
        {/* Preview keeps full unfiltered content for legacy embedding */}
        {hasAidatRows && (
          <div className="table-wrap table-wrap--scroll">
            <table className="data-table member-debt-table member-debt-table--detailed">
              <thead>
                <tr>
                  <th>Dönem</th>
                  <th className="text-right">Aidat</th>
                  <th>Son Ödeme Tarihi</th>
                  <th className="text-right">Vadesinde Mahsup</th>
                  <th className="text-right">Sonradan Mahsup</th>
                  <th className="text-right">Ana Paraya Toplam</th>
                  <th className="text-right">Bu Ay İşleyen Faiz</th>
                  <th className="text-right">Bu Ay Faize Mahsup</th>
                  <th className="text-right">Kalan Aidat</th>
                  <th className="text-right">Dönem Sonu Kalan Faiz</th>
                  <th>Kapanış Tarihi</th>
                  <th>Durum</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.ledger_entry_id}>
                    <td>{row.period_label}</td>
                    <td className="money debit text-right">
                      {row.is_interest_only || row.monthly_due <= EPSILON
                        ? '—'
                        : formatMoney(row.monthly_due)}
                    </td>
                    <td>{row.is_interest_only ? '—' : formatDate(row.due_date)}</td>
                    <td className="money credit text-right">
                      {(row.paid_principal_on_time ?? 0) > 0
                        ? formatMoney(row.paid_principal_on_time!)
                        : '—'}
                    </td>
                    <td className="money credit text-right">
                      {(row.paid_principal_late ?? 0) > 0
                        ? formatMoney(row.paid_principal_late!)
                        : '—'}
                    </td>
                    <td className="money credit text-right">
                      {row.paid_amount > 0 ? formatMoney(row.paid_amount) : '—'}
                    </td>
                    <td className="money text-right">
                      {(row.accrued_interest_total ?? 0) > 0
                        ? formatMoney(row.accrued_interest_total!)
                        : '—'}
                    </td>
                    <td className="money credit text-right">
                      {(row.paid_interest_total ?? 0) > 0
                        ? formatMoney(row.paid_interest_total!)
                        : '—'}
                    </td>
                    <td className="money debit text-right">
                      {row.is_interest_only ? '—' : formatMoney(row.remaining_due)}
                    </td>
                    <td className="money debit text-right">
                      {formatMoney(row.remaining_interest ?? row.delay_interest)}
                    </td>
                    <td>{row.closing_date ? formatDate(row.closing_date) : '—'}</td>
                    <td>{row.row_status_label ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  const remainingInterestTotal = columnTotals.totalRemainingInterest
  const remainingPrincipalTotal = categories.allPeriodsRemainingPrincipal
  const paidInterestTotal = interestApplied
  const paidPrincipalTotal = principalApplied
  const totalInterestAllocated = (report.rows ?? []).reduce(
    (sum, row) => sum + dueInterestAllocated(row),
    0
  )
  const totalPrincipalAllocated = (report.rows ?? []).reduce(
    (sum, row) => sum + duePrincipalAllocated(row),
    0
  )
  const actionColCount = showDetailColumn || showRowActions ? 1 : 0
  const tableColSpan = 8 + actionColCount + (detailedView ? 6 : 0)

  return (
    <div className="member-debt-table-wrap">
      {hasAidatRows && (
        <div className="member-debt-kpi-grid" aria-label="Borç özeti">
          <div className="member-debt-kpi">
            <span className="member-debt-kpi__label">Toplam aidat</span>
            <strong className="member-debt-kpi__value">{formatMoney(columnTotals.totalDueAmount)}</strong>
          </div>
          <div className="member-debt-kpi">
            <span className="member-debt-kpi__label">Toplam ödenen</span>
            <strong className="member-debt-kpi__value">{formatMoney(report.totals.total_paid)}</strong>
            <AllocationBar interest={paidInterestTotal} principal={paidPrincipalTotal} />
          </div>
          <div className="member-debt-kpi">
            <span className="member-debt-kpi__label">Kalan borç</span>
            <div className="member-debt-kpi__split">
              <div>
                <span>Ana para</span>
                <strong>{formatMoney(remainingPrincipalTotal)}</strong>
              </div>
              <div>
                <span>Faiz</span>
                <strong>{formatMoney(remainingInterestTotal)}</strong>
              </div>
            </div>
          </div>
          <div className="member-debt-kpi member-debt-kpi--danger">
            <span className="member-debt-kpi__label">Bugünkü genel borç</span>
            <strong className="member-debt-kpi__value member-debt-kpi__value--lg">
              {formatMoney(categories.allPeriodsTotalDebt)}
            </strong>
            <span className="member-debt-kpi__hint">Ana para + faiz</span>
          </div>
        </div>
      )}

      <div className="member-debt-tabs-bar">
        <div className="member-debt-tabs" role="tablist" aria-label="Üye borç tablosu bölümleri">
          {TAB_ITEMS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`member-debt-tabs__btn${activeTab === tab.id ? ' member-debt-tabs__btn--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
              {tab.id === 'payments' && paymentTotalCount > 0 ? ` (${paymentTotalCount})` : ''}
              {tab.id === 'planned' && plannedRows.length > 0 ? ` (${plannedRows.length})` : ''}
            </button>
          ))}
        </div>
        <div className="member-debt-tabs-bar__right">
          <label className="member-debt-detail-toggle">
            <input
              type="checkbox"
              checked={detailedView}
              onChange={(event) => setDetailedView(event.target.checked)}
            />
            <span>Detaylı görünüm</span>
          </label>
          {showExportActions && (
            <div className="member-debt-export-menu" ref={exportRef}>
              <button
                type="button"
                className="btn btn-xs"
                aria-haspopup="menu"
                aria-expanded={exportOpen}
                onClick={() => setExportOpen((value) => !value)}
              >
                Yazdır / Dışa aktar ▾
              </button>
              {exportOpen && (
                <div className="member-debt-export-menu__panel" role="menu">
                  {onPreview && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setExportOpen(false)
                        onPreview()
                      }}
                    >
                      Önizle
                    </button>
                  )}
                  {onPrint && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setExportOpen(false)
                        void onPrint()
                      }}
                    >
                      Yazdır
                    </button>
                  )}
                  {onPdf && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setExportOpen(false)
                        void onPdf()
                      }}
                    >
                      PDF indir
                    </button>
                  )}
                  {onExcel && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setExportOpen(false)
                        void onExcel()
                      }}
                    >
                      Excel&apos;e aktar
                    </button>
                  )}
                  {onAllMembersPdf && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setExportOpen(false)
                        onAllMembersPdf()
                      }}
                    >
                      Tüm üyeler PDF
                    </button>
                  )}
                  {onBackup && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setExportOpen(false)
                        void onBackup()
                      }}
                    >
                      Yedekle
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="member-debt-tab-panel" role="tabpanel">
        {activeTab === 'debt' && (
          <>
            <div className="member-debt-tab-meta">
              {report.interest_exempt ? (
                <>
                  <span>Faiz durumu: Bu üyeye faiz işletilmiyor</span>
                  {report.interest_exempt_note?.trim() && (
                    <span>Faiz muafiyeti: {report.interest_exempt_note.trim()}</span>
                  )}
                </>
              ) : report.has_interest_special_periods ? (
                <>
                  <span>Faiz durumu: Faiz özel dönemleri var</span>
                  {report.interest_rate > 0 && (
                    <span>Faiz oranı: %{report.interest_rate}</span>
                  )}
                  {report.interest_status_message && (
                    <span>{report.interest_status_message}</span>
                  )}
                  {report.interest_special_periods?.length > 0 && (
                    <div className="member-debt-member-info__exemption-periods">
                      <ul>
                        {report.interest_special_periods.map((period) => (
                          <li key={period.id}>
                            {new Date(period.start_date).toLocaleDateString('tr-TR')} -{' '}
                            {new Date(period.end_date).toLocaleDateString('tr-TR')}:{' '}
                            {period.action_type === 'CUSTOM_RATE' &&
                            period.custom_interest_rate != null
                              ? `%${period.custom_interest_rate} özel faiz uygulanır`
                              : 'Faiz işletilmez'}
                            {period.note?.trim() ? ` (${period.note.trim()})` : ''}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : report.interest_status === 'OUT_OF_SCOPE' ||
                report.interest_status === 'NO_ACTIVE_POLICY' ||
                report.interest_rate <= 0 ? (
                <>
                  <span>Faiz durumu: Faiz işletilmiyor</span>
                  <span>
                    {report.interest_status_message ??
                      'Bu üye için aktif faiz kararı bulunmuyor.'}
                  </span>
                </>
              ) : (
                <>
                  <span>Faiz durumu: Faiz işler</span>
                  <span>Faiz oranı: %{report.interest_rate}</span>
                </>
              )}
              {report.interest_coverage_note && (
                <span className="member-debt-tab-meta__note">{report.interest_coverage_note}</span>
              )}
              <span>Rapor tarihi: {formatDate(report.as_of_date)}</span>
            </div>

            {emptyStateMessage && (
              <div className="member-debt-empty-notice">{emptyStateMessage}</div>
            )}

            {categories.overdueRowCount > 0 && (
              <div className="member-debt-overdue-warning" role="alert">
                <span className="member-debt-overdue-warning__title">
                  Vadesi geçmiş {categories.overdueRowCount} aidat bulunuyor.
                </span>
                <span>
                  Vadesi geçmiş toplam: <strong>{formatMoney(categories.overdueRemainingPrincipal)}</strong>
                  {categories.overdueRemainingInterest > EPSILON && (
                    <>
                      {' '}
                      — Gecikme faizi:{' '}
                      <strong>{formatMoney(categories.overdueRemainingInterest)}</strong>
                    </>
                  )}
                </span>
              </div>
            )}

            {hasAidatRows && (
              <div className="member-debt-period-filters" role="toolbar" aria-label="Dönem görünümü">
                {filterOptions.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    className={`btn btn-xs member-debt-period-filters__btn${
                      periodFilter === option.key ? ' member-debt-period-filters__btn--active' : ''
                    }`}
                    onClick={() => setPeriodFilter(option.key)}
                  >
                    {option.label}
                  </button>
                ))}
                <span className="member-debt-period-filters__rule">
                  Ödemeler önce birikmiş faize, kalanı en eski aidatın ana parasına işlenir ·{' '}
                  {filteredRows.length} dönem
                </span>
              </div>
            )}

            {hasAidatRows && (
              <div className="table-wrap table-wrap--scroll member-debt-table-scroll">
                <table
                  className={`data-table member-debt-table${
                    detailedView ? ' member-debt-table--detailed' : ' member-debt-table--simple'
                  }`}
                >
                  <thead>
                    <tr>
                      <th className="member-debt-table__sticky-col">Dönem</th>
                      <th className="member-debt-table__sticky-col-2">Son ödeme</th>
                      <th className="text-right">Aidat</th>
                      <th
                        className="text-right"
                        title="Ödeme tarihinde kasaya giren tutar. Dağılım Faize giden / Ana paraya giden kolonlarındadır."
                      >
                        Tahsilat <InfoTip text="Kasaya giren tutar; hangi döneme işlendiği yan kolonlardadır." />
                      </th>
                      <th
                        className="text-right money-interest"
                        title="Bu aidat döneminin gecikme faizine işlenen tutar."
                      >
                        Faize giden <InfoTip text="Bu dönemin faizine mahsup edilen tutar." />
                      </th>
                      <th
                        className="text-right money-principal"
                        title="Vadesinde ve sonradan ana paraya mahsup toplamı."
                      >
                        Ana paraya giden{' '}
                        <InfoTip text="Vadesinde + sonradan mahsup edilen ana para toplamı." />
                      </th>
                      {detailedView && (
                        <>
                          <th className="text-right">Vadesinde mahsup</th>
                          <th className="text-right">Sonradan mahsup</th>
                          <th className="text-right">Dönem faizi</th>
                          <th className="text-right">Devreden faiz</th>
                          <th className="text-right">Dönem sonu kalan faiz</th>
                          <th>Kapanış tarihi</th>
                        </>
                      )}
                      <th className="text-right">Kalan</th>
                      <th>Durum</th>
                      {(showDetailColumn || showRowActions) && (
                        <th className="text-center member-debt-table__actions-col">Detay / İşlem</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {pagedRows.length === 0 ? (
                      <tr>
                        <td colSpan={tableColSpan}>Seçilen görünümde dönem satırı yok.</td>
                      </tr>
                    ) : (
                      pagedRows.map((row) => (
                        <tr
                          key={row.ledger_entry_id}
                          className={
                            isOverdueRow(row) ? 'member-debt-table__overdue-row' : undefined
                          }
                          onDoubleClick={() => isPrincipalDebtRow(row) && onEditRow?.(row)}
                          title={
                            row.is_interest_only
                              ? 'Bu ayda aidat tahakkuku yok; geçmiş açık ana para üzerinden faiz işledi.'
                              : row.closed_by_later_payments
                                ? 'Bu aidat, sonraki tarihli ödemelerle kapatılmıştır.'
                                : isOverdueRow(row)
                                  ? 'Vadesi geçmiş aidat'
                                  : undefined
                          }
                        >
                          <td className="member-debt-table__sticky-col">{row.period_label}</td>
                          <td className="member-debt-table__sticky-col-2">
                            {row.is_interest_only ? '—' : formatDate(row.due_date)}
                          </td>
                          <td className="money debit text-right">
                            {row.is_interest_only || row.monthly_due <= EPSILON
                              ? '—'
                              : formatMoney(row.monthly_due)}
                          </td>
                          <td className="money credit text-right">
                            {formatMoney(row.month_collection ?? 0)}
                          </td>
                          <td className="money text-right money-interest">
                            {row.is_interest_only
                              ? '—'
                              : dueInterestAllocated(row) > EPSILON
                                ? formatMoney(dueInterestAllocated(row))
                                : '—'}
                          </td>
                          <td className="money text-right money-principal">
                            {row.is_interest_only
                              ? '—'
                              : duePrincipalAllocated(row) > EPSILON
                                ? formatMoney(duePrincipalAllocated(row))
                                : '—'}
                          </td>
                          {detailedView && (
                            <>
                              <td className="money credit text-right">
                                {row.is_interest_only
                                  ? '—'
                                  : (row.paid_principal_on_time ?? 0) > 0
                                    ? formatMoney(row.paid_principal_on_time!)
                                    : '—'}
                              </td>
                              <td className="money credit text-right">
                                {row.is_interest_only
                                  ? '—'
                                  : (row.paid_principal_late ?? 0) > 0
                                    ? formatMoney(row.paid_principal_late!)
                                    : '—'}
                              </td>
                              <td className="money text-right">
                                {formatMoney(row.accrued_interest_total ?? 0)}
                              </td>
                              <td className="money debit text-right">
                                {openingInterestByPeriod.has(
                                  `${row.period_year}-${row.period_month}`
                                )
                                  ? formatMoney(
                                      openingInterestByPeriod.get(
                                        `${row.period_year}-${row.period_month}`
                                      ) ?? 0
                                    )
                                  : '—'}
                              </td>
                              <td className="money debit text-right">
                                {formatMoney(row.remaining_interest ?? row.delay_interest)}
                              </td>
                              <td>{row.closing_date ? formatDate(row.closing_date) : '—'}</td>
                            </>
                          )}
                          <td className="money debit text-right">
                            {row.is_interest_only ? '—' : formatMoney(row.remaining_due)}
                          </td>
                          <td>
                            <span
                              className={`member-debt-status member-debt-status--${rowStatusTone(
                                row,
                                report.as_of_date
                              )}`}
                            >
                              {rowDisplayStatus(row, report.as_of_date)}
                            </span>
                          </td>
                          {(showDetailColumn || showRowActions) && (
                            <td className="text-center">
                              <div className="member-debt-row-actions">
                                {showDetailColumn &&
                                  (rowHasAllocationDetail(row) ? (
                                    <button
                                      type="button"
                                      className="btn btn-xs"
                                      onClick={() => setAllocationRow(row)}
                                    >
                                      Detay
                                    </button>
                                  ) : null)}
                                {showRowActions && isPrincipalDebtRow(row) && (
                                  <>
                                    <button
                                      type="button"
                                      className="btn btn-xs"
                                      onClick={() => onEditRow?.(row)}
                                      disabled={!row.can_edit}
                                    >
                                      Düzenle
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-xs btn-danger-outline"
                                      onClick={() => onDeleteRow?.(row)}
                                      disabled={!row.can_delete}
                                    >
                                      Sil
                                    </button>
                                  </>
                                )}
                                {showRowActions && row.is_payment_only && (
                                  <button
                                    type="button"
                                    className="btn btn-xs btn-danger-outline"
                                    onClick={() => onDeleteRow?.(row)}
                                    disabled={!canWrite}
                                  >
                                    Ödemeyi Sil
                                  </button>
                                )}
                                {showRowActions &&
                                  row.is_interest_only &&
                                  !rowHasAllocationDetail(row) &&
                                  '—'}
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                  {pagedRows.length > 0 && (
                    <tfoot>
                      <tr className="member-debt-table__totals">
                        <td className="member-debt-table__sticky-col">
                          <strong>{formatTotalCell(displaySummary.totalRowCells.period)}</strong>
                        </td>
                        <td className="member-debt-table__sticky-col-2">—</td>
                        <td className="money debit text-right">
                          <strong>{formatTotalCell(displaySummary.totalRowCells.due)}</strong>
                        </td>
                        <td className="money credit text-right">
                          <strong>{formatMoney(report.totals.total_paid)}</strong>
                        </td>
                        <td className="money text-right money-interest">
                          <strong>{formatMoney(totalInterestAllocated)}</strong>
                        </td>
                        <td className="money text-right money-principal">
                          <strong>{formatMoney(totalPrincipalAllocated)}</strong>
                        </td>
                        {detailedView && (
                          <>
                            <td className="money credit text-right">
                              <strong>
                                {formatTotalCell(displaySummary.totalRowCells.paidOnTime)}
                              </strong>
                            </td>
                            <td className="money credit text-right">
                              <strong>
                                {formatTotalCell(displaySummary.totalRowCells.paidLate)}
                              </strong>
                            </td>
                            <td className="money text-right">
                              <strong>
                                {formatTotalCell(displaySummary.totalRowCells.accruedInterest)}
                              </strong>
                            </td>
                            <td className="money text-right">—</td>
                            <td className="money debit text-right">
                              <strong>
                                {formatTotalCell(displaySummary.totalRowCells.remainingInterest)}
                              </strong>
                            </td>
                            <td>{formatTotalCell(displaySummary.totalRowCells.closingDate)}</td>
                          </>
                        )}
                        <td className="money debit text-right">
                          <strong>{formatMoney(remainingPrincipalTotal)}</strong>
                        </td>
                        <td>
                          <strong>{formatTotalCell(displaySummary.totalRowCells.status)}</strong>
                        </td>
                        {(showDetailColumn || showRowActions) && <td />}
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}

            {hasAidatRows && filteredRows.length > DUES_PAGE_SIZE && (
              <div className="member-debt-pagination">
                <button
                  type="button"
                  className="btn btn-xs"
                  disabled={safeDuesPage <= 1}
                  onClick={() => setDuesPage((p) => Math.max(1, p - 1))}
                >
                  Önceki
                </button>
                <span className="member-debt-pagination__label">
                  Sayfa {safeDuesPage} / {duesTotalPages}
                </span>
                <button
                  type="button"
                  className="btn btn-xs"
                  disabled={safeDuesPage >= duesTotalPages}
                  onClick={() => setDuesPage((p) => Math.min(duesTotalPages, p + 1))}
                >
                  Sonraki
                </button>
              </div>
            )}

            {hasExtraDebts && (
              <div className="member-extra-debts-section">
                <h4>Ek Borçlar</h4>
                <div className="table-wrap table-wrap--scroll">
                  <table className="data-table member-extra-debts-table">
                    <thead>
                      <tr>
                        <th>Tarih</th>
                        <th>İşlem Türü</th>
                        <th>Açıklama</th>
                        <th>Son Ödeme Tarihi</th>
                        <th className="text-right">Faiz</th>
                        <th className="text-right">Borç</th>
                        <th className="text-right">Ödenen</th>
                        <th className="text-right">Kalan</th>
                        {showExtraActions && <th className="text-center">İşlem</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {report.extra_debts.map((row) => (
                        <tr key={row.id}>
                          <td>{formatDate(row.debt_date)}</td>
                          <td>{row.debt_type_label}</td>
                          <td>{row.description || '—'}</td>
                          <td>{row.due_date ? formatDate(row.due_date) : '—'}</td>
                          <td className="money debit text-right">
                            {formatMoney(row.interest_amount)}
                          </td>
                          <td className="money debit text-right">{formatMoney(row.amount)}</td>
                          <td className="money credit text-right">
                            {formatMoney(row.paid_amount)}
                          </td>
                          <td className="money debit text-right">
                            {formatMoney(row.remaining_amount)}
                          </td>
                          {showExtraActions && (
                            <td className="text-center">
                              <div className="member-debt-row-actions">
                                <button
                                  type="button"
                                  className="btn btn-xs"
                                  onClick={() => onEditExtraDebt?.(row)}
                                  disabled={!row.can_edit}
                                >
                                  Düzenle
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-xs btn-danger-outline"
                                  onClick={() => onDeleteExtraDebt?.(row)}
                                  disabled={!row.can_delete}
                                >
                                  Sil
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <MemberPaymentHistoryPanel
              report={report}
              canDelete={Boolean(showPaymentActions)}
              onDelete={onDeletePayment}
              onEdit={onEditPayment}
            />

          </>
        )}

        {activeTab === 'payments' && (
          <div className="member-payment-history member-payment-history--tab">
            {!hasPayments ? (
              <EmptyState message="Bu üye için henüz tahsilat hareketi yok." compact />
            ) : (
              <>
                <div className="member-payment-history__header">
                  <h4>
                    {paymentsExpanded
                      ? `Ödeme Geçmişi (${paymentTotalCount} hareket)`
                      : `Ödeme Geçmişi — Son ${Math.min(PAYMENTS_PREVIEW_COUNT, paymentTotalCount)} hareket`}
                  </h4>
                  {paymentTotalCount > PAYMENTS_PREVIEW_COUNT && (
                    <div className="member-payment-history__controls">
                      {!paymentsExpanded ? (
                        <button
                          type="button"
                          className="btn btn-xs"
                          onClick={() => {
                            setPaymentsExpanded(true)
                            setPaymentsPage(1)
                          }}
                        >
                          Tüm Ödemeleri Göster ({paymentTotalCount})
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-xs"
                          onClick={() => {
                            setPaymentsExpanded(false)
                            setPaymentsPage(1)
                          }}
                        >
                          Son {PAYMENTS_PREVIEW_COUNT} Ödemeye Dön
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <p className="member-payment-history__hint">
                  Gerçek tahsilat hareketleri (banka / manuel). Aidat satırındaki mahsup tutarları
                  bunlardan hangi kısmın ilgili aidata işlendiğini gösterir.
                </p>
                <div className="table-wrap table-wrap--scroll">
                  <table className="data-table member-payment-history-table">
                    <thead>
                      <tr>
                        <th>Ödeme Tarihi</th>
                        <th className="text-right">Tutar</th>
                        <th>Kaynak</th>
                        <th>Fiş No</th>
                        <th>Açıklama</th>
                        {showPaymentActions && <th className="text-center">İşlem</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {visiblePayments.map((item) => (
                        <tr key={item.payment_id}>
                          <td>{formatDate(item.payment_date)}</td>
                          <td className="money credit text-right">{formatMoney(item.amount)}</td>
                          <td>{paymentSourceLabel(item)}</td>
                          <td>{item.receipt_no?.trim() || '—'}</td>
                          <td>
                            {item.description?.trim() ? (
                              <span
                                className="member-payment-history__description"
                                title={item.description}
                              >
                                {item.description}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          {showPaymentActions && (
                            <td className="text-center">
                              <div className="member-debt-row-actions">
                                <button
                                  type="button"
                                  className="btn btn-xs"
                                  onClick={() => onEditPayment?.(item)}
                                >
                                  Düzenle
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-xs btn-danger-outline"
                                  onClick={() => onDeletePayment?.(item)}
                                >
                                  Sil
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {paymentsExpanded && paymentTotalCount > PAYMENTS_PAGE_SIZE && (
                  <div className="member-debt-pagination member-debt-pagination--payments">
                    <button
                      type="button"
                      className="btn btn-xs"
                      disabled={safePaymentsPage <= 1}
                      onClick={() => setPaymentsPage((p) => Math.max(1, p - 1))}
                    >
                      Önceki
                    </button>
                    <span className="member-debt-pagination__label">
                      Sayfa {safePaymentsPage} / {paymentsTotalPages}
                    </span>
                    <button
                      type="button"
                      className="btn btn-xs"
                      disabled={safePaymentsPage >= paymentsTotalPages}
                      onClick={() => setPaymentsPage((p) => Math.min(paymentsTotalPages, p + 1))}
                    >
                      Sonraki
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'planned' && (
          <div className="member-planned-section member-planned-section--tab">
            {!hasPlannedRows ? (
              <EmptyState message="Bu üye için planlanan aidat kaydı yok." compact />
            ) : (
              <>
                <div className="member-planned-section__summary">
                  <span>
                    Toplam kayıt: <strong>{plannedRows.length}</strong>
                  </span>
                  <span>
                    Toplam tutar: <strong>{formatMoney(plannedTotal)}</strong>
                  </span>
                  <span className="member-planned-section__note">
                    Planlanan aidatlar aktif borca ve bugün ödenecek tutara dahil değildir.
                  </span>
                </div>
                <div className="table-wrap table-wrap--scroll">
                  <table className="data-table member-debt-table member-debt-table--planned">
                    <thead>
                      <tr>
                        <th>Dönem</th>
                        <th className="text-right">Aidat Tutarı</th>
                        <th>Aktif Olacağı Tarih</th>
                        <th>Son Ödeme Tarihi</th>
                        <th>Durum</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedPlannedRows.map((row) => (
                        <tr key={row.ledger_entry_id} className="member-debt-table__planned-row">
                          <td>{row.period_label}</td>
                          <td className="money text-right">{formatMoney(row.monthly_due)}</td>
                          <td>{`01.${String(row.period_month).padStart(2, '0')}.${row.period_year}`}</td>
                          <td>{formatDate(row.due_date)}</td>
                          <td>
                            <span className="badge badge--planned">Planlandı</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td>
                          <strong>Toplam</strong>
                        </td>
                        <td className="money text-right">
                          <strong>{formatMoney(plannedTotal)}</strong>
                        </td>
                        <td colSpan={3} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
                {plannedRows.length > PLANNED_PAGE_SIZE && (
                  <div className="member-debt-pagination">
                    <button
                      type="button"
                      className="btn btn-xs"
                      disabled={safePlannedPage <= 1}
                      onClick={() => setPlannedPage((p) => Math.max(1, p - 1))}
                    >
                      Önceki
                    </button>
                    <span className="member-debt-pagination__label">
                      Sayfa {safePlannedPage} / {plannedTotalPages}
                    </span>
                    <button
                      type="button"
                      className="btn btn-xs"
                      disabled={safePlannedPage >= plannedTotalPages}
                      onClick={() => setPlannedPage((p) => Math.min(plannedTotalPages, p + 1))}
                    >
                      Sonraki
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'summary' && (
          <div className="member-debt-summary-totals member-debt-summary-totals--tab">
            <div className="member-debt-summary-totals__head">
              <strong>Hesap Özeti</strong>
              {audit && (
                <button
                  type="button"
                  className="btn btn-xs"
                  onClick={() => setAuditOpen(true)}
                  title="Ödemelerin faize / ana paraya nasıl dağıldığını gösterir"
                >
                  Hesap Dökümü
                </button>
              )}
            </div>

            <div className="member-debt-summary-totals__grid">
              <div>
                <span>Toplam Aidat</span>
                <strong>{formatMoney(report.totals.total_due)}</strong>
              </div>
              <div>
                <span>Toplam Gerçek Tahsilat</span>
                <strong>{formatMoney(report.totals.total_paid)}</strong>
              </div>
              <div>
                <span>Ana Paraya Mahsup Edilen Ödeme</span>
                <strong>{formatMoney(principalApplied)}</strong>
              </div>
              <div>
                <span>Faize Mahsup Edilen Ödeme</span>
                <strong>{formatMoney(interestApplied)}</strong>
              </div>
              {extraApplied > EPSILON && (
                <div>
                  <span>Ek Borca Mahsup Edilen Ödeme</span>
                  <strong>{formatMoney(extraApplied)}</strong>
                </div>
              )}
              <div>
                <span>Vadesi Geçmiş Kalan Aidat</span>
                <strong>{formatMoney(categories.overdueRemainingPrincipal)}</strong>
              </div>
              <div>
                <span>Kalan Gecikme Faizi</span>
                <strong>{formatMoney(categories.overdueRemainingInterest)}</strong>
              </div>
              <div>
                <span>Bugün Ödenmesi Gereken</span>
                <strong>{formatMoney(categories.amountDueToday)}</strong>
              </div>
              <div>
                <span>Vadesi Gelmeyen Aidat</span>
                <strong>{formatMoney(categories.notYetDuePrincipal)}</strong>
              </div>
              <div>
                <span>Tüm Dönemler Kalan Ana Para</span>
                <strong>{formatMoney(categories.allPeriodsRemainingPrincipal)}</strong>
              </div>
              <div>
                <span>Tüm Dönemler Genel Toplam</span>
                <strong>{formatMoney(categories.allPeriodsTotalDebt)}</strong>
              </div>
              <div>
                <span>Ek Borçlar</span>
                <strong>{formatMoney(report.totals.extra_debts_total ?? 0)}</strong>
              </div>
              {carriedForward > EPSILON && (
                <div className="member-debt-summary-totals__credit">
                  <span>Devreden Ödeme / Üyenin Alacağı</span>
                  <strong>{formatMoney(carriedForward)}</strong>
                </div>
              )}
              {plannedTotal > 0 && (
                <div className="member-debt-summary-totals__planned">
                  <span>Planlanan Aidat Toplamı (aktif borca dahil değil)</span>
                  <strong>{formatMoney(plannedTotal)}</strong>
                </div>
              )}
            </div>

            <div className="member-debt-summary-equations">
              <div className="member-debt-summary-equations__block">
                <div>Vadesi Geçmiş Kalan Aidat</div>
                <div>+ Kalan Gecikme Faizi</div>
                <div className="member-debt-summary-equations__result">
                  = Bugün Ödenmesi Gereken ({formatMoney(categories.amountDueToday)})
                </div>
                <div className="member-debt-summary-equations__values">
                  {formatMoney(categories.overdueRemainingPrincipal)} +{' '}
                  {formatMoney(categories.overdueRemainingInterest)} ={' '}
                  {formatMoney(categories.amountDueToday)}
                </div>
              </div>
              <div className="member-debt-summary-equations__block">
                <div>Bugün Ödenmesi Gereken</div>
                <div>+ Vadesi Gelmeyen Aidat</div>
                <div className="member-debt-summary-equations__result">
                  = Tüm Dönemler Genel Toplam ({formatMoney(categories.allPeriodsTotalDebt)})
                </div>
                <div className="member-debt-summary-equations__values">
                  {formatMoney(categories.amountDueToday)} +{' '}
                  {formatMoney(categories.notYetDuePrincipal)} ={' '}
                  {formatMoney(categories.allPeriodsTotalDebt)}
                </div>
              </div>
            </div>

            {interestApplied > EPSILON && (
              <div className="member-debt-summary-totals__hint">
                Toplam aidat − toplam gerçek tahsilat ={' '}
                {formatMoney(report.totals.total_due - report.totals.total_paid)}; ödemenin{' '}
                {formatMoney(interestApplied)} kısmı gecikme faizine gittiği için kalan ana para{' '}
                {formatMoney(categories.allPeriodsRemainingPrincipal)} görünüyor.
              </div>
            )}
            {audit && !audit.is_balanced && (
              <div className="member-debt-summary-totals__warning" role="alert">
                Hesap farkı açıklanamıyor ({formatMoney(audit.unexplained_difference)}). Lütfen
                hesap denetimini kontrol edin.
              </div>
            )}
          </div>
        )}
      </div>

      {auditOpen && audit && (
        <MemberDebtAuditModal
          audit={audit}
          partnerNo={report.partner_no}
          fullName={report.full_name}
          asOfDate={report.as_of_date}
          onClose={() => setAuditOpen(false)}
        />
      )}

      {allocationRow && (
        <MemberDebtRowAllocationModal row={allocationRow} onClose={() => setAllocationRow(null)} />
      )}
    </div>
  )
}
