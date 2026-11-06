import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useNavigate, useOutletContext, useSearchParams } from 'react-router-dom'
import { formatShareRatioTr } from '@shared/shareRatio'
import type {
  DashboardMonthlySummaryRow,
  DashboardPeriodFilter,
  DashboardSummary,
  Partner
} from '@shared/types'
import AddDueModal from '../../components/member/AddDueModal'
import AddPaymentModal from '../../components/member/AddPaymentModal'
import DashboardMonthDetailModal from '../../components/dashboard/DashboardMonthDetailModal'
import type { AppLayoutContext } from '../../components/layout/AppLayout'
import DataPanel from '../../components/ui/DataPanel'
import EmptyState from '../../components/ui/EmptyState'
import StatPanel from '../../components/ui/StatPanel'
import {
  IconBank,
  IconCalendar,
  IconCash,
  IconUsers,
  IconWallet,
  RibbonIcon
} from '../../components/ui/icons'
import { dashboardQuickActions } from '../../config/navigation'
import { useAuth } from '../../auth/AuthContext'
import { useActionToast } from '../../hooks/useActionToast'
import { describeBackupCreateResult } from '../../utils/backupResult'
import { formatDate, formatMoney } from '../../utils/format'

const PERIOD_OPTIONS: Array<{ value: DashboardPeriodFilter; label: string }> = [
  { value: 'this_month', label: 'Bu Ay' },
  { value: 'last_month', label: 'Geçen Ay' },
  { value: 'last_3_months', label: 'Son 3 Ay' },
  { value: 'last_12_months', label: 'Son 12 Ay' },
  { value: 'this_year', label: 'Bu Yıl' }
]

