/**
 * Üye Cari Ekstresi ve Üye Borç Cetveli presentation modelleri.
 * Yalnızca canonical MemberDebtTableReport dönüşümü — yeniden hesap yok.
 */
import { buildMemberDebtDisplaySummary } from './memberDebtTableSummary'
import type {
  InterestAccrualEvent,
  MemberDebtTableReport,
  MemberDebtTableRow
} from './types'

const EPSILON = 0.01
const MONTH_NAMES = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık'
]

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

function periodLabel(year: number, month: number): string {
  return `${MONTH_NAMES[month - 1] ?? month} ${year}`
}

function formatMoneyTr(value: number): string {
  return value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function firstDayOfMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}-01`
}

function endOfMonth(year: number, month: number): string {
  const day = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const idx = year * 12 + (month - 1) + delta
  return { year: Math.floor(idx / 12), month: (idx % 12) + 1 }
}

function parseYearMonth(value: string): { year: number; month: number } | null {
  const match = value.trim().match(/^(\d{4})-(\d{2})$/)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  if (month < 1 || month > 12) return null
  return { year, month }
}

// ─── Period presets ───────────────────────────────────────────────────────────

export type StatementPeriodPreset =
  | 'all'
  | 'last_12_months'
  | 'this_year'
  | 'last_year'
  | 'custom'

export interface StatementPeriodSelection {
  preset: StatementPeriodPreset
  /** YYYY-MM — yalnızca custom */
  start_month?: string | null
  end_month?: string | null
}

export interface ResolvedStatementPeriod {
  preset: StatementPeriodPreset
  label: string
  date_from: string | null
  date_to: string
  start_month: string | null
  end_month: string | null
}

export function resolveStatementPeriod(
  selection: StatementPeriodSelection,
  asOfDate = todayISO()
): ResolvedStatementPeriod {
  const [yStr, mStr] = asOfDate.split('-')
  const year = Number(yStr)
  const month = Number(mStr)

  switch (selection.preset) {
    case 'last_12_months': {
      const start = addMonths(year, month, -11)
      return {
        preset: 'last_12_months',
        label: 'Son 12 Ay',
        date_from: firstDayOfMonth(start.year, start.month),
        date_to: asOfDate,
        start_month: `${start.year}-${String(start.month).padStart(2, '0')}`,
        end_month: `${year}-${String(month).padStart(2, '0')}`
      }
    }
    case 'this_year':
      return {
        preset: 'this_year',
        label: `Bu Yıl (${year})`,
        date_from: `${year}-01-01`,
        date_to: asOfDate,
        start_month: `${year}-01`,
        end_month: `${year}-${String(month).padStart(2, '0')}`
      }
    case 'last_year':
      return {
        preset: 'last_year',
        label: `Geçen Yıl (${year - 1})`,
        date_from: `${year - 1}-01-01`,
        date_to: `${year - 1}-12-31`,
        start_month: `${year - 1}-01`,
        end_month: `${year - 1}-12`
      }
    case 'custom': {
      const start = parseYearMonth(selection.start_month ?? '')
      const end = parseYearMonth(selection.end_month ?? '')
      if (!start || !end) {
        return resolveStatementPeriod({ preset: 'all' }, asOfDate)
      }
      const dateFrom = firstDayOfMonth(start.year, start.month)
      const dateTo = endOfMonth(end.year, end.month)
      return {
        preset: 'custom',
        label: `${periodLabel(start.year, start.month)} — ${periodLabel(end.year, end.month)}`,
        date_from: dateFrom,
        date_to: dateTo < asOfDate ? dateTo : asOfDate,
        start_month: selection.start_month ?? null,
        end_month: selection.end_month ?? null
      }
    }
    case 'all':
    default:
      return {
        preset: 'all',
        label: 'Tüm dönemler',
        date_from: null,
        date_to: asOfDate,
        start_month: null,
        end_month: null
      }
  }
}

// ─── Cari Ekstre model ────────────────────────────────────────────────────────

export type CurrentAccountEventType =
  | 'due_accrual'
  | 'interest_accrual'
  | 'bank_payment'
  | 'manual_payment'
  | 'extra_debt'
  | 'extra_debt_payment'
  | 'adjustment'

export interface PartnerCurrentAccountEvent {
  event_date: string
  event_type: CurrentAccountEventType
  event_type_label: string
  description: string
  debit_amount: number
  payment_amount: number
  principal_balance: number
  interest_balance: number
  total_balance: number
  source_ids: string[]
  sort_key: string
}

export interface PartnerCurrentAccountSummary {
  opening_balance: number
  /** Dönemde tahakkuk eden aidat + ek borç + faiz (gerçek ödeme değil) */
  period_accrued_dues_and_interest: number
  /** @deprecated period_accrued_dues_and_interest ile aynı */
  period_debt_created: number
  /** Banka + manuel gerçek ödeme toplamı */
  period_real_collections: number
  overdue_remaining_principal: number
  remaining_interest: number
  amount_due_today: number
  not_yet_due_principal: number
  /** Vadesi geçmiş + vadesi gelmeyen kalan ana para */
  remaining_principal_all: number
  /** Tüm dönemler kalan ana para (canonical) */
  remaining_principal: number
  all_periods_total_debt: number
  /** Görüntüde “Tüm Dönemler Genel Toplam” ile aynı */
  closing_total_balance: number
  equation_today_due_label: string
  equation_all_periods_label: string
}

export interface PartnerCurrentAccountStatementModel {
  member: { partner_id: number; partner_no: string; full_name: string }
  period: ResolvedStatementPeriod
  as_of_date: string
  opening_summary: PartnerCurrentAccountSummary
  events: PartnerCurrentAccountEvent[]
  closing_summary: PartnerCurrentAccountSummary
  payment_allocation_rows: Array<{
    payment_date: string
    payment_amount: number
    applied_to_interest: number
    applied_to_principal: number
    applied_to_extra_debt: number
    carried_forward: number
    target_periods: string
  }>
}

interface RawEvent {
  event_date: string
  event_type: CurrentAccountEventType
  event_type_label: string
  description: string
  debit_amount: number
  payment_amount: number
  principal_delta: number
  interest_delta: number
  source_ids: string[]
  tie: number
}

function eventTypeOrder(type: CurrentAccountEventType): number {
  switch (type) {
    case 'due_accrual':
      return 1
    case 'extra_debt':
      return 2
    case 'interest_accrual':
      return 3
    case 'bank_payment':
    case 'manual_payment':
    case 'extra_debt_payment':
      return 4
    default:
      return 5
  }
}

function buildPaymentDescription(
  amount: number,
  toInterest: number,
  toPrincipal: number,
  toExtra: number,
  carried: number,
  isBank: boolean
): string {
  const parts: string[] = []
  parts.push(
    `${formatMoneyTr(amount)} TL ${isBank ? 'banka ödemesi' : 'ödeme'} alındı.`
  )
  const alloc: string[] = []
  if (toInterest > EPSILON) alloc.push(`${formatMoneyTr(toInterest)} TL faize`)
  if (toPrincipal > EPSILON) alloc.push(`${formatMoneyTr(toPrincipal)} TL ana paraya`)
  if (toExtra > EPSILON) alloc.push(`${formatMoneyTr(toExtra)} TL ek borca`)
  if (carried > EPSILON) alloc.push(`${formatMoneyTr(carried)} TL devreden`)
  if (alloc.length > 0) {
    parts.push(`${alloc.join(', ')} mahsup edildi.`)
  }
  return parts.join(' ')
}

function collectRawEvents(report: MemberDebtTableReport): RawEvent[] {
  const events: RawEvent[] = []

  for (const row of report.rows) {
    if (row.is_payment_only || row.is_interest_only) continue
    if (row.monthly_due <= EPSILON) continue
    const date = firstDayOfMonth(row.period_year, row.period_month)
    events.push({
      event_date: date,
      event_type: 'due_accrual',
      event_type_label: 'Aidat Tahakkuku',
      description: `${periodLabel(row.period_year, row.period_month)} aidatı tahakkuk etti.`,
      debit_amount: roundMoney(row.monthly_due),
      payment_amount: 0,
      principal_delta: roundMoney(row.monthly_due),
      interest_delta: 0,
      source_ids: [`due:${row.ledger_entry_id}`],
      tie: 1
    })
  }

  // Faiz: aynı takvim ayındaki tahakkukları birleştir
  const accruals = report.interest_accrual_events ?? []
  const byAccrualMonth = new Map<string, InterestAccrualEvent[]>()
  for (const event of accruals) {
    if (event.accrued_interest_amount <= EPSILON) continue
    const key = `${event.accrual_period_year}-${event.accrual_period_month}`
    const list = byAccrualMonth.get(key) ?? []
    list.push(event)
    byAccrualMonth.set(key, list)
  }

  for (const [, monthEvents] of byAccrualMonth) {
    const year = monthEvents[0].accrual_period_year
    const month = monthEvents[0].accrual_period_month
    const total = roundMoney(
      monthEvents.reduce((sum, e) => sum + e.accrued_interest_amount, 0)
    )
    const hasDueInMonth = report.rows.some(
      (r) =>
        !r.is_payment_only &&
        !r.is_interest_only &&
        r.period_year === year &&
        r.period_month === month &&
        r.monthly_due > EPSILON
    )
    const sourceLines = monthEvents.map((e) => {
      const src = periodLabel(e.source_due_period_year, e.source_due_period_month)
      return `${src} açık ana para üzerinden ${formatMoneyTr(e.accrued_interest_amount)} TL`
    })
    const description = hasDueInMonth
      ? `${periodLabel(year, month)} dönemi için gecikme faizi işlemiştir. ${sourceLines.join('; ')}.`
      : `Bu ay yeni aidat tahakkuku yoktur. Geçmiş açık ana para için ${formatMoneyTr(total)} TL gecikme faizi işlemiştir. ${sourceLines.join('; ')}.`

    events.push({
      event_date: firstDayOfMonth(year, month),
      event_type: 'interest_accrual',
      event_type_label: 'Faiz Tahakkuku',
      description,
      debit_amount: total,
      payment_amount: 0,
      principal_delta: 0,
      interest_delta: total,
      source_ids: monthEvents.map(
        (e) => `interest:${e.source_due_id}:${e.accrual_period_year}-${e.accrual_period_month}`
      ),
      tie: 3
    })
  }

  for (const extra of report.extra_debts) {
    if (extra.amount <= EPSILON) continue
    events.push({
      event_date: extra.debt_date,
      event_type: 'extra_debt',
      event_type_label: 'Ek Borç',
      description: `${extra.debt_type_label}${extra.description ? ` — ${extra.description}` : ''} kaydedildi.`,
      debit_amount: roundMoney(extra.amount),
      payment_amount: 0,
      principal_delta: 0,
      interest_delta: 0,
      source_ids: [`extra:${extra.id}`],
      tie: 2
    })
  }

  const paymentById = new Map(
    report.payment_history.map((item) => [item.payment_id, item])
  )
  const auditPays = report.audit?.payment_allocations ?? []

  for (const pay of auditPays) {
    const history = paymentById.get(pay.payment_id)
    const isBank = !!history?.is_bank_import || history?.payment_method === 'Banka'
    const eventType: CurrentAccountEventType = isBank ? 'bank_payment' : 'manual_payment'
    events.push({
      event_date: pay.payment_date,
      event_type: eventType,
      event_type_label: isBank ? 'Banka Ödemesi' : 'Manuel Ödeme',
      description: buildPaymentDescription(
        pay.payment_amount,
        pay.applied_to_interest,
        pay.applied_to_principal,
        pay.applied_to_extra_debt,
        pay.carried_forward,
        isBank
      ),
      debit_amount: 0,
      payment_amount: roundMoney(pay.payment_amount),
      principal_delta: -roundMoney(pay.applied_to_principal),
      interest_delta: -roundMoney(pay.applied_to_interest),
      source_ids: [`payment:${pay.payment_id}`],
      tie: 4
    })
  }

  // Audit'te olmayan ödemeler (aidatsız üye vb.)
  const auditedIds = new Set(auditPays.map((p) => p.payment_id))
  for (const history of report.payment_history) {
    if (auditedIds.has(history.payment_id)) continue
    const isBank = !!history.is_bank_import || history.payment_method === 'Banka'
    events.push({
      event_date: history.payment_date,
      event_type: isBank ? 'bank_payment' : 'manual_payment',
      event_type_label: isBank ? 'Banka Ödemesi' : 'Manuel Ödeme',
      description: buildPaymentDescription(history.amount, 0, 0, 0, history.amount, isBank),
      debit_amount: 0,
      payment_amount: roundMoney(history.amount),
      principal_delta: 0,
      interest_delta: 0,
      source_ids: [`payment:${history.payment_id}`],
      tie: 4
    })
  }

  return events.sort((a, b) => {
    if (a.event_date !== b.event_date) return a.event_date.localeCompare(b.event_date)
    const order = eventTypeOrder(a.event_type) - eventTypeOrder(b.event_type)
    if (order !== 0) return order
    return a.tie - b.tie
  })
}

function applyRawEvents(rawEvents: RawEvent[]): PartnerCurrentAccountEvent[] {
  let principal = 0
  let interest = 0
  const result: PartnerCurrentAccountEvent[] = []

  for (let i = 0; i < rawEvents.length; i += 1) {
    const raw = rawEvents[i]
    principal = roundMoney(Math.max(0, principal + raw.principal_delta))
    interest = roundMoney(Math.max(0, interest + raw.interest_delta))
    const total = roundMoney(principal + interest)
    result.push({
      event_date: raw.event_date,
      event_type: raw.event_type,
      event_type_label: raw.event_type_label,
      description: raw.description,
      debit_amount: raw.debit_amount,
      payment_amount: raw.payment_amount,
      principal_balance: principal,
      interest_balance: interest,
      total_balance: total,
      source_ids: raw.source_ids,
      sort_key: `${raw.event_date}:${String(i).padStart(5, '0')}`
    })
  }

  return result
}

function buildCurrentAccountSummary(
  events: PartnerCurrentAccountEvent[],
  openingPrincipal: number,
  openingInterest: number,
  report: MemberDebtTableReport
): PartnerCurrentAccountSummary {
  const periodAccrued = roundMoney(events.reduce((sum, e) => sum + e.debit_amount, 0))
  const periodCollections = roundMoney(events.reduce((sum, e) => sum + e.payment_amount, 0))
  const display = buildMemberDebtDisplaySummary(report)
  const overdue = display.categories.overdueRemainingPrincipal
  const interest = display.columns.totalRemainingInterest
  const todayDue = display.categories.amountDueToday
  const notYetDue = display.categories.notYetDuePrincipal
  const remainingAll = display.categories.allPeriodsRemainingPrincipal
  const allTotal = display.categories.allPeriodsTotalDebt

  return {
    opening_balance: roundMoney(openingPrincipal + openingInterest),
    period_accrued_dues_and_interest: periodAccrued,
    period_debt_created: periodAccrued,
    period_real_collections: periodCollections,
    overdue_remaining_principal: overdue,
    remaining_interest: interest,
    amount_due_today: todayDue,
    not_yet_due_principal: notYetDue,
    remaining_principal_all: remainingAll,
    remaining_principal: display.columns.totalRemainingPrincipal,
    all_periods_total_debt: allTotal,
    closing_total_balance: allTotal,
    equation_today_due_label: `${formatMoneyTr(overdue)} TL + ${formatMoneyTr(interest)} TL = ${formatMoneyTr(todayDue)} TL`,
    equation_all_periods_label: `${formatMoneyTr(todayDue)} TL + ${formatMoneyTr(notYetDue)} TL = ${formatMoneyTr(allTotal)} TL`
  }
}

export function buildPartnerCurrentAccountStatement(
  report: MemberDebtTableReport,
  periodSelection: StatementPeriodSelection = { preset: 'all' }
): PartnerCurrentAccountStatementModel {
  const period = resolveStatementPeriod(periodSelection, report.as_of_date)
  const allRaw = collectRawEvents(report)
  const allEvents = applyRawEvents(allRaw)

  const inRange = (date: string): boolean => {
    if (period.date_from && date < period.date_from) return false
    if (date > period.date_to) return false
    return true
  }

  let openingPrincipal = 0
  let openingInterest = 0
  for (const event of allEvents) {
    if (period.date_from && event.event_date < period.date_from) {
      openingPrincipal = event.principal_balance
      openingInterest = event.interest_balance
    }
  }

  const filtered = allEvents.filter((e) => inRange(e.event_date))

  const opening_summary = buildCurrentAccountSummary(
    filtered,
    openingPrincipal,
    openingInterest,
    report
  )
  const closing_summary = { ...opening_summary }

  const payment_allocation_rows = (report.audit?.payment_allocations ?? []).map((pay) => {
    const targets = report.rows
      .filter((row) =>
        (row.payment_allocations ?? []).some((a) => a.payment_id === pay.payment_id)
      )
      .map((row) => row.period_label)
    return {
      payment_date: pay.payment_date,
      payment_amount: pay.payment_amount,
      applied_to_interest: pay.applied_to_interest,
      applied_to_principal: pay.applied_to_principal,
      applied_to_extra_debt: pay.applied_to_extra_debt,
      carried_forward: pay.carried_forward,
      target_periods: [...new Set(targets)].join(', ')
    }
  })

  return {
    member: {
      partner_id: report.partner_id,
      partner_no: report.partner_no,
      full_name: report.full_name
    },
    period,
    as_of_date: report.as_of_date,
    opening_summary,
    events: filtered,
    closing_summary,
    payment_allocation_rows
  }
}

export function validateCurrentAccountStatement(
  model: PartnerCurrentAccountStatementModel
): void {
  for (const event of model.events) {
    const sum = roundMoney(event.principal_balance + event.interest_balance)
    if (Math.abs(sum - event.total_balance) > EPSILON) {
      throw new Error(
        `Cari ekstre bakiye tutarsız ${event.event_date}: ${event.total_balance} ≠ ${sum}`
      )
    }
  }

  for (const pay of model.payment_allocation_rows) {
    const parts = roundMoney(
      pay.applied_to_interest +
        pay.applied_to_principal +
        pay.applied_to_extra_debt +
        pay.carried_forward
    )
    if (Math.abs(parts - pay.payment_amount) > EPSILON) {
      throw new Error(
        `Ödeme mahsup tutarsız ${pay.payment_date}: ${pay.payment_amount} ≠ ${parts}`
      )
    }
  }
}

// ─── Borç Cetveli model ───────────────────────────────────────────────────────

export type OpenDebtStatus = 'partial' | 'unpaid' | 'not_due' | 'closed'

export interface PartnerOpenDebtItem {
  due_period: string
  period_year: number
  period_month: number
  due_amount: number
  paid_principal: number
  remaining_principal: number
  remaining_interest: number
  total_open_amount: number
  last_payment_date: string | null
  status: OpenDebtStatus
  status_label: string
  ledger_entry_id: number
}

export interface PartnerOpenDebtInterestDetail {
  interest_month: string
  interest_year: number
  interest_month_num: number
  source_due_period: string
  source_year: number
  source_month: number
  open_principal: number
  interest_rate: number
  accrued_interest: number
  paid_interest: number
  remaining_interest: number
}

export interface PartnerOpenDebtSummary {
  overdue_remaining_principal: number
  remaining_interest: number
  amount_due_today: number
  not_yet_due_principal: number
  all_periods_total_debt: number
  last_payment_date: string | null
  last_payment_amount: number | null
  total_due_amount: number
  total_paid: number
  remaining_principal: number
  total_accrued_interest: number
  total_paid_interest: number
  equation_label: string
}

export interface PartnerOpenDebtStatementModel {
  member: { partner_id: number; partner_no: string; full_name: string }
  report_date: string
  show_closed: boolean
  summary: PartnerOpenDebtSummary
  overdue_debts: PartnerOpenDebtItem[]
  not_yet_due_debts: PartnerOpenDebtItem[]
  closed_debts: PartnerOpenDebtItem[]
  interest_details: PartnerOpenDebtInterestDetail[]
  interest_explanation: string
}

function mapDebtRowToOpenItem(
  row: MemberDebtTableRow,
  reportDate: string
): PartnerOpenDebtItem | null {
  if (row.is_payment_only || row.is_interest_only) return null

  const remainingPrincipal = roundMoney(row.remaining_due)
  const remainingInterest = roundMoney(row.delay_interest)
  const paidPrincipal = roundMoney(row.paid_principal_total ?? row.paid_amount ?? 0)
  const totalOpen = roundMoney(remainingPrincipal + remainingInterest)
  const isClosed = remainingPrincipal <= EPSILON && remainingInterest <= EPSILON

  let status: OpenDebtStatus
  let status_label: string
  if (isClosed) {
    status = 'closed'
    status_label = 'Kapandı'
  } else if (row.row_status === 'not_due' || row.due_date >= reportDate) {
    status = 'not_due'
    status_label = 'Vadesi Gelmedi'
  } else if (paidPrincipal > EPSILON) {
    status = 'partial'
    status_label = 'Kısmi Ödendi'
  } else {
    status = 'unpaid'
    status_label = 'Ödenmedi'
  }

  const lastPayment =
    (row.payment_allocations ?? [])
      .map((a) => a.payment_date)
      .sort()
      .at(-1) ?? (row.closing_date ?? null)

  return {
    due_period: row.period_label,
    period_year: row.period_year,
    period_month: row.period_month,
    due_amount: roundMoney(row.monthly_due),
    paid_principal: paidPrincipal,
    remaining_principal: remainingPrincipal,
    remaining_interest: remainingInterest,
    total_open_amount: totalOpen,
    last_payment_date: lastPayment,
    status,
    status_label,
    ledger_entry_id: row.ledger_entry_id
  }
}

export function buildPartnerOpenDebtStatement(
  report: MemberDebtTableReport,
  options: { show_closed?: boolean } = {}
): PartnerOpenDebtStatementModel {
  const showClosed = options.show_closed === true
  const display = buildMemberDebtDisplaySummary(report)
  const items = report.rows
    .map((row) => mapDebtRowToOpenItem(row, report.as_of_date))
    .filter((item): item is PartnerOpenDebtItem => item != null)

  const overdue_debts = items.filter(
    (item) =>
      item.status !== 'closed' &&
      item.status !== 'not_due' &&
      item.remaining_principal + item.remaining_interest > EPSILON
  )
  const not_yet_due_debts = items.filter((item) => item.status === 'not_due')
  const closed_debts = showClosed ? items.filter((item) => item.status === 'closed') : []

  const payments = report.payment_history
  const lastPayment = payments.length > 0 ? payments[payments.length - 1] : null

  const overduePrincipal = display.categories.overdueRemainingPrincipal
  const remainingInterest = display.columns.totalRemainingInterest
  const amountDueToday = roundMoney(overduePrincipal + remainingInterest)

  const summary: PartnerOpenDebtSummary = {
    overdue_remaining_principal: overduePrincipal,
    remaining_interest: remainingInterest,
    amount_due_today: amountDueToday,
    not_yet_due_principal: display.categories.notYetDuePrincipal,
    all_periods_total_debt: roundMoney(
      amountDueToday + display.categories.notYetDuePrincipal
    ),
    last_payment_date: lastPayment?.payment_date ?? null,
    last_payment_amount: lastPayment ? roundMoney(lastPayment.amount) : null,
    total_due_amount: display.columns.totalDueAmount,
    total_paid: roundMoney(report.totals.total_paid),
    remaining_principal: display.columns.totalRemainingPrincipal,
    total_accrued_interest: display.columns.totalAccruedInterest,
    total_paid_interest: display.columns.totalPaidInterest,
    equation_label: `${formatMoneyTr(overduePrincipal)} TL + ${formatMoneyTr(remainingInterest)} TL = ${formatMoneyTr(amountDueToday)} TL`
  }

  const interest_details: PartnerOpenDebtInterestDetail[] = (report.interest_accrual_events ?? [])
    .filter((e) => e.accrued_interest_amount > EPSILON)
    .map((e) => ({
      interest_month: periodLabel(e.accrual_period_year, e.accrual_period_month),
      interest_year: e.accrual_period_year,
      interest_month_num: e.accrual_period_month,
      source_due_period: periodLabel(e.source_due_period_year, e.source_due_period_month),
      source_year: e.source_due_period_year,
      source_month: e.source_due_period_month,
      open_principal: roundMoney(e.base_remaining_principal),
      interest_rate: e.monthly_rate,
      accrued_interest: roundMoney(e.accrued_interest_amount),
      paid_interest: roundMoney(e.paid_interest_amount),
      remaining_interest: roundMoney(e.remaining_interest_amount)
    }))
    .sort((a, b) => {
      if (a.interest_year !== b.interest_year) return a.interest_year - b.interest_year
      if (a.interest_month_num !== b.interest_month_num) {
        return a.interest_month_num - b.interest_month_num
      }
      if (a.source_year !== b.source_year) return a.source_year - b.source_year
      return a.source_month - b.source_month
    })

  return {
    member: {
      partner_id: report.partner_id,
      partner_no: report.partner_no,
      full_name: report.full_name
    },
    report_date: report.as_of_date,
    show_closed: showClosed,
    summary,
    overdue_debts,
    not_yet_due_debts,
    closed_debts,
    interest_details,
    interest_explanation:
      'Gecikme faizi, vadesi geçmiş açık ana para üzerinden aylık faiz oranına göre hesaplanmıştır. Ödemeler önce birikmiş faize, ardından en eski ana para borcuna mahsup edilmiştir.'
  }
}

export interface MemberAccountStatementLine {
  event_date: string
  event_type: 'opening' | 'due' | 'interest' | 'collection' | 'allocation' | 'extra'
  event_type_label: string
  description: string
  debit: number
  collection: number
  mahsup: number
  interest: number
  balance: number
}

export interface MemberAccountStatement {
  partner_id: number
  partner_no: string
  full_name: string
  date_from: string | null
  date_to: string
  lines: MemberAccountStatementLine[]
  total_debit: number
  total_collection: number
  total_interest: number
  closing_balance: number
}

interface StatementDraft {
  event_date: string
  event_type: MemberAccountStatementLine['event_type']
  event_type_label: string
  description: string
  debit: number
  collection: number
  mahsup: number
  interest_delta: number
  balance_delta: number
  tie: number
}

export function buildMemberAccountStatement(
  report: MemberDebtTableReport,
  dateFrom: string | null,
  dateTo: string
): MemberAccountStatement {
  const drafts: StatementDraft[] = []

  for (const row of report.rows) {
    if (row.is_payment_only || row.is_interest_only) continue
    if (row.monthly_due <= EPSILON) continue
    drafts.push({
      event_date: firstDayOfMonth(row.period_year, row.period_month),
      event_type: 'due',
      event_type_label: 'Aidat',
      description: `${periodLabel(row.period_year, row.period_month)} aidatı`,
      debit: roundMoney(row.monthly_due),
      collection: 0,
      mahsup: 0,
      interest_delta: 0,
      balance_delta: roundMoney(row.monthly_due),
      tie: 1
    })
  }

  for (const extra of report.extra_debts ?? []) {
    if (extra.amount <= EPSILON) continue
    drafts.push({
      event_date: extra.debt_date,
      event_type: 'extra',
      event_type_label: 'Ek Borç',
      description: `${extra.debt_type_label}${extra.description ? ` — ${extra.description}` : ''}`,
      debit: roundMoney(extra.amount),
      collection: 0,
      mahsup: 0,
      interest_delta: 0,
      balance_delta: roundMoney(extra.amount),
      tie: 2
    })
  }

  for (const event of report.interest_accrual_events ?? []) {
    if (event.accrued_interest_amount <= EPSILON) continue
    drafts.push({
      event_date: firstDayOfMonth(event.accrual_period_year, event.accrual_period_month),
      event_type: 'interest',
      event_type_label: 'Faiz',
      description: `${periodLabel(event.source_due_period_year, event.source_due_period_month)} açık ana parasına ${periodLabel(event.accrual_period_year, event.accrual_period_month)} faizi`,
      debit: 0,
      collection: 0,
      mahsup: 0,
      interest_delta: roundMoney(event.accrued_interest_amount),
      balance_delta: roundMoney(event.accrued_interest_amount),
      tie: 3
    })
  }

  for (const payment of report.payment_history) {
    const parts: string[] = []
    for (const row of report.rows) {
      for (const allocation of row.payment_allocations ?? []) {
        if (allocation.payment_id !== payment.payment_id) continue
        if (allocation.applied_to_this_due_interest > EPSILON) {
          parts.push(
            `${periodLabel(row.period_year, row.period_month)} faizi ${formatMoneyTr(allocation.applied_to_this_due_interest)} TL`
          )
          drafts.push({
            event_date: payment.payment_date,
            event_type: 'allocation',
            event_type_label: 'Mahsup',
            description: `${periodLabel(row.period_year, row.period_month)} faizine mahsup`,
            debit: 0,
            collection: 0,
            mahsup: roundMoney(allocation.applied_to_this_due_interest),
            interest_delta: -roundMoney(allocation.applied_to_this_due_interest),
            balance_delta: -roundMoney(allocation.applied_to_this_due_interest),
            tie: 5
          })
        }
        if (allocation.applied_to_this_due_principal > EPSILON) {
          parts.push(
            `${periodLabel(row.period_year, row.period_month)} ana para ${formatMoneyTr(allocation.applied_to_this_due_principal)} TL`
          )
          drafts.push({
            event_date: payment.payment_date,
            event_type: 'allocation',
            event_type_label: 'Mahsup',
            description: `${periodLabel(row.period_year, row.period_month)} ana parasına mahsup`,
            debit: 0,
            collection: 0,
            mahsup: roundMoney(allocation.applied_to_this_due_principal),
            interest_delta: 0,
            balance_delta: -roundMoney(allocation.applied_to_this_due_principal),
            tie: 6
          })
        }
      }
    }
    const audit = (report.audit?.payment_allocations ?? []).find(
      (item) => item.payment_id === payment.payment_id
    )
    const carried = audit?.carried_forward ?? 0
    const carriedNote = carried > EPSILON ? ` Devreden ${formatMoneyTr(carried)} TL.` : ''
    const mahsupNote = parts.length > 0 ? ` Mahsup: ${parts.join(', ')}.` : ''
    drafts.push({
      event_date: payment.payment_date,
      event_type: 'collection',
      event_type_label: 'Gerçek Tahsilat',
      description: `Kasaya giren ${formatMoneyTr(payment.amount)} TL.${mahsupNote}${carriedNote}`,
      debit: 0,
      collection: roundMoney(payment.amount),
      mahsup: 0,
      interest_delta: 0,
      balance_delta: 0,
      tie: 4
    })
  }

  drafts.sort((a, b) => {
    if (a.event_date !== b.event_date) return a.event_date.localeCompare(b.event_date)
    return a.tie - b.tie
  })

  let balance = 0
  const replayed: MemberAccountStatementLine[] = []
  for (const draft of drafts) {
    balance = roundMoney(balance + draft.balance_delta)
    replayed.push({
      event_date: draft.event_date,
      event_type: draft.event_type,
      event_type_label: draft.event_type_label,
      description: draft.description,
      debit: draft.debit,
      collection: draft.collection,
      mahsup: draft.mahsup,
      interest: draft.interest_delta,
      balance
    })
  }

  const from = dateFrom && dateFrom.trim() ? dateFrom.trim() : null
  const opening = from
    ? [...replayed].reverse().find((line) => line.event_date < from)?.balance ?? 0
    : 0
  const visible = replayed.filter((line) => {
    if (from && line.event_date < from) return false
    if (line.event_date > dateTo) return false
    return true
  })

  const lines: MemberAccountStatementLine[] = []
  if (from) {
    lines.push({
      event_date: from,
      event_type: 'opening',
      event_type_label: 'Devir',
      description: 'Dönem başı bakiyesi',
      debit: 0,
      collection: 0,
      mahsup: 0,
      interest: 0,
      balance: opening
    })
  }
  lines.push(...visible)

  const shown = lines.filter((line) => line.event_type !== 'opening')
  return {
    partner_id: report.partner_id,
    partner_no: report.partner_no,
    full_name: report.full_name,
    date_from: from,
    date_to: dateTo,
    lines,
    total_debit: roundMoney(shown.reduce((sum, line) => sum + line.debit, 0)),
    total_collection: roundMoney(
      shown.reduce((sum, line) => sum + (line.event_type === 'collection' ? line.collection : 0), 0)
    ),
    total_interest: roundMoney(
      shown.reduce((sum, line) => sum + (line.interest > 0 ? line.interest : 0), 0)
    ),
    closing_balance: lines.length > 0 ? lines[lines.length - 1].balance : opening
  }
}
