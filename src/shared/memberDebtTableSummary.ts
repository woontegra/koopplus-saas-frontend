import type { MemberDebtTableReport, MemberDebtTableRow } from './types'

const EPSILON = 0.01

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

/** TOPLAM satırı ve borç özeti için kolon anahtarları (sıra = tablo sırası). */
export const MEMBER_DEBT_TOTAL_COLUMN_KEYS = [
  'period',
  'due',
  'dueDate',
  'paidOnTime',
  'paidLate',
  'paidPrincipal',
  'accruedInterest',
  'paidInterest',
  'remainingPrincipal',
  'remainingInterest',
  'closingDate',
  'status',
  'detail',
  'actions'
] as const

export type MemberDebtTotalColumnKey = (typeof MEMBER_DEBT_TOTAL_COLUMN_KEYS)[number]

export interface MemberDebtColumnTotals {
  totalDueAmount: number
  totalPaidPrincipalOnTime: number
  totalPaidPrincipalLate: number
  totalPaidPrincipal: number
  totalAccruedInterest: number
  totalPaidInterest: number
  totalRemainingPrincipal: number
  totalRemainingInterest: number
}

export interface MemberDebtDueCategorySummary {
  overdueRemainingPrincipal: number
  overdueRemainingInterest: number
  amountDueToday: number
  notYetDuePrincipal: number
  allPeriodsRemainingPrincipal: number
  allPeriodsTotalDebt: number
  overdueRowCount: number
}

export interface MemberDebtDisplaySummary {
  columns: MemberDebtColumnTotals
  categories: MemberDebtDueCategorySummary
  /** TOPLAM satırı hücreleri — kolon key → gösterilecek metin/değer */
  totalRowCells: Record<MemberDebtTotalColumnKey, string | number | null>
}

/** Gerçek aidat satırları (faiz-only ve ödeme-only hariç). */
function dueRows(report: MemberDebtTableReport): MemberDebtTableRow[] {
  return report.rows.filter((row) => !row.is_payment_only && !row.is_interest_only)
}

function isOverdueRow(row: MemberDebtTableRow, asOfDate: string): boolean {
  if (row.is_payment_only || row.is_interest_only) return false
  return row.remaining_due > 0.005 && row.due_date < asOfDate
}

function isNotYetDueRow(row: MemberDebtTableRow, asOfDate: string): boolean {
  if (row.is_payment_only || row.is_interest_only) return false
  if (row.row_status === 'not_due') return true
  return row.remaining_due > 0.005 && row.due_date >= asOfDate
}

/**
 * TOPLAM kolonları: ana para aidat satırlarından; faiz canonical monthly_timeline’dan.
 * Görünür satırların kör SUM’u kullanılmaz (aidatsız faiz ayları timeline’da kalır).
 */
export function buildMemberDebtColumnTotals(report: MemberDebtTableReport): MemberDebtColumnTotals {
  const rows = dueRows(report)
  const timeline = report.monthly_interest_timeline ?? []

  const totalDueAmount = roundMoney(rows.reduce((sum, row) => sum + row.monthly_due, 0))
  const totalPaidPrincipalOnTime = roundMoney(
    rows.reduce((sum, row) => sum + (row.paid_principal_on_time ?? 0), 0)
  )
  const totalPaidPrincipalLate = roundMoney(
    rows.reduce((sum, row) => sum + (row.paid_principal_late ?? 0), 0)
  )
  const totalPaidPrincipal = roundMoney(
    rows.reduce(
      (sum, row) => sum + (row.paid_principal_total ?? row.paid_amount ?? 0),
      0
    )
  )

  const timelineAccrued = roundMoney(
    timeline.reduce((sum, entry) => sum + entry.monthly_accrued_interest, 0)
  )
  const timelinePaid = roundMoney(
    timeline.reduce((sum, entry) => sum + entry.monthly_paid_interest, 0)
  )

  const totalAccruedInterest =
    timeline.length > 0
      ? timelineAccrued
      : roundMoney(rows.reduce((sum, row) => sum + (row.accrued_interest_total ?? 0), 0))
  const totalPaidInterest =
    timeline.length > 0
      ? timelinePaid
      : roundMoney(rows.reduce((sum, row) => sum + (row.paid_interest_total ?? 0), 0))

  const totalRemainingPrincipal = roundMoney(rows.reduce((sum, row) => sum + row.remaining_due, 0))
  // Denklem: işleyen − mahsup = kalan (canonical)
  const totalRemainingInterest = roundMoney(Math.max(0, totalAccruedInterest - totalPaidInterest))

  return {
    totalDueAmount,
    totalPaidPrincipalOnTime,
    totalPaidPrincipalLate,
    totalPaidPrincipal,
    totalAccruedInterest,
    totalPaidInterest,
    totalRemainingPrincipal,
    totalRemainingInterest
  }
}