export default function SimpleDashboardPage(): JSX.Element {
  const navigate = useNavigate()
  const { settings } = useOutletContext<AppLayoutContext>()
  const { user } = useAuth()
  const toast = useActionToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [partners, setPartners] = useState<Partner[]>([])
  const [cashBalance, setCashBalance] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [periodFilter, setPeriodFilter] = useState<DashboardPeriodFilter>('this_month')
  const [showDueModal, setShowDueModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [monthDetailRow, setMonthDetailRow] = useState<DashboardMonthlySummaryRow | null>(null)
  const [showOverdueModal, setShowOverdueModal] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [summaryRes, partnersRes] = await Promise.all([
        window.api.dashboard.getSummary(),
        window.api.partners.list({ is_active: 1 })
      ])
      if (summaryRes.success && summaryRes.data) {
        setSummary(summaryRes.data)
      } else {
        setSummary(null)
        setError(summaryRes.error ?? 'Yönetim paneli verileri yüklenemedi')
      }
      if (partnersRes.success && partnersRes.data) setPartners(partnersRes.data)

      try {
        const cashRes = await window.api.cash.getSummary({})
        if (cashRes.success && cashRes.data) {
          setCashBalance(cashRes.data.balance)
        } else {
          setCashBalance(null)
        }
      } catch {
        setCashBalance(null)
      }
    } catch (err) {
      setSummary(null)
      setError(err instanceof Error ? err.message : 'Yönetim paneli verileri yüklenemedi')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleBackup = useCallback(async (): Promise<void> => {
    setError('')
    setSuccess('')
    try {
      const res = await window.api.backup.createBackup()
      if (res.success && res.data) {
        const described = describeBackupCreateResult(res.data)
        setSuccess(described.message)
        if (described.kind === 'partial') {
          setError(described.message)
          toast.warn(described.title, described.message)
        } else {
          toast.success(described.title, described.message)
        }
      } else if (res.error !== 'Klasör seçilmedi') {
        setError(res.error ?? 'Yedekleme başarısız')
        toast.fail('Yedekleme tamamlanamadı', res.error)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Yedekleme başarısız'
      setError(message)
      toast.fail('Yedekleme tamamlanamadı', message)
    }
  }, [toast])

  useEffect(() => {
    if (loading) return

    const action = searchParams.get('action')
    if (action === 'due') setShowDueModal(true)
    if (action === 'payment') setShowPaymentModal(true)
    if (action === 'backup') void handleBackup()
    if (action) setSearchParams({}, { replace: true })
  }, [loading, searchParams, setSearchParams, handleBackup])

  const periodSummary = useMemo(() => {
    if (!summary) return null
    return summary.periodSummaries[periodFilter] ?? null
  }, [summary, periodFilter])

  const openDebtTable = (partnerId?: number): void => {
    if (partnerId) {
      navigate(`/uye-borc-tablosu/${partnerId}`)
      return
    }
    navigate('/uye-borc-tablosu')
  }

  if (loading) {
    return <div className="page-loading">Yönetim paneli yükleniyor...</div>
  }

  if (error && !summary) {
    return (
      <div className="dashboard dashboard--simple">
        <div className="alert alert-error">{error}</div>
        <button type="button" className="btn btn-sm btn-primary" onClick={() => loadData()}>
          Tekrar Dene
        </button>
      </div>
    )
  }

  if (!summary || !periodSummary) {
    return (
      <div className="dashboard dashboard--simple">
        <div className="alert alert-error">Yönetim paneli verileri okunamadı.</div>
        <button type="button" className="btn btn-sm btn-primary" onClick={() => loadData()}>
          Tekrar Dene
        </button>
      </div>
    )
  }

  const periodEmptyMessage =
    periodSummary.enteredDue === 0 && periodSummary.collectedPayment === 0
      ? 'Seçilen dönemde aidat veya ödeme kaydı bulunmuyor.'
      : ''

  const coopName = settings?.cooperative_name?.trim()
  const paid = summary.totalPaid
  const remaining = summary.totalRemainingDebt
  const paidRemainingTotal = paid + remaining
  const collectionPct =
    paidRemainingTotal > 0 ? Math.round((paid / paidRemainingTotal) * 100) : 0

  return (
    <div className="dashboard dashboard--simple">
      {error && <div className="alert alert-error">{error}</div>}
      {success && (
        <div className="alert alert-success" onAnimationEnd={() => setSuccess('')}>
          {success}
        </div>
      )}

      <section className="dash-hero">
        <div className="dash-hero__copy">
          <h1 className="dash-hero__title">Hoş geldiniz, {user?.full_name}</h1>
          <p className="dash-hero__sub">
            {coopName
              ? `${coopName} için tüm işlemleri buradan yönetebilirsiniz.`
              : 'Kooperatif işlemlerini buradan yönetebilirsiniz.'}
          </p>
        </div>
      </section>

      <div className="dash-quick">
        {dashboardQuickActions.map((action) => (
          <button
            key={action.label}
            type="button"
            className="dash-quick__btn"
            onClick={() => navigate(action.path)}
          >
            <span className="dash-quick__icon">
              <RibbonIcon name={action.icon as Parameters<typeof RibbonIcon>[0]['name']} size={22} />
            </span>
            <span className="dash-quick__label">{action.label}</span>
          </button>
        ))}
      </div>

      <div className="dashboard__summary-row dash-kpi-row">
        <StatPanel
          label="Toplam Üye"
          value={summary.totalMembers}
          hint={`Aktif kayıtlı üye · Toplam pay: ${formatShareRatioTr(summary.totalShareRatio)}`}
          variant="info"
          size="hero"
          icon={<IconUsers size={16} />}
        />
        <StatPanel
          label="Toplam Aidat Borcu"
          value={formatMoney(summary.totalPrincipal)}
          hint="Ana aidat toplamı"
          variant="debit"
          size="hero"
          icon={<IconCalendar size={16} />}
        />
        <StatPanel
          label="Toplam Tahsilat"
          value={formatMoney(summary.totalPaid)}
          hint="Tahsil edilen toplam"
          variant="credit"
          size="hero"
          icon={<IconWallet size={16} />}
        />
        <StatPanel
          label="Güncel Kalan Borç"
          value={formatMoney(summary.totalRemainingDebt)}
          hint="Ana borç + kalan faiz"
          variant="accent"
          size="hero"
          icon={<IconBank size={16} />}
        />
        {cashBalance !== null && (
          <StatPanel
            label="Kooperatif Kasası"
            value={formatMoney(cashBalance)}
            hint="Aktif dönem kasa bakiyesi"
            variant="info"
            size="hero"
            icon={<IconCash size={16} />}
            onClick={() => navigate('/kooperatif-kasasi')}
          />
        )}
      </div>

      <div className="dash-insight-row">
        <DataPanel
          title="Aidat / Tahsilat Durumu"
          subtitle="Mevcut özet: toplam ödenen ve güncel kalan borç"
          className="dash-insight-card dash-insight-card--collection"
          actions={
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => navigate('/raporlar')}>
              Detaylı Rapor
            </button>
          }
        >
          <div className="dash-collection">
            <div
              className="dash-ring"
              style={{ '--pct': collectionPct } as CSSProperties}
              aria-label={`Ödenen pay ${collectionPct} yüzde`}
            >
              <div className="dash-ring__inner">
                <strong>%{collectionPct}</strong>
                <span>Ödenen pay</span>
              </div>
            </div>
            <div className="dash-collection__facts">
              <div className="dash-collection__fact">
                <span>Tahsil edilen</span>
                <strong className="credit">{formatMoney(paid)}</strong>
              </div>
              <div className="dash-collection__fact">
                <span>Kalan borç</span>
                <strong className="debit">{formatMoney(remaining)}</strong>
              </div>
            </div>
          </div>
        </DataPanel>

        <DataPanel
          title="Son Tahsilatlar"
          subtitle="Son tahsilat kayıtları"
          className="dash-insight-card"
          noPadding
          actions={
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => navigate('/raporlar?report=payment')}
            >
              Tümünü Gör
            </button>
          }
        >
          {summary.recentPayments.length === 0 ? (
            <EmptyState message="Henüz ödeme kaydı bulunmuyor." compact />
          ) : (
            <ul className="dash-feed">
              {summary.recentPayments.map((payment) => (
                <li key={payment.id} className="dash-feed__item">
                  <span className="dash-feed__avatar" aria-hidden>
                    {payment.partnerName.trim().charAt(0).toLocaleUpperCase('tr-TR')}
                  </span>
                  <span className="dash-feed__copy">
                    <strong>{payment.partnerName}</strong>
                    <span>{formatDate(payment.date)}</span>
                  </span>
                  <span className="money credit">{formatMoney(payment.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </DataPanel>

        <DataPanel
          title="Hatırlatmalar"
          subtitle="Mevcut özet verilerine göre"
          className="dash-insight-card"
        >
          <ul className="dash-reminders">
            <li>
              <button
                type="button"
                className="dash-reminder"
                onClick={
                  summary.overdue.memberCount > 0 ? () => setShowOverdueModal(true) : undefined
                }
                disabled={summary.overdue.memberCount === 0}
              >
                <span className="dash-reminder__dot dash-reminder__dot--danger" />
                <span className="dash-reminder__text">Vadesi geçen aidatlar</span>
                <strong>{summary.overdue.dueCount}</strong>
              </button>
            </li>
            <li>
              <button
                type="button"
                className="dash-reminder"
                onClick={
                  summary.overdue.memberCount > 0 ? () => setShowOverdueModal(true) : undefined
                }
                disabled={summary.overdue.memberCount === 0}
              >
                <span className="dash-reminder__dot dash-reminder__dot--warn" />
                <span className="dash-reminder__text">Vadesi geçen üyeler</span>
                <strong>{summary.overdue.memberCount}</strong>
              </button>
            </li>
            {summary.overdue.interestTotal > 0.005 && (
              <li>
                <button
                  type="button"
                  className="dash-reminder"
                  onClick={() => setShowOverdueModal(true)}
                >
                  <span className="dash-reminder__dot dash-reminder__dot--accent" />
                  <span className="dash-reminder__text">Gecikme faizi (vadesi geçmiş)</span>
                  <strong>{formatMoney(summary.overdue.interestTotal)}</strong>
                </button>
              </li>
            )}
          </ul>
        </DataPanel>
      </div>

      <div className="dashboard__middle-row dashboard__middle-row--single">
        <DataPanel
          title="En Borçlu Üyeler"
          subtitle="Toplam borca göre sıralı"
          className="dashboard__panel--wide"
          noPadding
        >
          {summary.topDebtors.length === 0 ? (
            <EmptyState message="Borçlu üye bulunmuyor." compact />
          ) : (
            <div className="table-wrap table-wrap--dashboard">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Üye No</th>
                    <th>Ad Soyad / Ünvan</th>
                    <th className="text-right">Kalan Ana Borç</th>
                    <th className="text-right">Kalan Faiz</th>
                    <th className="text-right">Toplam Borç</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {summary.topDebtors.map((row) => (
                    <tr key={row.partnerId}>
                      <td>{row.partnerNo}</td>
                      <td>{row.name}</td>
                      <td className="money">{formatMoney(row.remainingPrincipal)}</td>
                      <td className="money">{formatMoney(row.remainingInterest)}</td>
                      <td className="money debit">{formatMoney(row.totalDebt)}</td>
                      <td className="dashboard-table-action">
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => openDebtTable(row.partnerId)}
                        >
                          Aç
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DataPanel>
      </div>

      <DataPanel
        title="Dönem Özeti"
        subtitle={`Aktif dönem: ${summary.activePeriodLabel}`}
        className="dashboard__period-panel"
      >
        <div className="dashboard-period-filters">
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`btn btn-sm${periodFilter === option.value ? ' btn-primary' : ''}`}
              onClick={() => setPeriodFilter(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>

        {periodEmptyMessage && <div className="dashboard-period-empty">{periodEmptyMessage}</div>}

        <div className="dashboard-period-grid">
          <StatPanel
            label="Girilen Aidat"
            value={formatMoney(periodSummary.enteredDue)}
            hint={
              periodSummary.enteredDue === 0 ? 'Seçilen dönemde aidat kaydı bulunmuyor.' : undefined
            }
          />
          <StatPanel
            label="Alınan Ödeme"
            value={formatMoney(periodSummary.collectedPayment)}
            variant="credit"
            hint={
              periodSummary.collectedPayment === 0
                ? 'Seçilen dönemde ödeme kaydı bulunmuyor.'
                : undefined
            }
          />
          <StatPanel label="Ödeme Yapan Üye" value={periodSummary.payerCount} variant="info" />
          <StatPanel label="Yeni Borçlanan Üye" value={periodSummary.newlyDebtorMembers} />
          <StatPanel label="Kapanan Borç Tutarı" value={formatMoney(periodSummary.closedDebtAmount)} />
          <StatPanel
            label="Kalan Borç Değişimi"
            value={formatMoney(periodSummary.remainingDebtChange)}
            variant="accent"
          />
        </div>
      </DataPanel>

      <DataPanel
        title="Son 12 Ay Aidat / Tahsilat Özeti"
        subtitle={`${summary.activePeriodLabel} dahil son 12 ay — aylık hareket ve tahsilat dağılımı`}
        className="dashboard__monthly-panel"
        noPadding
      >
        <div className="dashboard-monthly-summary">
          <div className="dashboard-monthly-summary__cards">
            <StatPanel
              label="Son 12 Ay Toplam Aidat"
              value={formatMoney(summary.monthlySummaryStats.totalEnteredDue)}
              variant="debit"
            />
            <StatPanel
              label="Son 12 Ay Toplam Tahsilat"
              value={formatMoney(summary.monthlySummaryStats.totalCollectedPayment)}
              variant="credit"
            />
            <StatPanel
              label="En Çok Tahsilat Yapılan Ay"
              value={
                summary.monthlySummaryStats.highestCollectionMonth
                  ? summary.monthlySummaryStats.highestCollectionMonth.label
                  : '—'
              }
              hint={
                summary.monthlySummaryStats.highestCollectionMonth
                  ? formatMoney(summary.monthlySummaryStats.highestCollectionMonth.value)
                  : 'Hareket yok'
              }
              variant="info"
            />
            <StatPanel
              label="En Çok Hareket Olan Ay"
              value={
                summary.monthlySummaryStats.highestActivityMonth
                  ? summary.monthlySummaryStats.highestActivityMonth.label
                  : '—'
              }
              hint={
                summary.monthlySummaryStats.highestActivityMonth
                  ? `${summary.monthlySummaryStats.highestActivityMonth.value} hareketli üye`
                  : 'Hareket yok'
              }
              variant="accent"
            />
          </div>

          {summary.monthlySummary.length === 0 ? (
            <EmptyState message="Son 12 ay için özet oluşturulamadı." compact />
          ) : (
            <div className="table-wrap table-wrap--dashboard table-wrap--dashboard-monthly">
              <table className="data-table dashboard-monthly-table">
                <thead>
                  <tr>
                    <th>Dönem</th>
                    <th className="text-right">Girilen Aidat</th>
                    <th className="text-right">Alınan Ödeme</th>
                    <th className="text-right">Dönem Kalanı</th>
                    <th className="text-center">Hareketli Üye</th>
                    <th className="text-center">Detay</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.monthlySummary.map((row) => (
                    <tr
                      key={`${row.year}-${row.month}`}
                      className={row.hasActivity ? undefined : 'dashboard-monthly-table__row--inactive'}
                    >
                      <td>
                        <strong>{row.label}</strong>
                      </td>
                      <td className="text-right">
                        <div className="money">{formatMoney(row.enteredDue)}</div>
                        {row.dueMemberCount > 0 && (
                          <div className="dashboard-monthly-table__hint">
                            {row.dueMemberCount} üyeye kayıt girildi
                          </div>
                        )}
                      </td>
                      <td className="text-right">
                        <div className="money credit">{formatMoney(row.collectedPayment)}</div>
                        {row.payerCount > 0 && (
                          <div className="dashboard-monthly-table__hint">
                            {row.payerCount} üyeden tahsil edildi
                          </div>
                        )}
                      </td>
                      <td className="text-right">
                        <div
                          className={`money${
                            row.periodBalance > 0
                              ? ' debit'
                              : row.periodBalance < 0
                                ? ' credit'
                                : ''
                          }`}
                        >
                          {formatMoney(row.periodBalance)}
                        </div>
                      </td>
                      <td className="text-center">{row.activeMemberCount}</td>
                      <td className="text-center dashboard-table-action">
                        <button
                          type="button"
                          className="btn btn-xs"
                          disabled={!row.hasActivity}
                          onClick={() => setMonthDetailRow(row)}
                        >
                          Detay
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DataPanel>

      {showOverdueModal && (
        <div className="modal-overlay" onClick={() => setShowOverdueModal(false)}>
          <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Vadesi Geçmiş Aidatı Olan Üyeler</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowOverdueModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="dashboard-overdue-summary-line">
                Toplam {summary.overdue.memberCount} üye, {summary.overdue.dueCount} gecikmiş
                aidat — Kalan aidat: <strong>{formatMoney(summary.overdue.principalTotal)}</strong>
                {summary.overdue.interestTotal > 0.005 && (
                  <>
                    {' '}— Gecikme faizi:{' '}
                    <strong>{formatMoney(summary.overdue.interestTotal)}</strong>
                  </>
                )}
              </div>
              {summary.overdue.members.length === 0 ? (
                <EmptyState message="Vadesi geçmiş aidatı olan üye bulunmuyor." compact />
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Üye No</th>
                        <th>Ad Soyad / Ünvan</th>
                        <th className="text-center">Gecikmiş Aidat</th>
                        <th>En Eski Dönem</th>
                        <th className="text-right">Kalan Aidat</th>
                        <th className="text-right">Gecikme Faizi</th>
                        <th className="text-right">Toplam</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.overdue.members.map((row) => (
                        <tr key={row.partnerId}>
                          <td>{row.partnerNo}</td>
                          <td>{row.name}</td>
                          <td className="text-center">{row.overdueDueCount}</td>
                          <td>{row.oldestOverduePeriod ?? '—'}</td>
                          <td className="money debit text-right">
                            {formatMoney(row.overduePrincipal)}
                          </td>
                          <td className="money debit text-right">
                            {formatMoney(row.overdueInterest)}
                          </td>
                          <td className="money debit text-right">
                            <strong>{formatMoney(row.overdueTotal)}</strong>
                          </td>
                          <td className="dashboard-table-action">
                            <button
                              type="button"
                              className="btn btn-sm"
                              onClick={() => {
                                setShowOverdueModal(false)
                                openDebtTable(row.partnerId)
                              }}
                            >
                              Aç
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {monthDetailRow && (
        <DashboardMonthDetailModal
          year={monthDetailRow.year}
          month={monthDetailRow.month}
          label={monthDetailRow.label}
          onClose={() => setMonthDetailRow(null)}
        />
      )}

      {showDueModal && (
        <AddDueModal
          partners={partners}
          onClose={() => setShowDueModal(false)}
          onSaved={() => {
            setShowDueModal(false)
            toast.success('Aidat kaydedildi', 'Aidat kaydı başarıyla eklendi.')
            loadData()
          }}
        />
      )}

      {showPaymentModal && (
        <AddPaymentModal
          partners={partners}
          onClose={() => setShowPaymentModal(false)}
          onSaved={() => {
            setShowPaymentModal(false)
            toast.success('Tahsilat kaydedildi', 'Tahsilat başarıyla işlendi.')
            loadData()
          }}
        />
      )}
    </div>
  )
}
