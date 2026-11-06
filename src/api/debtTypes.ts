/** Backend remapReportIds / types — snake_case API alanları (string id). */

export type MemberDebtRowStatus =
  | 'closed_on_time'
  | 'closed_late'
  | 'partial'
  | 'unpaid'
  | 'not_due'
  | 'interest_only'

export type MemberPaymentScope = 'GENERAL' | 'AIDAT_ONLY' | 'EXTRA_ONLY' | 'PERIOD'

export type MemberExtraDebtType = 'NOTARY_NOTICE' | 'SEREFIYE' | 'OTHER'

export type MemberDebtInterestStatus =
  | 'EXEMPT'
  | 'SPECIAL_PERIODS'
  | 'IN_SCOPE'
  | 'OUT_OF_SCOPE'
  | 'NO_ACTIVE_POLICY'

export type ApiPaymentAllocation = {
  payment_id: string
  payment_date: string
  payment_amount: number
  applied_to_this_due_principal: number
  applied_to_this_due_interest: number
  is_on_time?: boolean
  allocation_order?: number
  source: string
  description: string | null
  note: string
}

export type ApiDebtTableRow = {
  ledger_entry_id: string
  period_label: string
  period_month: number
  period_year: number
  monthly_due: number
  interest_rate: number
  due_date: string
  payment_date: string | null
  paid_amount: number
  paid_principal_on_time?: number
  paid_principal_late?: number
  paid_principal_total?: number
  accrued_interest_total?: number
  paid_interest_total?: number
  remaining_interest?: number
  month_collection?: number
  closing_date?: string | null
  row_status?: MemberDebtRowStatus
  row_status_label?: string
  payment_allocations?: ApiPaymentAllocation[]
  remaining_due: number
  running_debt: number
  monthly_interest: number
  delay_month_count: number
  delay_interest: number
  can_edit: boolean
  can_delete: boolean
  is_payment_only?: boolean
  is_interest_only?: boolean
  payment_ids?: string[]
}

export type ApiPaymentHistoryItem = {
  payment_id: string
  payment_date: string
  amount: number
  description?: string | null
  payment_method?: string
  receipt_no?: string | null
  source_label?: string
  is_bank_import?: boolean
  payment_scope?: MemberPaymentScope
  target_period_year?: number | null
  target_period_month?: number | null
}

export type ApiExtraDebtRow = {
  id: string
  partner_id: string
  debt_date: string
  debt_type: MemberExtraDebtType
  debt_type_label: string
  description: string | null
  amount: number
  due_date: string | null
  interest_enabled: number
  interest_amount: number
  paid_amount: number
  remaining_amount: number
  can_edit: boolean
  can_delete: boolean
}

export type ApiDebtTotals = {
  total_due: number
  total_paid: number
  total_allocated_paid: number
  remaining_principal: number
  total_delay_interest: number
  grand_total: number
  extra_debts_total: number
  general_grand_total: number
  carried_forward_credit?: number
}

export type ApiAuditPaymentRow = {
  payment_id: string
  payment_date: string
  payment_amount: number
  applied_to_interest: number
  applied_to_principal: number
  applied_to_extra_debt: number
  carried_forward: number
  note: string
}

export type ApiDebtAudit = {
  total_due_amount: number
  total_payment_amount: number
  payment_to_principal: number
  payment_to_interest: number
  payment_to_extra_debt: number
  remaining_principal: number
  remaining_interest: number
  carried_forward_credit: number
  simple_difference: number
  difference_to_explain: number
  explained_difference: number
  unexplained_difference: number
  is_balanced: boolean
  explanations: string[]
  payment_allocations: ApiAuditPaymentRow[]
}

export type ApiTimelineEntry = {
  period_year: number
  period_month: number
  period_label: string
  monthly_accrued_interest: number
  monthly_paid_interest: number
  closing_interest_balance: number
}

export type ApiMemberDebtTableReport = {
  partner_id: string
  partner_no: string
  full_name: string
  interest_rate: number
  interest_status?: MemberDebtInterestStatus
  interest_status_message?: string | null
  interest_exempt: boolean
  interest_exempt_note: string | null
  has_interest_special_periods: boolean
  interest_coverage_note?: string | null
  as_of_date: string
  rows: ApiDebtTableRow[]
  totals: ApiDebtTotals
  extra_debts: ApiExtraDebtRow[]
  payment_history: ApiPaymentHistoryItem[]
  planned_rows?: ApiDebtTableRow[]
  planned_total?: number
  audit?: ApiDebtAudit
  monthly_interest_timeline?: ApiTimelineEntry[]
}