export function buildMemberDebtDueCategorySummary(
  report: MemberDebtTableReport
): MemberDebtDueCategorySummary {
  const rows = dueRows(report)
  const overdueRows = rows.filter((row) => isOverdueRow(row, report.as_of_date))
  const notYetDueRows = rows.filter((row) => isNotYetDueRow(row, report.as_of_date))
  const columns = buildMemberDebtColumnTotals(report)

  const overdueRemainingPrincipal = roundMoney(
    overdueRows.reduce((sum, row) => sum + row.remaining_due, 0)
  )
  // amount_due_today = overdue_principal + total_remaining_interest (canonical)
  const overdueRemainingInterest = columns.totalRemainingInterest
  const notYetDuePrincipal = roundMoney(
    notYetDueRows.reduce((sum, row) => sum + row.remaining_due, 0)
  )
  const amountDueToday = roundMoney(overdueRemainingPrincipal + overdueRemainingInterest)
  const allPeriodsRemainingPrincipal = roundMoney(
    overdueRemainingPrincipal + notYetDuePrincipal
  )
  const allPeriodsTotalDebt = roundMoney(amountDueToday + notYetDuePrincipal)

  return {
    overdueRemainingPrincipal,
    overdueRemainingInterest,
    amountDueToday,
    notYetDuePrincipal,
    allPeriodsRemainingPrincipal,
    allPeriodsTotalDebt,
    overdueRowCount: overdueRows.length
  }
}

/** Canonical satırlardan display summary üretir; hesap motorunu çağırmaz. */
export function buildMemberDebtDisplaySummary(
  report: MemberDebtTableReport
): MemberDebtDisplaySummary {
  const columns = buildMemberDebtColumnTotals(report)
  const categories = buildMemberDebtDueCategorySummary(report)

  validateMemberDebtDisplaySummary(columns, categories)

  const statusSummary =
    categories.amountDueToday > EPSILON
      ? `Bugün: ${categories.amountDueToday.toLocaleString('tr-TR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })} ₺`
      : categories.notYetDuePrincipal > EPSILON
        ? 'Vadesi gelmeyen aidat var'
        : '—'

  const totalRowCells: Record<MemberDebtTotalColumnKey, string | number | null> = {
    period: 'TOPLAM',
    due: columns.totalDueAmount,
    dueDate: null,
    paidOnTime: columns.totalPaidPrincipalOnTime,
    paidLate: columns.totalPaidPrincipalLate,
    paidPrincipal: columns.totalPaidPrincipal,
    accruedInterest: columns.totalAccruedInterest,
    paidInterest: columns.totalPaidInterest,
    remainingPrincipal: columns.totalRemainingPrincipal,
    remainingInterest: columns.totalRemainingInterest,
    closingDate: null,
    status: statusSummary,
    detail: null,
    actions: null
  }

  return { columns, categories, totalRowCells }
}

export function validateMemberDebtDisplaySummary(
  columns: MemberDebtColumnTotals,
  categories?: MemberDebtDueCategorySummary
): void {
  const principalParts = roundMoney(
    columns.totalPaidPrincipalOnTime + columns.totalPaidPrincipalLate
  )
  if (Math.abs(principalParts - columns.totalPaidPrincipal) > EPSILON) {
    throw new Error(
      `[borç tablosu özet] Vadesinde (${columns.totalPaidPrincipalOnTime}) + Sonradan (${columns.totalPaidPrincipalLate}) ≠ Ana Paraya Toplam (${columns.totalPaidPrincipal})`
    )
  }

  const remainingFromDue = roundMoney(columns.totalDueAmount - columns.totalPaidPrincipal)
  if (Math.abs(remainingFromDue - columns.totalRemainingPrincipal) > EPSILON) {
    throw new Error(
      `[borç tablosu özet] Aidat (${columns.totalDueAmount}) − Mahsup (${columns.totalPaidPrincipal}) ≠ Kalan Ana Para (${columns.totalRemainingPrincipal})`
    )
  }

  const remainingInterest = roundMoney(columns.totalAccruedInterest - columns.totalPaidInterest)
  if (Math.abs(remainingInterest - columns.totalRemainingInterest) > EPSILON) {
    throw new Error(
      `[borç tablosu özet] İşleyen (${columns.totalAccruedInterest}) − Faize Mahsup (${columns.totalPaidInterest}) ≠ Kalan Faiz (${columns.totalRemainingInterest})`
    )
  }

  if (!categories) return

  const dueToday = roundMoney(
    categories.overdueRemainingPrincipal + categories.overdueRemainingInterest
  )
  if (Math.abs(dueToday - categories.amountDueToday) > EPSILON) {
    throw new Error(
      `[borç tablosu özet] Bugün ödenmesi gereken tutarsız: ${categories.amountDueToday} ≠ ${dueToday}`
    )
  }

  const allPrincipal = roundMoney(
    categories.overdueRemainingPrincipal + categories.notYetDuePrincipal
  )
  if (Math.abs(allPrincipal - categories.allPeriodsRemainingPrincipal) > EPSILON) {
    throw new Error(
      `[borç tablosu özet] Tüm dönemler kalan ana para tutarsız: ${categories.allPeriodsRemainingPrincipal} ≠ ${allPrincipal}`
    )
  }

  const allTotal = roundMoney(categories.amountDueToday + categories.notYetDuePrincipal)
  if (Math.abs(allTotal - categories.allPeriodsTotalDebt) > EPSILON) {
    throw new Error(
      `[borç tablosu özet] Tüm dönemler genel toplam tutarsız: ${categories.allPeriodsTotalDebt} ≠ ${allTotal}`
    )
  }
}
