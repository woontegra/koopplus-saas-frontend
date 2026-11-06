import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import type { ApiDebtTableRow, ApiMemberDebtTableReport } from '../api/debtTypes'
import { getMemberDebtTable } from '../api/partnerDebt'
import { getPartner, listPartners } from '../api/partners'
import type { Partner, PartnerListItem } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { canWriteMembers } from '../auth/roles'
import DebtAllocationModal from '../components/debt/DebtAllocationModal'
import MemberFormModal from '../components/members/MemberFormModal'
import PartnerSearchSelect from '../components/partners/PartnerSearchSelect'
import { formatDateTr, formatMoneyTr, formatShareRatioTr, todayISO } from '../utils/format'
import { buildMemberDebtDisplaySummary } from '../utils/memberDebtTableSummary'

type DebtTab = 'debt' | 'payments' | 'planned' | 'summary'
type PeriodFilter = 'open' | 'last12' | 'all' | `year:${number}`

const EPSILON = 0.005
const DUES_PAGE_SIZE = 25

const TAB_ITEMS: Array<{ id: DebtTab; label: string }> = [
  { id: 'debt', label: 'Borç Tablosu' },
  { id: 'payments', label: 'Ödeme Geçmişi' },
  { id: 'planned', label: 'Planlanan Aidatlar' },
  { id: 'summary', label: 'Hesap Özeti' }
]

function moneyCell(value: number | null | undefined, emptyDash = true): string {
  if (value == null || (emptyDash && Math.abs(value) <= EPSILON)) return '—'
  return formatMoneyTr(value)
}

function periodCode(row: ApiDebtTableRow): number {
  return row.period_year * 12 + row.period_month
}

function remainingInterestOf(row: ApiDebtTableRow): number {
  return row.remaining_interest ?? row.delay_interest ?? 0
}

function isPrincipalDebtRow(row: ApiDebtTableRow): boolean {
  return !row.is_payment_only && !row.is_interest_only
}

function isOpenDebtViewRow(row: ApiDebtTableRow, asOfDate: string): boolean {
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
  rows: ApiDebtTableRow[],
  filter: PeriodFilter,
  asOfDate: string
): ApiDebtTableRow[] {
  const chronological = [...rows].sort((a, b) => periodCode(a) - periodCode(b))
  if (filter === 'open') return chronological.filter((row) => isOpenDebtViewRow(row, asOfDate))
  if (filter === 'last12') return chronological.slice(-12)
  if (filter === 'all') return chronological
  if (filter.startsWith('year:')) {
    const year = Number(filter.slice(5))
    return chronological.filter((row) => row.period_year === year)
  }
  return chronological
}

function dueInterestAllocated(row: ApiDebtTableRow): number {
  return (row.payment_allocations ?? []).reduce(
    (sum, item) => sum + (item.applied_to_this_due_interest ?? 0),
    0
  )
}

function rowHasAllocationDetail(row: ApiDebtTableRow): boolean {
  return !row.is_payment_only && (row.payment_allocations?.length ?? 0) > 0
}

function rowDisplayStatus(row: ApiDebtTableRow, asOfDate: string): string {
  if (row.is_interest_only) return 'Aidat yok / faiz işlendi'
  if (row.row_status === 'not_due' || row.due_date >= asOfDate) return 'Vadesi gelmedi'
  if ((row.remaining_due ?? 0) <= EPSILON && remainingInterestOf(row) <= EPSILON) {
    return row.row_status === 'closed_late' ? 'Gecikmeli kapandı' : 'Ödendi'
  }
  if (row.row_status === 'partial') return 'Kısmi ödendi'
  if (row.row_status === 'unpaid') return 'Ödenmedi'
  if (row.row_status === 'closed_late') return 'Gecikmeli kapandı'
  if (row.row_status === 'closed_on_time') return 'Ödendi'
  return row.row_status_label ?? '—'
}

function resolveEmptyStateMessage(report: ApiMemberDebtTableReport): string | null {
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
  return 'Bu üye için henüz aidat, ek borç veya ödeme kaydı yok.'
}

const MISSING_AIDAT_API =
  'Aidat girişi henüz SaaS API kapsamında değil; kayıt oluşturulamaz.'
