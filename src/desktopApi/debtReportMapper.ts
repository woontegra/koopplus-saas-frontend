/**
 * Backend debt-table API cuid/synthetic string id → masaüstü numeric id.
 */
import type {
  InterestAccrualEvent,
  MemberDebtAudit,
  MemberDebtTableReport,
  MemberDebtTableRow,
  MemberExtraDebtRow,
  MemberInterestSpecialPeriod,
  MemberPaymentHistoryItem,
  MonthlyInterestTimelineEntry
} from '@shared/types'
import { toNumericId } from './idMap'

function asIdString(value: unknown): string {
  if (value == null) return ''
  return String(value)
}

function toNum(tenantId: string, value: unknown, prefix = ''): number {
  const raw = asIdString(value)
  if (!raw) return 0
  if (/^-?\d+$/.test(raw)) return Number(raw)
  return toNumericId(tenantId, prefix ? `${prefix}:${raw}` : raw)
}

function mapAccrual(tenantId: string, event: InterestAccrualEvent): InterestAccrualEvent {
  return {
    ...event,
    source_due_id: toNum(tenantId, event.source_due_id, 'ledger'),
    payment_ids: (event.payment_ids ?? []).map((id) => toNum(tenantId, id, 'payment'))
  }
}

function mapRow(tenantId: string, row: MemberDebtTableRow): MemberDebtTableRow {
  return {
    ...row,
    ledger_entry_id: toNum(tenantId, row.ledger_entry_id, 'ledger'),
    payment_ids: row.payment_ids?.map((id) => toNum(tenantId, id, 'payment')),
    payment_allocations: row.payment_allocations?.map((a) => ({
      ...a,
      payment_id: toNum(tenantId, a.payment_id, 'payment')
    })),
    interest_accrual_events: row.interest_accrual_events?.map((e) => mapAccrual(tenantId, e)),
    source_interest_accruals: row.source_interest_accruals?.map((e) => mapAccrual(tenantId, e))
  }
}

function mapPayment(tenantId: string, item: MemberPaymentHistoryItem): MemberPaymentHistoryItem {
  return { ...item, payment_id: toNum(tenantId, item.payment_id, 'payment') }
}

function mapExtra(tenantId: string, row: MemberExtraDebtRow): MemberExtraDebtRow {
  return {
    ...row,
    id: toNum(tenantId, row.id, 'extra'),
    partner_id: toNumericId(tenantId, asIdString(row.partner_id))
  }
}

function mapPeriod(tenantId: string, row: MemberInterestSpecialPeriod): MemberInterestSpecialPeriod {
  return {
    ...row,
    id: toNum(tenantId, row.id, 'period'),
    member_id: toNumericId(tenantId, asIdString(row.member_id))
  }
}

function mapAudit(tenantId: string, audit: MemberDebtAudit): MemberDebtAudit {
  return {
    ...audit,
    payment_allocations: audit.payment_allocations.map((p) => ({
      ...p,
      payment_id: toNum(tenantId, p.payment_id, 'payment')
    }))
  }
}

function mapTimeline(
  tenantId: string,
  entry: MonthlyInterestTimelineEntry
): MonthlyInterestTimelineEntry {
  return {
    ...entry,
    accrual_events: entry.accrual_events.map((e) => mapAccrual(tenantId, e))
  }
}

/** API raporunu (string id) masaüstü numeric id raporuna çevirir. */
export function toDesktopDebtReport(
  tenantId: string,
  report: MemberDebtTableReport
): MemberDebtTableReport {
  return {
    ...report,
    // partners list ile aynı eşleme (prefix yok)
    partner_id: toNumericId(tenantId, asIdString(report.partner_id)),
    rows: (report.rows ?? []).map((row) => mapRow(tenantId, row)),
    planned_rows: report.planned_rows?.map((row) => mapRow(tenantId, row)),
    extra_debts: (report.extra_debts ?? []).map((row) => mapExtra(tenantId, row)),
    payment_history: (report.payment_history ?? []).map((item) => mapPayment(tenantId, item)),
    interest_special_periods: (report.interest_special_periods ?? []).map((p) =>
      mapPeriod(tenantId, p)
    ),
    audit: report.audit ? mapAudit(tenantId, report.audit) : undefined,
    interest_accrual_events: report.interest_accrual_events?.map((e) => mapAccrual(tenantId, e)),
    monthly_interest_timeline: report.monthly_interest_timeline?.map((e) =>
      mapTimeline(tenantId, e)
    )
  }
}
