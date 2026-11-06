/**
 * Masaüstü shared/memberDebtTableSummary.ts portu.
 * Motor çağırmaz; yalnızca backend satır/timeline alanlarını toplar.
 */
import type { ApiDebtTableRow, ApiMemberDebtTableReport } from '../api/debtTypes'

const EPSILON = 0.01

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

export type MemberDebtColumnTotals = {
  totalDueAmount: number
  totalPaidPrincipalOnTime: number
  totalPaidPrincipalLate: number
  totalPaidPrincipal: number
  totalAccruedInterest: number
  totalPaidInterest: number
  totalRemainingPrincipal: number
  totalRemainingInterest: number
}

export type MemberDebtDueCategorySummary = {
  overdueRemainingPrincipal: number
  overdueRemainingInterest: number
  amountDueToday: number
  notYetDuePrincipal: number
  allPeriodsRemainingPrincipal: number
  allPeriodsTotalDebt: number
  overdueRowCount: number
}

export type MemberDebtDisplaySummary = {
  columns: MemberDebtColumnTotals
  categories: MemberDebtDueCategorySummary
}

function dueRows(report: ApiMemberDebtTableReport): ApiDebtTableRow[] {
  return report.rows.filter((row) => !row.is_payment_only && !row.is_interest_only)
}

function isOverdueRow(row: ApiDebtTableRow, asOfDate: string): boolean {
  if (row.is_payment_only || row.is_interest_only) return false
  return row.remaining_due > 0.005 && row.due_date < asOfDate
}

function isNotYetDueRow(row: ApiDebtTableRow, asOfDate: string): boolean {
  if (row.is_payment_only || row.is_interest_only) return false
  if (row.row_status === 'not_due') return true
  return row.remaining_due > 0.005 && row.due_date >= asOfDate
}

export function buildMemberDebtColumnTotals(
  report: ApiMemberDebtTableReport
): MemberDebtColumnTotals {
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
    rows.reduce((sum, row) => sum + (row.paid_principal_total ?? row.paid_amount ?? 0), 0)
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

export function buildMemberDebtDisplaySummary(
  report: ApiMemberDebtTableReport
): MemberDebtDisplaySummary {
  const columns = buildMemberDebtColumnTotals(report)
  const rows = dueRows(report)
  const overdueRows = rows.filter((row) => isOverdueRow(row, report.as_of_date))
  const notYetDueRows = rows.filter((row) => isNotYetDueRow(row, report.as_of_date))

  const overdueRemainingPrincipal = roundMoney(
    overdueRows.reduce((sum, row) => sum + row.remaining_due, 0)
  )
  const overdueRemainingInterest = columns.totalRemainingInterest
  const notYetDuePrincipal = roundMoney(
    notYetDueRows.reduce((sum, row) => sum + row.remaining_due, 0)
  )
  const amountDueToday = roundMoney(overdueRemainingPrincipal + overdueRemainingInterest)
  const allPeriodsRemainingPrincipal = roundMoney(overdueRemainingPrincipal + notYetDuePrincipal)
  const allPeriodsTotalDebt = roundMoney(amountDueToday + notYetDuePrincipal)

  const categories: MemberDebtDueCategorySummary = {
    overdueRemainingPrincipal,
    overdueRemainingInterest,
    amountDueToday,
    notYetDuePrincipal,
    allPeriodsRemainingPrincipal,
    allPeriodsTotalDebt,
    overdueRowCount: overdueRows.length
  }

  // Soft check — UI’yi kırmaz
  if (Math.abs(columns.totalDueAmount - columns.totalPaidPrincipal - columns.totalRemainingPrincipal) > EPSILON) {
    // display-only; backend totals remain source of truth for grand totals
  }

  return { columns, categories }
}
