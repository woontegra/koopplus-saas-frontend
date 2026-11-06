import { buildMemberDebtDisplaySummary } from './memberDebtTableSummary'
import type { MemberDebtTableReport } from './types'

const EPSILON = 0.005

export type AllMembersDebtPdfScope = 'all_active' | 'with_debt' | 'overdue'

export interface AllMembersDebtTablePdfOptions {
  report_date: string
  scope: AllMembersDebtPdfScope
  include_planned_rows: boolean
}

export interface AllMembersDebtPdfPreview {
  total_active_count: number
  matching_count: number
  scope: AllMembersDebtPdfScope
  report_date: string
}

export function memberGeneralDebt(report: MemberDebtTableReport): number {
  return report.totals.general_grand_total ?? report.totals.grand_total ?? 0
}

export function memberHasDebtForBulkPdf(report: MemberDebtTableReport): boolean {
  return memberGeneralDebt(report) > EPSILON
}

export function memberHasOverdueDebtForBulkPdf(report: MemberDebtTableReport): boolean {
  const summary = buildMemberDebtDisplaySummary(report)
  return (
    summary.categories.overdueRowCount > 0 ||
    summary.categories.amountDueToday > EPSILON
  )
}

export function memberMatchesBulkPdfScope(
  report: MemberDebtTableReport,
  scope: AllMembersDebtPdfScope
): boolean {
  if (scope === 'all_active') return true
  if (scope === 'with_debt') return memberHasDebtForBulkPdf(report)
  return memberHasOverdueDebtForBulkPdf(report)
}

export function allMembersDebtPdfDefaultFileName(
  scope: AllMembersDebtPdfScope,
  reportDate: string
): string {
  const dateToken = reportDate.slice(0, 10)
  if (scope === 'with_debt' || scope === 'overdue') {
    return `Borclu-Uyeler-Borc-Tablosu-${dateToken}.pdf`
  }
  return `Tum-Uyeler-Borc-Tablosu-${dateToken}.pdf`
}