const MISSING_EXTRA_DEBT_API =
  'Ek borç girişi henüz SaaS API kapsamında değil; kayıt oluşturulamaz.'
const MISSING_PAYMENT_API =
  'Tahsilat işlemi henüz SaaS API kapsamında değil; kayıt oluşturulamaz.'
const MISSING_BACKUP_API =
  'Yedekleme masaüstü dosya işlemi; SaaS API karşılığı henüz yok.'
const VIEWER_NO_WRITE = 'İzleyici rolü üye ekleyemez.'

export default function MemberDebtTablePage(): JSX.Element {
  const { partnerId: routePartnerId } = useParams<{ partnerId?: string }>()
  const navigate = useNavigate()
  const { token, tenantId, activeRole } = useAuth()
  const canWrite = canWriteMembers(activeRole)

  const [partners, setPartners] = useState<PartnerListItem[]>([])
  const [partnerId, setPartnerId] = useState(routePartnerId ?? '')
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null)
  /** Rapor tarihi UI’da yok; API varsayılanı bugün (masaüstüyle aynı). */
  const [asOf] = useState(todayISO())
  const [tab, setTab] = useState<DebtTab>('debt')
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('open')
  const [duesPage, setDuesPage] = useState(1)
  const [report, setReport] = useState<ApiMemberDebtTableReport | null>(null)
  const [loadingPartners, setLoadingPartners] = useState(true)
  const [loadingReport, setLoadingReport] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [detailRow, setDetailRow] = useState<ApiDebtTableRow | null>(null)
  const [showMemberModal, setShowMemberModal] = useState(false)

  useEffect(() => {
    if (routePartnerId) setPartnerId(routePartnerId)
  }, [routePartnerId])

  const loadPartners = useCallback(async () => {
    if (!token || !tenantId) return
    setLoadingPartners(true)
    try {
      const data = await listPartners({ token, tenantId })
      setPartners(data.partners)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Üyeler yüklenemedi')
    } finally {
      setLoadingPartners(false)
    }
  }, [token, tenantId])

  useEffect(() => {
    void loadPartners()
  }, [loadPartners])

  const loadSelectedPartner = useCallback(
    async (id: string) => {
      if (!token || !tenantId || !id) {
        setSelectedPartner(null)
        return
      }
      try {
        const data = await getPartner(id, { token, tenantId })
        setSelectedPartner(data.partner)
      } catch {
        setSelectedPartner(null)
      }
    },
    [token, tenantId]
  )

  const loadReport = useCallback(async () => {
    if (!token || !tenantId || !partnerId) {
      setReport(null)
      return
    }
    setLoadingReport(true)
    setError('')
    try {
      const data = await getMemberDebtTable(partnerId, { token, tenantId, asOf })
      setReport(data)
    } catch (err) {
      setReport(null)
      setError(err instanceof ApiError ? err.message : 'Borç tablosu yüklenemedi')
    } finally {
      setLoadingReport(false)
    }
  }, [token, tenantId, partnerId, asOf])

  useEffect(() => {
    void loadReport()
    void loadSelectedPartner(partnerId)
  }, [loadReport, loadSelectedPartner, partnerId])

  const onSelectPartner = (id: string): void => {
    setPartnerId(id)
    setDuesPage(1)
    if (id) navigate(`/uye-borc-tablosu/${id}`)
    else navigate('/uye-borc-tablosu')
  }

  const summary = useMemo(() => (report ? buildMemberDebtDisplaySummary(report) : null), [report])

  const yearOptions = useMemo(() => {
    if (!report) return [] as number[]
    return Array.from(new Set(report.rows.map((r) => r.period_year))).sort((a, b) => b - a)
  }, [report])

  const filteredRows = useMemo(() => {
    if (!report) return []
    return filterDebtRows(report.rows, periodFilter, report.as_of_date)
  }, [report, periodFilter])

  const duesTotalPages = Math.max(1, Math.ceil(filteredRows.length / DUES_PAGE_SIZE))
  const safeDuesPage = Math.min(duesPage, duesTotalPages)
  const pagedRows = useMemo(() => {
    const start = (safeDuesPage - 1) * DUES_PAGE_SIZE
    return filteredRows.slice(start, start + DUES_PAGE_SIZE)
  }, [filteredRows, safeDuesPage])

  useEffect(() => {
    if (duesPage !== safeDuesPage) setDuesPage(safeDuesPage)
  }, [duesPage, safeDuesPage])

  const openingInterestByPeriod = useMemo(() => {
    const timeline = report?.monthly_interest_timeline ?? []
    if (!timeline.length) return new Map<string, number>()
    const sorted = [...timeline].sort(
      (a, b) => a.period_year * 12 + a.period_month - (b.period_year * 12 + b.period_month)
    )
    const map = new Map<string, number>()
    let runningOpening = 0
    for (const item of sorted) {
      map.set(`${item.period_year}-${item.period_month}`, runningOpening)
      runningOpening = item.closing_interest_balance
    }
    return map
  }, [report])

  const filterOptions: Array<{ key: PeriodFilter; label: string }> = [
    { key: 'last12', label: 'Son 12 Dönem' },
    { key: 'open', label: 'Açık Borçlar' },
    ...yearOptions.map((year) => ({ key: `year:${year}` as PeriodFilter, label: String(year) })),
    { key: 'all', label: 'Tüm Dönemler' }
  ]

  const emptyStateMessage = report ? resolveEmptyStateMessage(report) : null
  const hasAidatRows = (report?.rows.length ?? 0) > 0
  const paymentCount = report?.payment_history.length ?? 0
  const plannedRows = report?.planned_rows ?? []

  return (
    <section className="data-panel member-debt-page">
      <div className="data-panel__header">
        <h1 className="data-panel__title">Üye Borç Tablosu</h1>
        <p className="data-panel__subtitle">Aidat, ödeme ve faiz takibi</p>
      </div>

      {success ? <div className="alert alert-success member-debt-alert">{success}</div> : null}
      {error ? <div className="alert alert-error member-debt-alert">{error}</div> : null}

      <div className="member-debt-toolbar">
        <div className="member-debt-toolbar__select">
          <label>Üye</label>
          <PartnerSearchSelect
            partners={partners}
            value={partnerId}
            disabled={loadingPartners || showMemberModal}
            onChange={onSelectPartner}
          />
        </div>
        <div className="member-debt-toolbar__actions">
          <button
            type="button"
            className="btn btn-sm"
            disabled={!canWrite}
            title={canWrite ? undefined : VIEWER_NO_WRITE}
            onClick={() => {
              if (!canWrite) return
              setShowMemberModal(true)
            }}
          >
            Yeni Üye
          </button>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            disabled
            title={MISSING_AIDAT_API}
            aria-disabled="true"
          >
            Aidat Gir
          </button>
          <button
            type="button"
            className="btn btn-sm"
            disabled
            title={MISSING_EXTRA_DEBT_API}
            aria-disabled="true"
          >
            Ek Borç Gir
          </button>
          <button
            type="button"
            className="btn btn-sm btn-accent"
            disabled
            title={MISSING_PAYMENT_API}
            aria-disabled="true"
          >
            Tahsilat
          </button>
          <button
            type="button"
            className="btn btn-sm"
            disabled
            title={MISSING_BACKUP_API}
            aria-disabled="true"
          >
            Yedekle
          </button>
        </div>
      </div>

      {selectedPartner ? (
        <div className="member-debt-member-info">
          <div className="member-info-panel member-info-panel--compact">
            <div className="member-info-panel__meta">
              <strong>
                {selectedPartner.partnerNo} — {selectedPartner.fullName}
              </strong>
              <span className="member-info-panel__sep">|</span>
              <span>Pay Oranı: {formatShareRatioTr(selectedPartner.shareRatio)}</span>
              <span className="member-info-panel__sep">|</span>
              <span>Telefon: {selectedPartner.phone?.trim() || '—'}</span>
              <span className="member-info-panel__sep">|</span>
              <span>E-posta: {selectedPartner.email?.trim() || '—'}</span>
              <span className="member-info-panel__sep">|</span>
              <span>
                İl/İlçe:{' '}
                {[selectedPartner.city, selectedPartner.district].filter(Boolean).join(' / ') || '—'}
              </span>
              <span className="member-info-panel__sep">|</span>
              <span>Giriş Tarihi: {formatDateTr(selectedPartner.joinDate)}</span>
            </div>
          </div>
        </div>
      ) : null}

      <div className="member-debt-table-wrap">
        {!partnerId ? (
          <div className="member-debt-empty-state">Üye seçin veya borç tablosunu yükleyin.</div>
        ) : loadingReport ? (
          <div className="member-debt-empty-state">Borç tablosu yükleniyor...</div>
        ) : !report ? (
          <div className="member-debt-empty-state">Tablo yüklenemedi. Lütfen tekrar deneyin.</div>
        ) : (
          <>
            <div className="member-debt-tabs-bar">
              <div className="member-debt-tabs" role="tablist" aria-label="Üye borç tablosu bölümleri">
                {TAB_ITEMS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={tab === item.id}
                    className={
                      tab === item.id
                        ? 'member-debt-tabs__btn member-debt-tabs__btn--active'
                        : 'member-debt-tabs__btn'
                    }
                    onClick={() => setTab(item.id)}
                  >
                    {item.label}
                    {item.id === 'payments' && paymentCount > 0 ? ` (${paymentCount})` : ''}
                    {item.id === 'planned' && plannedRows.length > 0 ? ` (${plannedRows.length})` : ''}
                  </button>
                ))}
              </div>
            </div>

            <div className="member-debt-tab-panel" role="tabpanel">
              {tab === 'debt' ? (
                <>
                  <div className="member-debt-tab-meta">
                    {report.interest_exempt ? (
                      <span>Faiz durumu: Bu üyeye faiz işletilmiyor</span>
                    ) : report.interest_rate > 0 ? (
                      <>
                        <span>Faiz durumu: Faiz işler</span>
                        <span>Faiz oranı: %{report.interest_rate}</span>
                      </>
                    ) : (
                      <span>Faiz durumu: Faiz işletilmiyor</span>
                    )}
                    {report.interest_status_message ? (
                      <span>{report.interest_status_message}</span>
                    ) : null}
                    <span>Rapor tarihi: {formatDateTr(report.as_of_date)}</span>
                  </div>

                  {emptyStateMessage ? (
                    <div className="member-debt-empty-notice">{emptyStateMessage}</div>
                  ) : null}

                  {summary && summary.categories.overdueRowCount > 0 ? (
                    <div className="member-debt-overdue-warning" role="alert">
                      <span className="member-debt-overdue-warning__title">
                        Vadesi geçmiş {summary.categories.overdueRowCount} aidat bulunuyor.
                      </span>
                      <span>
                        Vadesi geçmiş toplam:{' '}
                        <strong>{formatMoneyTr(summary.categories.overdueRemainingPrincipal)}</strong>
                        {summary.categories.overdueRemainingInterest > EPSILON ? (
                          <>
                            {' '}
                            — Gecikme faizi:{' '}
                            <strong>
                              {formatMoneyTr(summary.categories.overdueRemainingInterest)}
                            </strong>
                          </>
                        ) : null}
                      </span>
                    </div>
                  ) : null}

                  {hasAidatRows ? (
                    <div className="member-debt-allocation-note" role="note">
                      Gerçek Tahsilat, paranın kasaya girdiği ayı gösterir. Faize Mahsup, Vadesinde
                      Mahsup ve Sonradan Mahsup kolonları ise bu tutarın hangi aidat döneminin
                      faizine veya ana parasına işlendiğini gösterir.
                    </div>
                  ) : null}

                  {hasAidatRows ? (
                    <div className="member-debt-period-filters" role="toolbar" aria-label="Dönem görünümü">
                      {filterOptions.map((option) => (
                        <button
                          key={option.key}
                          type="button"
                          className={
                            periodFilter === option.key
                              ? 'btn btn--sm member-debt-period-filters__btn member-debt-period-filters__btn--active'
                              : 'btn btn--sm member-debt-period-filters__btn'
                          }
                          onClick={() => {
                            setPeriodFilter(option.key)
                            setDuesPage(1)
                          }}
                        >
                          {option.label}
                        </button>
                      ))}
                      <span className="member-debt-period-filters__meta">
                        {filteredRows.length} dönem
                        {filteredRows.length > DUES_PAGE_SIZE
                          ? ` · sayfa ${safeDuesPage}/${duesTotalPages}`
                          : ''}
                      </span>
                    </div>
                  ) : null}

                  {hasAidatRows ? (
                    <div className="table-wrap table-wrap--scroll member-debt-table-scroll">
                      <table className="members-table member-debt-table member-debt-table--detailed">
                        <thead>
                          <tr>
                            <th className="member-debt-table__sticky-col">Dönem</th>
                            <th className="member-debt-table__sticky-col-2">Son Ödeme Tarihi</th>
                            <th className="text-right">Aidat</th>
                            <th className="text-right" title="Kasaya giren tutar">
                              Gerçek Tahsilat
                            </th>
                            <th className="text-right">Vadesinde Mahsup</th>
                            <th className="text-right">Sonradan Mahsup</th>
                            <th className="text-right">Faize Mahsup</th>
                            <th className="text-right">Dönem Faizi</th>
                            <th className="text-right">Devreden Faiz</th>
                            <th className="text-right">Dönem Sonu Kalan Faiz</th>
                            <th>Kapanış Tarihi</th>
                            <th>Durum</th>
                            <th className="text-center">Mahsup Detayı</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pagedRows.length === 0 ? (
                            <tr>
                              <td colSpan={13} className="members-table__empty">
                                Seçilen görünümde dönem satırı yok.
                              </td>
                            </tr>
                          ) : (
                            pagedRows.map((row) => {
                              const overdue =
                                isPrincipalDebtRow(row) &&
                                row.remaining_due > EPSILON &&
                                row.due_date < report.as_of_date
                              const opening =
                                openingInterestByPeriod.get(`${row.period_year}-${row.period_month}`)
                              return (
                                <tr
                                  key={row.ledger_entry_id}
                                  className={overdue ? 'member-debt-table__overdue-row' : undefined}
                                >
                                  <td className="member-debt-table__sticky-col">{row.period_label}</td>
                                  <td className="member-debt-table__sticky-col-2">
                                    {row.is_interest_only ? '—' : formatDateTr(row.due_date)}
                                  </td>
                                  <td className="money debit text-right">
                                    {row.is_interest_only || row.monthly_due <= EPSILON
                                      ? '—'
                                      : formatMoneyTr(row.monthly_due)}
                                  </td>
                                  <td className="money credit text-right">
                                    {moneyCell(row.month_collection ?? 0, false)}
                                  </td>
                                  <td className="money credit text-right">
                                    {row.is_interest_only
                                      ? '—'
                                      : moneyCell(row.paid_principal_on_time ?? 0)}
                                  </td>
                                  <td className="money credit text-right">
                                    {row.is_interest_only
                                      ? '—'
                                      : moneyCell(row.paid_principal_late ?? 0)}
                                  </td>
                                  <td className="money credit text-right">
                                    {row.is_interest_only
                                      ? '—'
                                      : moneyCell(dueInterestAllocated(row))}
                                  </td>
                                  <td className="money text-right">
                                    {moneyCell(row.accrued_interest_total ?? 0)}
                                  </td>
                                  <td className="money debit text-right">
                                    {openingInterestByPeriod.has(
                                      `${row.period_year}-${row.period_month}`
                                    )
                                      ? formatMoneyTr(opening ?? 0)
                                      : '—'}
                                  </td>
                                  <td className="money debit text-right">
                                    {formatMoneyTr(remainingInterestOf(row))}
                                  </td>
                                  <td>{row.closing_date ? formatDateTr(row.closing_date) : '—'}</td>
                                  <td>
                                    <span
                                      className={`member-debt-status member-debt-status--${row.row_status ?? 'unpaid'}`}
                                    >
                                      {rowDisplayStatus(row, report.as_of_date)}
                                    </span>
                                  </td>
                                  <td className="text-center">
                                    {rowHasAllocationDetail(row) ? (
                                      <button
                                        type="button"
                                        className="btn btn--ghost btn--sm"
                                        onClick={() => setDetailRow(row)}
                                      >
                                        Detay
                                      </button>
                                    ) : (
                                      '—'
                                    )}
                                  </td>
                                </tr>
                              )
                            })
                          )}
                        </tbody>
                        {summary ? (
                          <tfoot>
                            <tr className="member-debt-table__totals">
                              <td className="member-debt-table__sticky-col">
                                <strong>TOPLAM</strong>
                              </td>
                              <td className="member-debt-table__sticky-col-2">—</td>
                              <td className="money debit text-right">
                                <strong>{formatMoneyTr(summary.columns.totalDueAmount)}</strong>
                              </td>
                              <td className="money credit text-right">
                                <strong>{formatMoneyTr(report.totals.total_paid)}</strong>
                              </td>
                              <td className="money credit text-right">
                                <strong>
                                  {formatMoneyTr(summary.columns.totalPaidPrincipalOnTime)}
                                </strong>
                              </td>
                              <td className="money credit text-right">
                                <strong>
                                  {formatMoneyTr(summary.columns.totalPaidPrincipalLate)}
                                </strong>
                              </td>
                              <td className="money credit text-right">
                                <strong>{formatMoneyTr(summary.columns.totalPaidInterest)}</strong>
                              </td>
                              <td className="money text-right">
                                <strong>{formatMoneyTr(summary.columns.totalAccruedInterest)}</strong>
                              </td>
                              <td>—</td>
                              <td className="money debit text-right">
                                <strong>
                                  {formatMoneyTr(summary.columns.totalRemainingInterest)}
                                </strong>
                              </td>
                              <td colSpan={3} />
                            </tr>
                          </tfoot>
                        ) : null}
                      </table>
                    </div>
                  ) : null}

                  {filteredRows.length > DUES_PAGE_SIZE ? (
                    <div className="member-debt-pagination">
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        disabled={safeDuesPage <= 1}
                        onClick={() => setDuesPage((p) => Math.max(1, p - 1))}
                      >
                        Önceki
                      </button>
                      <span className="member-debt-pagination__label">
                        {safeDuesPage} / {duesTotalPages}
                      </span>
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        disabled={safeDuesPage >= duesTotalPages}
                        onClick={() => setDuesPage((p) => Math.min(duesTotalPages, p + 1))}
                      >
                        Sonraki
                      </button>
                    </div>
                  ) : null}

                  {report.extra_debts.length > 0 ? (
                    <div className="member-debt-section">
                      <h3 className="member-debt-section__title">Ek Borçlar</h3>
                      <div className="members-table-wrap">
                        <table className="members-table">
                          <thead>
                            <tr>
                              <th>Tarih</th>
                              <th>Tür</th>
                              <th>Açıklama</th>
                              <th className="text-right">Tutar</th>
                              <th className="text-right">Faiz</th>
                              <th className="text-right">Ödenen</th>
                              <th className="text-right">Kalan</th>
                            </tr>
                          </thead>
                          <tbody>
                            {report.extra_debts.map((d) => (
                              <tr key={d.id}>
                                <td>{formatDateTr(d.debt_date)}</td>
                                <td>{d.debt_type_label}</td>
                                <td>{d.description || '—'}</td>
                                <td className="text-right">{formatMoneyTr(d.amount)}</td>
                                <td className="text-right">{formatMoneyTr(d.interest_amount)}</td>
                                <td className="text-right">{formatMoneyTr(d.paid_amount)}</td>
                                <td className="text-right">{formatMoneyTr(d.remaining_amount)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : null}

                  {summary ? (
                    <div className="member-debt-summary">
                      <span>
                        Bugün ödenmesi gereken:{' '}
                        <strong>{formatMoneyTr(summary.categories.amountDueToday)}</strong>
                      </span>
                      <span>
                        Kalan ana para:{' '}
                        <strong>{formatMoneyTr(report.totals.remaining_principal)}</strong>
                      </span>
                      <span>
                        Kalan faiz:{' '}
                        <strong>{formatMoneyTr(report.totals.total_delay_interest)}</strong>
                      </span>
                      <span>
                        Genel toplam:{' '}
                        <strong>{formatMoneyTr(report.totals.general_grand_total)}</strong>
                      </span>
                    </div>
                  ) : null}
                </>
              ) : null}

              {tab === 'payments' ? (
                <div className="member-debt-section member-debt-section--pad">
                  <div className="members-table-wrap">
                    <table className="members-table">
                      <thead>
                        <tr>
                          <th>Tarih</th>
                          <th className="text-right">Tutar</th>
                          <th>Yöntem</th>
                          <th>Makbuz</th>
                          <th>Kaynak</th>
                          <th>Açıklama</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.payment_history.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="members-table__empty">
                              Ödeme kaydı yok.
                            </td>
                          </tr>
                        ) : (
                          report.payment_history.map((p) => (
                            <tr key={p.payment_id}>
                              <td>{formatDateTr(p.payment_date)}</td>
                              <td className="text-right">{formatMoneyTr(p.amount)}</td>
                              <td>{p.payment_method || '—'}</td>
                              <td>{p.receipt_no || '—'}</td>
                              <td>{p.source_label || p.payment_scope || '—'}</td>
                              <td>{p.description || '—'}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              {tab === 'planned' ? (
                <div className="member-debt-section member-debt-section--pad">
                  <p className="debt-muted">
                    Planlanan toplam: <strong>{formatMoneyTr(report.planned_total ?? 0)}</strong>
                  </p>
                  <div className="members-table-wrap">
                    <table className="members-table">
                      <thead>
                        <tr>
                          <th>Dönem</th>
                          <th>Son Ödeme Tarihi</th>
                          <th className="text-right">Aidat</th>
                          <th>Durum</th>
                        </tr>
                      </thead>
                      <tbody>
                        {plannedRows.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="members-table__empty">
                              Planlanan aidat yok.
                            </td>
                          </tr>
                        ) : (
                          plannedRows.map((row) => (
                            <tr key={row.ledger_entry_id}>
                              <td>{row.period_label}</td>
                              <td>{formatDateTr(row.due_date)}</td>
                              <td className="text-right">{formatMoneyTr(row.monthly_due)}</td>
                              <td>{row.row_status_label ?? '—'}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              {tab === 'summary' ? (
                <div className="member-debt-section member-debt-section--pad">
                  <div className="member-debt-summary member-debt-summary--grid">
                    <span>
                      Toplam aidat: <strong>{formatMoneyTr(report.totals.total_due)}</strong>
                    </span>
                    <span>
                      Toplam tahsilat: <strong>{formatMoneyTr(report.totals.total_paid)}</strong>
                    </span>
                    <span>
                      Mahsup ana para:{' '}
                      <strong>{formatMoneyTr(report.totals.total_allocated_paid)}</strong>
                    </span>
                    <span>
                      Kalan ana para:{' '}
                      <strong>{formatMoneyTr(report.totals.remaining_principal)}</strong>
                    </span>
                    <span>
                      Gecikme faizi:{' '}
                      <strong>{formatMoneyTr(report.totals.total_delay_interest)}</strong>
                    </span>
                    <span>
                      Aidat + faiz: <strong>{formatMoneyTr(report.totals.grand_total)}</strong>
                    </span>
                    <span>
                      Ek borçlar: <strong>{formatMoneyTr(report.totals.extra_debts_total)}</strong>
                    </span>
                    <span>
                      Genel toplam:{' '}
                      <strong>{formatMoneyTr(report.totals.general_grand_total)}</strong>
                    </span>
                    {(report.totals.carried_forward_credit ?? 0) > EPSILON ? (
                      <span>
                        Devreden alacak:{' '}
                        <strong>{formatMoneyTr(report.totals.carried_forward_credit)}</strong>
                      </span>
                    ) : null}
                  </div>
                  {report.audit ? (
                    <div className="member-debt-section">
                      <h3 className="member-debt-section__title">Hesap dökümü</h3>
                      <p className="debt-muted">
                        Denge: {report.audit.is_balanced ? 'Evet' : 'Hayır'} · Açıklanamayan fark:{' '}
                        {formatMoneyTr(report.audit.unexplained_difference)}
                      </p>
                      {report.audit.explanations.length > 0 ? (
                        <ul className="debt-list">
                          {report.audit.explanations.map((text) => (
                            <li key={text}>{text}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </>
        )}
      </div>

      {detailRow ? (
        <DebtAllocationModal row={detailRow} onClose={() => setDetailRow(null)} />
      ) : null}

      {showMemberModal && canWrite ? (
        <MemberFormModal
          partner={null}
          onClose={() => setShowMemberModal(false)}
          onSaved={(partner) => {
            setShowMemberModal(false)
            setSuccess('Yeni üye eklendi.')
            void loadPartners()
            onSelectPartner(partner.id)
          }}
        />
      ) : null}
    </section>
  )
}
