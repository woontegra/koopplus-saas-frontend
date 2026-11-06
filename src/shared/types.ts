export type PaymentMethod = 'Nakit' | 'Banka' | 'POS' | 'Diğer'

export type LedgerEntryType =
  | 'Devreden Bakiye'
  | 'Aidat Tahakkuku'
  | 'Geçmiş Aidat Borcu'
  | 'Aidat Borcu'
  | 'Özel Tahakkuk'
  | 'Ek Aidat'
  | 'Ödeme'
  | 'Gecikme Faizi'
  | 'İhtar Ücreti'
  | 'Masraf'
  | 'Düzeltme Borç'
  | 'Düzeltme Alacak'
  | 'Diğer'

/** Faiz hesaplamasında aidat borcu olarak değerlendirilen işlem türleri */
export const INTEREST_ELIGIBLE_ACCRUAL_TYPES: LedgerEntryType[] = [
  'Aidat Tahakkuku',
  'Geçmiş Aidat Borcu',
  'Aidat Borcu'
]

export type ManualLedgerEntryType =
  | 'Devreden Bakiye'
  | 'Geçmiş Aidat Borcu'
  | 'Aidat Borcu'
  | 'Ek Aidat'
  | 'İhtar Ücreti'
  | 'Masraf'
  | 'Düzeltme Borç'
  | 'Düzeltme Alacak'
  | 'Özel Tahakkuk'
  | 'Diğer'

/** Cari Hareket Ekle formunda gösterilen işlem türleri */
export type ManualFormEntryType =
  | 'Devreden Bakiye'
  | 'Geçmiş Aidat Borcu'
  | 'Aidat Borcu'
  | 'Ek Aidat'
  | 'İhtar Ücreti'
  | 'Masraf'
  | 'Ödeme Al'
  | 'Düzeltme'

export type PaymentAllocationType = 'INTEREST' | 'EXPENSE' | 'PRINCIPAL'

export type LedgerDirectionFilter = 'all' | 'debit' | 'credit'

export type InterestSpecialPeriodActionType = 'NO_INTEREST' | 'CUSTOM_RATE'

export interface MemberInterestSpecialPeriod {
  id: number
  member_id: number
  start_date: string
  end_date: string
  action_type: InterestSpecialPeriodActionType
  custom_interest_rate: number | null
  note: string | null
  created_at: string
  updated_at: string
}

export interface MemberInterestSpecialPeriodInput {
  start_date: string
  end_date: string
  action_type: InterestSpecialPeriodActionType
  custom_interest_rate?: number | null
  note?: string | null
}

/** @deprecated MemberInterestSpecialPeriod kullanın */
export type MemberInterestExemptionPeriod = MemberInterestSpecialPeriod

/** @deprecated MemberInterestSpecialPeriodInput kullanın */
export type MemberInterestExemptionPeriodInput = MemberInterestSpecialPeriodInput

export interface Partner {
  id: number
  partner_no: string
  full_name: string
  tax_id: string | null
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  district: string | null
  join_date: string | null
  birth_date?: string | null
  member_type?: string | null
  share_count?: number | null
  /** Üyenin pay oranı (1 = tam pay, 0.5 = yarım pay) */
  share_ratio?: number
  is_active: number
  opening_balance: number
  notes: string | null
  created_at: string
  updated_at: string
  is_deleted?: number
  deleted_at?: string | null
  deleted_reason?: string | null
  balance?: number
  debt_balance?: number
  /** Borçtan fazla ödeme / devreden alacak */
  carried_forward_credit?: number
  /** 1 = aidat gecikme faizinden muaf */
  interest_exempt?: number
  interest_exempt_note?: string | null
  interest_special_periods?: MemberInterestSpecialPeriod[]
  linked_members?: PartnerLinkedMember[]
}

export type PartnerLinkRelationshipType = 'SPOUSE' | 'HEIR' | 'JOINT_PAYMENT' | 'OTHER'

export interface PartnerLinkedMember {
  id: number
  partner_id: number
  linked_partner_id: number
  linked_partner_no: string
  linked_partner_name: string
  relationship_type: PartnerLinkRelationshipType
  default_split_amount: number | null
  note: string | null
}

export interface PartnerLinkedMemberInput {
  linked_partner_id: number
  relationship_type: PartnerLinkRelationshipType
  default_split_amount?: number | null
  note?: string | null
}

export interface PartnerInput {
  partner_no: string
  full_name: string
  tax_id?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  city?: string | null
  district?: string | null
  join_date?: string | null
  birth_date?: string | null
  member_type?: string | null
  share_count?: number | null
  share_ratio?: number
  is_active?: number
  opening_balance?: number
  notes?: string | null
  /** 1 = aidat gecikme faizinden muaf */
  interest_exempt?: number
  interest_exempt_note?: string | null
  interest_special_periods?: MemberInterestSpecialPeriodInput[]
  linked_members?: PartnerLinkedMemberInput[]
}

export interface PartnerListFilters {
  search?: string
  is_active?: number | null
}

export interface PartnerDeletePreview {
  due_count: number
  payment_count: number
  has_records: boolean
}

export interface PartnerDeleteResult {
  message: string
}

export interface Accrual {
  id: number
  partner_id: number
  period_year: number
  period_month: number
  amount: number
  accrual_date: string
  due_date: string | null
  description: string | null
  created_at: string
}

export interface AccrualSummary {
  active_partner_count: number
  already_accrued_count: number
  to_accrue_count: number
  amount_per_partner: number
  total_amount: number
}

export interface AccrualPreviewRow {
  partner_id: number
  partner_no: string
  full_name: string
  balance: number
  period_status: 'existing' | 'new'
  accrual_amount: number
  action_status: string
}

export interface AccrualBulkPayload {
  period_year: number
  period_month: number
  accrual_date: string
  due_date: string
  amount: number
  description?: string | null
}

export interface AccrualBulkResult {
  created_count: number
  skipped_count: number
  total_amount: number
  skipped_partners: string[]
  message: string
}

export interface AccrualListItem extends Accrual {
  partner_no: string
  full_name: string
  is_active: number
  partner_balance: number
}

export interface AccrualListFilters {
  period_year?: number
  period_month?: number
  search?: string
  status?: 'all' | 'pending' | 'cleared'
}

export interface Payment {
  id: number
  partner_id: number
  payment_date: string
  amount: number
  payment_method: PaymentMethod
  receipt_no: string | null
  description: string | null
  is_cancelled: number
  created_at: string
}

export interface PaymentCreatePayload {
  partner_id: number
  payment_date: string
  amount: number
  payment_method: PaymentMethod
  receipt_no?: string | null
  description?: string | null
  payment_scope?: MemberPaymentScope
  target_period_year?: number | null
  target_period_month?: number | null
}

export interface PaymentCreateResult {
  payment_id: number
  ledger_entry_id: number
  allocated_count: number
  allocated_amount: number
  unallocated_amount: number
  message: string
}

export interface PartnerPaymentBalance {
  total_debt: number
  total_payments: number
  current_balance: number
  overdue_amount: number
  unpaid_accrual_count: number
}

export interface UnpaidDebitRow {
  ledger_entry_id: number
  entry_date: string
  entry_type: LedgerEntryType
  description: string | null
  period_year: number | null
  period_month: number | null
  debit_amount: number
  previously_paid: number
  remaining_debt: number
  due_date: string | null
}

export interface DebtAllocationPreviewRow {
  debt_ledger_entry_id: number
  period_year: number | null
  period_month: number | null
  debt_type: LedgerEntryType
  description: string | null
  interest_allocated: number
  expense_allocated: number
  principal_allocated: number
  remaining_debt: number
  final_status: string
}

export interface AllocationPreviewRow extends UnpaidDebitRow {
  allocation_amount: number
  final_status: string
}

export interface PaymentListItem extends Payment {
  partner_no: string
  full_name: string
}

export interface PaymentListFilters {
  date_from?: string
  date_to?: string
  search?: string
  payment_method?: PaymentMethod | ''
  receipt_no?: string
}

export interface PaymentAllocationDetail {
  id: number
  debit_ledger_entry_id: number
  debt_ledger_entry_id: number | null
  target_ledger_entry_id: number | null
  allocation_type: PaymentAllocationType | null
  allocated_amount: number
  entry_date: string
  entry_type: LedgerEntryType
  description: string | null
  period_year: number | null
  period_month: number | null
  debit_amount: number
  debt_period_year: number | null
  debt_period_month: number | null
  debt_type: LedgerEntryType | null
}

export interface PaymentDetail {
  payment: PaymentListItem
  ledger_entry: LedgerEntry | null
  allocations: PaymentAllocationDetail[]
}

export type InterestPolicyScopeType = 'ALL_ACTIVE' | 'SELECTED_MEMBERS'

export interface InterestPolicy {
  id: number
  start_date: string
  end_date: string
  is_active: number
  monthly_rate: number
  decision_description: string | null
  decision_date: string
  created_at: string
  /** ALL_ACTIVE = tüm aktif üyeler; SELECTED_MEMBERS = seçili üyeler */
  scope_type: InterestPolicyScopeType
  /** SELECTED_MEMBERS için seçili üye id listesi */
  member_ids: number[]
  /** SELECTED_MEMBERS için seçili üye sayısı (liste gösterimi) */
  member_count: number
}

export interface InterestPolicyInput {
  start_date: string
  end_date: string
  is_active: number
  monthly_rate: number
  decision_description?: string | null
  decision_date: string
  scope_type?: InterestPolicyScopeType
  member_ids?: number[]
}

export interface InterestPolicyDeleteResult {
  deleted_run_count: number
  deleted_interest_entry_count: number
  total_interest_removed: number
  message: string
}

/** Faiz kararı satırında salt okunur: bu karara bağlı kayıtlı faiz uygulamaları. */
export interface InterestPolicyAppliedMember {
  partner_id: number
  partner_no: string
  full_name: string
  accrued_interest: number
}

export interface InterestPolicyAppliedMembersResult {
  policy_id: number
  start_date: string
  end_date: string
  monthly_rate: number
  is_active: number
  report_date: string
  members: InterestPolicyAppliedMember[]
  /** Karar şu an pasif. Liste yine de kayıtlı uygulamaları gösterir. */
  inactive: boolean
  /** Defter kaynağında kullanılmaz; geriye dönük alan. */
  special_period_excluded: boolean
  /** Karar–defter bağlantısı güvenilir değilse liste gösterilmez. */
  reliable: boolean
}

export interface YearlyInterestPolicyInput {
  year: number
  monthly_rate: number
  is_active: number
  decision_date: string
  decision_description?: string | null
  scope_type?: InterestPolicyScopeType
  member_ids?: number[]
}

export interface BulkYearPoliciesInput {
  start_year: number
  end_year: number
  monthly_rate?: number
  is_active?: number
}

export interface CreateYearPoliciesInput {
  years: number[]
  monthly_rate?: number
  is_active?: number
  description_prefix?: string | null
}

export interface BulkYearPoliciesResult {
  created_count: number
  skipped_years: number[]
  message: string
}

export type InterestPreviewStatus =
  | 'Faiz hesaplanacak'
  | 'Faiz uygulanacak'
  | 'Tamamen ödenmiş'
  | 'Son ödeme tarihi geçmemiş'
  | 'Son ödeme tarihi tanımlı değil'
  | 'Daha önce işlenmiş'
  | 'Bu ay için faiz kararı tanımlı değil'
  | 'Bu aralıkta faiz yok'
  | 'Vadesi geçmemiş'

export type RangeInterestStatus =
  | 'Faiz uygulanacak'
  | 'Tamamen ödenmiş'
  | 'Bu aralıkta faiz yok'
  | 'Daha önce işlenmiş'
  | 'Vadesi geçmemiş'
  | 'Son ödeme tarihi tanımlı değil'

export interface InterestPreviewRow {
  partner_id: number
  partner_no: string
  full_name: string
  accrual_period_year: number | null
  accrual_period_month: number | null
  due_date: string | null
  principal_amount: number
  paid_amount: number
  remaining_principal: number
  interest_rate: number
  calculated_interest: number
  related_ledger_entry_id: number
  status: InterestPreviewStatus
}

export interface InterestPreviewSummary {
  policy: InterestPolicy | null
  partner_count: number
  accrual_count: number
  total_remaining_principal: number
  monthly_rate: number
  total_interest: number
  already_interest_count: number
  applicable_count: number
  skipped_count: number
}

export interface InterestPreviewResult {
  summary: InterestPreviewSummary
  rows: InterestPreviewRow[]
}

export interface InterestRunPayload {
  period_year: number
  period_month: number
  calculation_date: string
  description?: string | null
}

export interface RangeInterestPayload {
  start_date: string
  end_date: string
  monthly_rate: number
  description?: string | null
  scope_type?: InterestPolicyScopeType
  member_ids?: number[]
}

export interface RangeInterestMonthDetail {
  interest_period_year: number
  interest_period_month: number
  remaining_principal: number
  calculated_interest: number
}

export interface RangeInterestPreviewRow {
  partner_id: number
  partner_no: string
  full_name: string
  accrual_period_year: number | null
  accrual_period_month: number | null
  due_date: string | null
  principal_amount: number
  paid_amount: number
  remaining_principal: number
  interest_month_count: number
  interest_rate: number
  calculated_interest: number
  related_ledger_entry_id: number
  status: RangeInterestStatus
}

export interface RangeInterestPreviewSummary {
  partner_count: number
  debt_count: number
  total_principal: number
  total_interest: number
  grand_total: number
  skipped_count: number
  monthly_rate: number
  start_date: string
  end_date: string
}

export interface RangeInterestPreviewResult {
  summary: RangeInterestPreviewSummary
  rows: RangeInterestPreviewRow[]
}

export interface RangeInterestApplyResult {
  run_id: number
  policy_id: number
  processed_debt_count: number
  processed_month_count: number
  processed_partner_count: number
  total_principal: number
  total_interest: number
  skipped_count: number
  message: string
}

export interface SaveRangeInterestPolicyResult {
  policy: InterestPolicy
  message: string
}

export interface InterestRunResult {
  run_id: number
  processed_partner_count: number
  processed_accrual_count: number
  total_principal: number
  total_interest: number
  skipped_count: number
  message: string
}

export interface InterestRun {
  id: number
  period_year: number
  period_month: number
  calculation_date: string
  policy_id: number
  interest_rate: number
  total_principal: number
  total_interest: number
  affected_partner_count: number
  affected_debt_count: number
  range_start_date: string | null
  range_end_date: string | null
  description: string | null
  created_at: string
}

export interface InterestRunListFilters {
  period_year?: number
  period_month?: number
}

export interface InterestRunDetailItem {
  ledger_entry_id: number
  partner_id: number
  partner_no: string
  full_name: string
  accrual_period_year: number | null
  accrual_period_month: number | null
  related_ledger_entry_id: number
  principal_amount: number
  remaining_principal: number
  interest_rate: number
  interest_amount: number
  description: string | null
}

export interface InterestRunDetail {
  run: InterestRun
  policy: InterestPolicy | null
  items: InterestRunDetailItem[]
}

export interface PartnerAccrualDebtOption {
  ledger_entry_id: number
  entry_type: LedgerEntryType
  accrual_period_year: number | null
  accrual_period_month: number | null
  due_date: string | null
  entry_date: string
  principal_amount: number
  paid_amount: number
  remaining_principal: number
  description: string | null
}

export interface HistoricalInterestPayload {
  partner_id: number
  ledger_entry_id: number
  end_date: string
  description?: string | null
}

export interface HistoricalInterestPreviewRow {
  interest_period_year: number
  interest_period_month: number
  principal_amount: number
  paid_until_month: number
  remaining_principal: number
  interest_rate: number
  calculated_interest: number
  status: InterestPreviewStatus
}

export interface HistoricalInterestMissingPolicyRange {
  start_year: number
  start_month: number
  end_year: number
  end_month: number
  label: string
}

export interface CreateMissingHistoricalPoliciesPayload {
  partner_id: number
  ledger_entry_id: number
  end_date: string
  monthly_rate?: number
}

export interface CreateMissingHistoricalPoliciesResult {
  created_count: number
  message: string
}

export interface HistoricalInterestPreviewResult {
  ledger_entry_id: number
  partner_id: number
  partner_no: string
  full_name: string
  accrual_period_year: number | null
  accrual_period_month: number | null
  due_date: string
  end_date: string
  principal_amount: number
  total_debt: number
  policy_warning: string | null
  policy_gap_warning: string | null
  missing_policy_period_label: string | null
  missing_policy_ranges: HistoricalInterestMissingPolicyRange[]
  missing_policy_years: number[]
  help_text: string
  rows: HistoricalInterestPreviewRow[]
  summary: {
    applicable_count: number
    skipped_count: number
    total_months: number
    missing_policy_count: number
    total_interest: number
    avg_remaining_principal: number
  }
}

export interface HistoricalInterestApplyResult {
  run_id: number
  processed_count: number
  total_interest: number
  total_principal: number
  skipped_count: number
  message: string
}

export interface PartnerInterestEntry extends LedgerEntry {
  partner_no?: string
  full_name?: string
  accrual_period_year?: number | null
  accrual_period_month?: number | null
}

export interface InterestLinkAuditItem {
  interest_id: number
  partner_id: number
  partner_no: string
  interest_period_year: number | null
  interest_period_month: number | null
  related_ledger_entry_id: number | null
  linked_parent_period: string | null
  description: string | null
  issue: string
  suggested_parent_id: number | null
  suggested_parent_period: string | null
}

export interface InterestLinkAuditResult {
  partner_id: number | null
  total_interest_count: number
  eligible_debt_count: number
  wrong_link_count: number
  suspicious_cluster: boolean
  cluster_note: string | null
  items: InterestLinkAuditItem[]
  summary: string
}

export interface InterestLinkRepairResult {
  repaired_link_count: number
  repaired_description_count: number
  skipped_count: number
  skipped: Array<{ interest_id: number; reason: string }>
}

export interface PartnerInterestCleanupPayload {
  partner_id: number
  confirm_partner_no: string
  reason: string
  dry_run?: boolean
  reapply?: {
    start_date: string
    end_date: string
    monthly_rate?: number
  }
}

export interface PartnerInterestCleanupResult {
  dry_run: boolean
  deleted_count: number
  blocked_interest_ids: number[]
  audit_before: InterestLinkAuditResult
  audit_after: InterestLinkAuditResult | null
  reapply_message: string | null
  message: string
}

export interface LedgerEntry {
  id: number
  partner_id: number
  entry_date: string
  entry_type: LedgerEntryType
  description: string | null
  debit: number
  credit: number
  period_year: number | null
  period_month: number | null
  due_date: string | null
  interest_rate: number | null
  principal_amount: number | null
  calculation_date: string | null
  source_id: number | null
  source_type: string | null
  related_ledger_entry_id: number | null
  is_deleted?: number
  deleted_at?: string | null
  deleted_reason?: string | null
  is_interest_eligible?: number
  created_at: string
  running_balance?: number
}

export interface LedgerCanEditResult {
  can_edit: boolean
  can_delete: boolean
  is_manual: boolean
  message: string | null
}

export interface ManualLedgerEntryPayload {
  partner_id: number
  entry_date: string
  period_year?: number | null
  period_month?: number | null
  due_date?: string | null
  entry_type: ManualLedgerEntryType
  debit?: number
  credit?: number
  description?: string | null
  related_ledger_entry_id?: number | null
}

export interface ManualLedgerCreateResult {
  entry: LedgerEntry
  message: string
  interest_applied: boolean
}

export interface ManualLedgerDeleteResult {
  deleted_entry_id: number
  deleted_interest_count: number
  message: string
}

export interface OpenDebtSummaryRow {
  debt_ledger_entry_id: number
  partner_id: number
  partner_no: string
  full_name: string
  entry_date: string
  period_year: number | null
  period_month: number | null
  debt_type: LedgerEntryType
  description: string | null
  due_date: string | null
  principal_amount: number
  interest_amount: number
  expense_amount: number
  total_debt: number
  paid_amount: number
  remaining_debt: number
  can_delete: boolean
}

export interface OpenDebtListFilters {
  partner_id?: number
  search?: string
  date_from?: string
  date_to?: string
  entry_type?: LedgerEntryType | ''
  include_closed?: boolean
}

export interface LedgerListFilters {
  search?: string
  date_from?: string
  date_to?: string
  entry_type?: LedgerEntryType | ''
  direction?: LedgerDirectionFilter
  partner_id?: number
}

export interface LedgerListItem {
  id: number
  partner_id: number
  partner_no: string
  full_name: string
  entry_date: string
  entry_type: LedgerEntryType
  period_year: number | null
  period_month: number | null
  description: string | null
  debit: number
  credit: number
  due_date: string | null
  is_interest_eligible: number
  source_type: string | null
  related_ledger_entry_id: number | null
  created_at: string
}

export interface GroupedInterestDisplayRow {
  kind: 'grouped-interest'
  id: string
  partner_id: number
  partner_no: string
  full_name: string
  related_ledger_entry_id: number
  entry_date: string
  period_start_year: number
  period_start_month: number
  period_end_year: number
  period_end_month: number
  description: string
  debit: number
  credit: number
  entry_count: number
  display_type: 'İşlemiş Faiz'
}

export type LedgerDisplayRow =
  | { kind: 'entry'; entry: LedgerListItem | LedgerEntry }
  | GroupedInterestDisplayRow

export interface InterestGroupDetail {
  parent: LedgerEntry | null
  interest_entries: LedgerEntry[]
  partner_id: number
  partner_no: string
  full_name: string
  total_interest: number
}

export interface Settings {
  cooperative_name: string
  cooperative_address: string
  cooperative_phone: string
  cooperative_email: string
  authorized_person: string
  cooperative_city: string
  cooperative_district: string
  cooperative_tax_id: string
  cooperative_description: string
  default_monthly_dues: string
  last_payment_day: string
  default_accrual_description: string
  active_period_month: string
  active_period_year: string
  backup_folder: string
  last_backup_date: string
  last_backup_file: string
  monthly_interest_rate: string
  use_end_of_month_due: string
}

export interface GeneralSettingsPayload {
  cooperative_name: string
  authorized_person?: string
  phone?: string
  email?: string
  address?: string
  city?: string
  district?: string
  tax_id?: string
  description?: string
}

export interface AccrualSettingsPayload {
  default_monthly_dues: string
  last_payment_day: string
  default_accrual_description?: string
  active_period_month: string
  active_period_year: string
}

export interface AppSettingsAll {
  general: {
    cooperative_name: string
    authorized_person: string
    phone: string
    email: string
    address: string
    city: string
    district: string
    tax_id: string
    description: string
  }
  accrual: {
    default_monthly_dues: string
    last_payment_day: string
    default_accrual_description: string
    active_period_month: string
    active_period_year: string
  }
  backup_folder: string
  last_backup_date: string
}

export interface DataInfo {
  database_path: string
  user_data_path: string
  last_backup_date: string
  last_backup_file?: string
}

export interface DemoDataStatus {
  exists: boolean
  partner_count: number
  accrual_count: number
  payment_count: number
  interest_run_count: number
  backup_log_count: number
}

export interface DemoDataResult {
  partner_count: number
  accrual_count: number
  payment_count: number
  interest_run_count: number
  backup_log_count: number
  message: string
}

export interface BackupInfo {
  database_path: string
  database_size: number
  database_size_label: string
  backup_folder: string
  last_backup_date: string
  last_backup_file: string
  user_data_path: string
  partner_count: number
  ledger_entry_count: number
  cooperative_id?: string | null
  cooperative_name?: string
  document_file_count?: number
}

export type BackupLogType = 'BACKUP' | 'RESTORE'

export interface BackupLog {
  id: number
  type: BackupLogType
  file_path: string
  file_size: number
  created_at: string
  note: string | null
}

export type BackupDocumentsArchiveStatus = 'created' | 'empty' | 'failed'

export interface BackupCreateResult {
  file_path: string
  file_size: number
  documents_archive_path?: string | null
  documents_archive_status?: BackupDocumentsArchiveStatus
  documents_archive_error?: string
  documents_file_count?: number
}

export interface BackupValidateResult {
  valid: boolean
  file_path: string
  file_size: number
  error?: string
  selection_token?: string
}

export interface BackupRestoreResult {
  requires_manual_restart: boolean
}

export interface ActivePeriod {
  year: number
  month: number
}

export interface DashboardStats {
  total_partners: number
  active_partners: number
  total_receivable: number
  total_collected_this_month: number
  overdue_count: number
}

export interface DashboardDebtorRow {
  partnerId: number
  partnerNo: string
  name: string
  remainingPrincipal: number
  remainingInterest: number
  totalDebt: number
}

export interface DashboardRecentPaymentRow {
  id: number
  date: string
  partnerNo: string
  partnerName: string
  amount: number
}

export type DashboardPeriodFilter =
  | 'this_month'
  | 'last_month'
  | 'last_3_months'
  | 'last_12_months'
  | 'this_year'

export interface DashboardPeriodSummary {
  enteredDue: number
  collectedPayment: number
  payerCount: number
  newlyDebtorMembers: number
  closedDebtAmount: number
  remainingDebtChange: number
}

export interface DashboardMonthlySummaryRow {
  year: number
  month: number
  label: string
  enteredDue: number
  collectedPayment: number
  periodBalance: number
  dueMemberCount: number
  payerCount: number
  activeMemberCount: number
  hasActivity: boolean
}

export interface DashboardMonthlyHighlight {
  label: string
  value: number
}

export interface DashboardMonthlySummaryStats {
  totalEnteredDue: number
  totalCollectedPayment: number
  highestCollectionMonth: DashboardMonthlyHighlight | null
  highestActivityMonth: DashboardMonthlyHighlight | null
}

export interface DashboardMonthDueMovement {
  partnerNo: string
  partnerName: string
  amount: number
  description: string | null
  periodLabel: string
}

export interface DashboardMonthPaymentMovement {
  partnerNo: string
  partnerName: string
  paymentDate: string
  amount: number
  sourceLabel: string
  description: string | null
}

export interface DashboardMonthDetail {
  year: number
  month: number
  label: string
  dueMovements: DashboardMonthDueMovement[]
  paymentMovements: DashboardMonthPaymentMovement[]
}

export interface DashboardOverdueMemberRow {
  partnerId: number
  partnerNo: string
  name: string
  overdueDueCount: number
  overduePrincipal: number
  overdueInterest: number
  overdueTotal: number
  oldestOverduePeriod: string | null
}

export interface DashboardOverdueSummary {
  memberCount: number
  dueCount: number
  principalTotal: number
  interestTotal: number
  members: DashboardOverdueMemberRow[]
}

export interface DashboardSummary {
  totalMembers: number
  totalShareRatio: number
  totalPrincipal: number
  totalPaid: number
  totalRemainingDebt: number
  activePeriodLabel: string
  periodSummaries: Record<DashboardPeriodFilter, DashboardPeriodSummary>
  topDebtors: DashboardDebtorRow[]
  recentPayments: DashboardRecentPaymentRow[]
  monthlySummary: DashboardMonthlySummaryRow[]
  monthlySummaryStats: DashboardMonthlySummaryStats
  overdue: DashboardOverdueSummary
}

export interface ApiResult<T = void> {
  success: boolean
  data?: T
  error?: string
}

export type ReportType =
  | 'general-balance'
  | 'debtor-partners'
  | 'non-paying'
  | 'accrual'
  | 'payment'
  | 'interest'
  | 'partner-ledger'
  | 'partner-debt-schedule'
  | 'member-statement'

export type BalanceStatusFilter = 'all' | 'debtor' | 'creditor' | 'zero'

export interface GeneralBalanceFilters {
  is_active?: number | null
  balance_status?: BalanceStatusFilter
  search?: string
}

export interface GeneralBalanceRow {
  partner_no: string
  full_name: string
  phone: string | null
  total_debit: number
  total_payment: number
  total_interest: number
  balance: number
  status: string
}

export interface GeneralBalanceSummary {
  total_partners: number
  debtor_count: number
  total_debit: number
  total_collected: number
  total_remaining: number
}

export interface GeneralBalanceReport {
  summary: GeneralBalanceSummary
  rows: GeneralBalanceRow[]
}

export interface DebtorPartnersFilters {
  min_balance?: number
  is_active?: number | null
  search?: string
}

export interface DebtorPartnersRow {
  partner_no: string
  full_name: string
  phone: string | null
  email: string | null
  address: string | null
  balance: number
  oldest_debt_period: string | null
  last_payment_date: string | null
}

export interface DebtorPartnersSummary {
  debtor_count: number
  total_debt: number
}

export interface DebtorPartnersReport {
  summary: DebtorPartnersSummary
  rows: DebtorPartnersRow[]
}

export interface NonPayingFilters {
  period_month: number
  period_year: number
  is_active?: number | null
}

export interface NonPayingRow {
  partner_no: string
  full_name: string
  period: string
  accrual_amount: number
  paid_amount: number
  remaining_amount: number
  due_date: string | null
  delay_status: string
}

export interface NonPayingSummary {
  accrued_partner_count: number
  fully_paid_count: number
  unpaid_or_partial_count: number
  total_remaining: number
}

export interface NonPayingReport {
  summary: NonPayingSummary
  rows: NonPayingRow[]
}

export interface AccrualReportFilters {
  period_month?: number
  period_year?: number
  search?: string
}

export interface AccrualReportRow {
  period: string
  accrual_date: string
  due_date: string | null
  partner_no: string
  full_name: string
  amount: number
  description: string | null
}

export interface AccrualReportSummary {
  accrual_count: number
  total_amount: number
}

export interface AccrualReportResult {
  summary: AccrualReportSummary
  rows: AccrualReportRow[]
}

export interface PaymentReportFilters {
  date_from?: string
  date_to?: string
  payment_method?: PaymentMethod | ''
  search?: string
  receipt_no?: string
}

export interface PaymentReportRow {
  payment_date: string
  partner_no: string
  full_name: string
  payment_method: PaymentMethod
  receipt_no: string | null
  description: string | null
  amount: number
}

export interface PaymentReportSummary {
  total_collected: number
  cash_total: number
  bank_total: number
  pos_total: number
  other_total: number
}

export interface PaymentReportResult {
  summary: PaymentReportSummary
  rows: PaymentReportRow[]
}

export interface InterestReportFilters {
  period_month?: number
  period_year?: number
  date_from?: string
  date_to?: string
  search?: string
}

export interface InterestReportRow {
  period: string
  calculation_date: string | null
  partner_no: string
  full_name: string
  principal_amount: number | null
  interest_rate: number | null
  interest_amount: number
  description: string | null
}

export interface InterestReportSummary {
  partner_count: number
  total_principal: number
  total_interest: number
}

export interface InterestReportResult {
  summary: InterestReportSummary
  rows: InterestReportRow[]
}

export interface InterestReportPdfData {
  cooperative: CooperativeInfo
  filters: {
    period_month: number | null
    period_year: number | null
    date_from: string
    date_to: string
    search: string
  }
  summary: InterestReportSummary
  rows: InterestReportRow[]
  issue_date: string
}

export type PartnerLedgerPeriodPreset =
  | 'all'
  | 'last_12_months'
  | 'this_year'
  | 'last_year'
  | 'custom'

export interface PartnerLedgerFilters {
  partner_id: number
  /** Hızlı dönem seçimi — varsayılan tüm dönemler */
  period_preset?: PartnerLedgerPeriodPreset
  /** YYYY-MM — yalnızca custom */
  start_month?: string | null
  end_month?: string | null
  /** @deprecated period_preset kullanın */
  date_from?: string
  /** Rapor tarihi / dönem sonu (YYYY-MM-DD) */
  date_to?: string
  entry_type?: LedgerEntryType | ''
}

export interface PartnerLedgerRow {
  entry_date: string
  entry_type: LedgerEntryType
  period: string
  description: string | null
  debit: number
  credit: number
  running_balance: number
}

/** Üye Borç Tablosu ile aynı mahsup özeti (cari ekstre Üye Özeti için). */
export interface PartnerLedgerSettlementMonth {
  period_year: number
  period_month: number
  period_label: string
  due_amount: number
  /** Bu döneme mahsup edilen toplam ana para (Üye Borç Tablosu paid_amount ile aynı) */
  paid_amount: number
  paid_principal_on_time?: number
  paid_principal_late?: number
  paid_principal_total?: number
  accrued_interest_total?: number
  paid_interest_total?: number
  remaining_interest?: number
  total_collection_used_for_period?: number
  closing_date?: string | null
  row_status?: MemberDebtRowStatus
  row_status_label?: string
  /** Dönem sonu kalan faiz (takvim ayı bakiyesi) */
  interest_amount: number
  /** Kalan anapara + kaynak bazlı kalan faiz (running_debt) */
  remaining_amount: number
  remaining_principal: number
  /** Bu takvim ayında kasaya giren tahsilat (Ödeme Geçmişi; özet satırda gösterilmez) */
  collection_amount: number
  /** Tahsilat / mahsup tarih etiketi (tek tarih veya "2 ödeme") */
  payment_date: string | null
  payment_description: string | null
  is_payment_row: boolean
  status: 'paid' | 'partial' | 'debtor' | 'planned' | 'payment'
  status_label: string
  payment_allocations?: MemberDebtRowPaymentAllocation[]
  interest_accrual_events?: InterestAccrualEvent[]
  source_interest_accruals?: InterestAccrualEvent[]
  payment_count?: number
  closed_by_later_payments?: boolean
}

export interface PartnerLedgerSettlement {
  as_of_date: string
  total_due: number
  total_paid: number
  remaining_principal: number
  total_delay_interest: number
  /** Ödenen + kalan gecikme faizi toplamı */
  total_accrued_interest: number
  remaining_debt: number
  carried_forward_credit: number
  last_payment_date: string | null
  last_payment_amount: number | null
  /** Vadesi geçmiş kalan ana para */
  overdue_remaining_principal?: number
  /** Vadesi geçmiş kalan faiz */
  overdue_remaining_interest?: number
  /** Bugün ödenmesi gereken (vadesi geçmiş ana para + faiz) */
  amount_due_today?: number
  /** Vadesi gelmeyen aidat kalanı */
  not_yet_due_principal?: number
  /** Tüm dönemler kalan ana para */
  all_periods_remaining_principal?: number
  /** Tüm dönemler genel toplam (vadesi gelmeyen dahil) */
  all_periods_total_debt?: number
  months: PartnerLedgerSettlementMonth[]
  /** Henüz dönemi başlamamış aidatlar (ayrı gösterilir) */
  future_months?: PartnerLedgerSettlementMonth[]
  payments?: Array<{
    payment_date: string
    amount: number
    description: string | null
  }>
}

export interface PartnerLedgerReport {
  partner_no: string
  partner_name: string
  rows: PartnerLedgerRow[]
  /** @deprecated Aylık mahsup özeti — cari ekstre artık current_account kullanır */
  settlement?: PartnerLedgerSettlement | null
  /** Kronolojik cari hareket presentation modeli */
  current_account?: import('./partnerStatementModels').PartnerCurrentAccountStatementModel | null
}

export interface PartnerDebtScheduleFilters {
  partner_id: number
  /** Rapor tarihi (YYYY-MM-DD) — varsayılan bugün */
  report_date?: string
  /** Kapalı borçları da göster — varsayılan false */
  show_closed?: boolean
  /** PDF/yazdırmaya faiz hesap ayrıntısını ekle — varsayılan true */
  include_interest_detail_in_report?: boolean
  /** @deprecated Teknik faiz matrisi aralığı */
  start_year?: number
  start_month?: number
  end_year?: number
  end_month?: number
  /** true ise dönem filtresi uygulanmaz; tüm aktif aidat satırları gelir */
  all_periods?: boolean
  include_calculated_interest_preview?: boolean
  only_recorded_interest?: boolean
  /** Excel üçüncü sayfa için geniş faiz matrisi */
  include_technical_matrix?: boolean
}

export interface PartnerDebtScheduleInterestColumn {
  year: number
  month: number
  key: string
  label: string
}

export interface PartnerDebtScheduleInterestCell {
  amount: number
  is_preview: boolean
}

export interface PartnerDebtScheduleRow {
  ledger_entry_id: number
  entry_type: string
  accrual_year: number | null
  accrual_month: number | null
  year_group: number
  month_label: string
  aidat: number
  interest_cells: Record<string, PartnerDebtScheduleInterestCell>
  payment: number
  remaining: number
  is_paid: boolean
  is_opening_balance: boolean
}

export interface PartnerDebtScheduleYearGroup {
  year: number
  row_start_index: number
  row_count: number
}

export interface PartnerDebtScheduleReport {
  partner_id: number
  partner_no: string
  full_name: string
  filters: PartnerDebtScheduleFilters
  period_label: string
  interest_columns: PartnerDebtScheduleInterestColumn[]
  year_groups: PartnerDebtScheduleYearGroup[]
  rows: PartnerDebtScheduleRow[]
  totals: {
    total_aidat: number
    total_interest: number
    total_payment: number
    total_remaining: number
  }
  generated_at: string
  /** Güncel açık borç presentation modeli */
  open_debt_statement?: import('./partnerStatementModels').PartnerOpenDebtStatementModel | null
}

export interface PartnerDebtSchedulePdfData {
  cooperative: CooperativeInfo
  partner: {
    partner_no: string
    full_name: string
    phone: string | null
    email: string | null
    address: string | null
  }
  report: PartnerDebtScheduleReport
  issue_date: string
}

export interface ReportExportResult {
  file_path: string
}

export interface CooperativeInfo {
  name: string
  address: string
  phone: string
  email: string
  authorized_person: string
}

export interface PaymentReceiptData {
  cooperative: CooperativeInfo
  payment: PaymentListItem
  partner_phone: string | null
  allocations: PaymentAllocationDetail[]
  issue_date: string
}

export interface PartnerLedgerPdfData {
  cooperative: CooperativeInfo
  partner: {
    partner_no: string
    full_name: string
    phone: string | null
    email: string | null
    address: string | null
    share_ratio?: number | null
  }
  filters: {
    date_from: string
    date_to: string
    entry_type: string
    period_label?: string
  }
  rows: PartnerLedgerRow[]
  totals: {
    total_debit: number
    total_credit: number
    current_balance: number
  }
  issue_date: string
  /** Kronolojik cari ekstre — PDF birincil kaynak */
  current_account?: import('./partnerStatementModels').PartnerCurrentAccountStatementModel | null
}

export interface PartnerLedgerSummaryPdfData {
  cooperative: CooperativeInfo
  partner: {
    partner_no: string
    full_name: string
    share_ratio?: number | null
  }
  filters: {
    date_from: string
    date_to: string
    period_label?: string
  }
  cards: {
    total_due_debt: number
    total_accrued_interest: number
    total_payment: number
    remaining_debt: number
    carried_credit: number
    last_payment_date: string | null
    last_payment_amount: number | null
    opening_balance?: number
    period_debt_created?: number
    period_real_collections?: number
    remaining_principal?: number
    remaining_interest?: number
    closing_total_balance?: number
  }
  months: Array<{
    period_label: string
    due_amount: number
    paid_amount: number
    interest_amount: number
    remaining_amount: number
    collection_amount: number
    payment_date: string | null
    status_label: string
  }>
  issue_date: string
  current_account?: import('./partnerStatementModels').PartnerCurrentAccountStatementModel | null
}

export interface DocumentPdfResult {
  file_path: string
  default_file_name: string
}

export type ReportFilters =
  | GeneralBalanceFilters
  | DebtorPartnersFilters
  | NonPayingFilters
  | AccrualReportFilters
  | PaymentReportFilters
  | InterestReportFilters
  | PartnerLedgerFilters
  | PartnerDebtScheduleFilters

export type UserRole = 'ADMIN' | 'STAFF' | 'VIEWER'

export interface AuthUser {
  id: number
  username: string
  full_name: string
  role: UserRole
  has_security_question: boolean
}

export interface User {
  id: number
  username: string
  full_name: string
  role: UserRole
  is_active: number
  last_login_at: string | null
  created_at: string
  updated_at: string
  email?: string | null
  phone?: string | null
}

export interface SecurityQuestionInput {
  security_question: string
  security_question_custom?: string | null
  security_answer: string
}

export interface InitialAdminPayload extends SecurityQuestionInput {
  full_name: string
  username?: string
  email?: string
  phone?: string
  password: string
  password_confirm: string
}

export interface UserCreatePayload extends SecurityQuestionInput {
  full_name: string
  username?: string
  email: string
  phone: string
  role: UserRole
  password: string
  password_confirm: string
  is_active?: number
}

export interface UserUpdatePayload {
  full_name: string
  username?: string
  email?: string
  phone?: string
  role: UserRole
  is_active: number
  password?: string
  password_confirm?: string
}

export interface ChangePasswordPayload {
  password: string
  password_confirm: string
}

export interface ChangeOwnPasswordPayload {
  current_password: string
  password: string
  password_confirm: string
}

export interface ChangeOwnSecurityQuestionPayload extends SecurityQuestionInput {
  current_password: string
}

export interface PasswordResetQuestionResult {
  security_question: string
}

export interface ResetPasswordWithSecurityPayload {
  username: string
  security_answer: string
  password: string
  password_confirm: string
}

export interface OwnSecurityStatus {
  has_security_question: boolean
  security_question: string | null
}

/** Üye Borç Tablosu — sade kullanım sürümü */
export interface MemberPaymentHistoryItem {
  payment_id: number
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

export interface MemberPaymentUpdatePayload {
  payment_date: string
  amount: number
  description?: string | null
}

export type MemberDebtRowStatus =
  | 'closed_on_time'
  | 'closed_late'
  | 'partial'
  | 'unpaid'
  | 'not_due'
  | 'interest_only'

export interface MemberDebtTableRow {
  ledger_entry_id: number
  period_label: string
  period_month: number
  period_year: number
  monthly_due: number
  interest_rate: number
  due_date: string
  /**
   * Bu aidata mahsup edilen ödemelerin tarih etiketi.
   * Tek ödeme: "11.05.2024" — birden fazla: "2 ödeme"
   */
  payment_date: string | null
  /**
   * Bu aidat satırına mahsup edilen toplam ana para (Ana Paraya Toplam Mahsup).
   * Aidat ≈ Ana Paraya Toplam Mahsup + Kalan Aidat tutmalıdır.
   */
  paid_amount: number
  /** Vade tarihine kadar/son ödeme gününe kadar ana paraya mahsup */
  paid_principal_on_time?: number
  /** Vade sonrası ana paraya mahsup */
  paid_principal_late?: number
  /** paid_amount ile aynı — ana paraya toplam mahsup */
  paid_principal_total?: number
  /**
   * Bu takvim ayında işleyen faiz (accrual_period = satır ayı).
   * Kaynak aidat ayına değil, faizin gerçekten doğduğu aya yazılır.
   */
  accrued_interest_total?: number
  /** Bu takvim ayında gerçek ödemelerden faize ayrılan tutar */
  paid_interest_total?: number
  /** Bu takvim ayı sonunda kalan faiz bakiyesi (önceki kalan + işleyen − ödenen) */
  remaining_interest?: number
  /** Bu dönem borcunu kapatmak için kullanılan toplam tahsilat (anapara + kaynak aidata faiz mahsup) */
  total_collection_used_for_period?: number
  /** Borç tamamen kapandıysa son mahsup tarihi */
  closing_date?: string | null
  row_status?: MemberDebtRowStatus
  row_status_label?: string
  /**
   * Bu dönemin aidat anaparasına FIFO ile mahsup edilen tutar
   * (genelde paid_amount ile aynı).
   */
  allocated_principal?: number
  /** Bu takvim ayında kasaya giren gerçek tahsilat (gösterim / cari ekstre) */
  month_collection?: number
  /** Bu aidata mahsup edilen ödemelerin dökümü (ana para) */
  payment_allocations?: MemberDebtRowPaymentAllocation[]
  /** Bu takvim ayında oluşan faiz tahakkukları (kaynak aidatlar ayrı) */
  interest_accrual_events?: InterestAccrualEvent[]
  /** Bu aidattan doğup başka takvim aylarında tahakkuk eden faizler (bilgi notu) */
  source_interest_accruals?: InterestAccrualEvent[]
  /** Kaç ayrı ödeme bu aidata mahsup edildi */
  payment_count?: number
  /** Kalan kısım sonraki tarihli ödemelerle kapanmışsa true */
  closed_by_later_payments?: boolean
  remaining_due: number
  running_debt: number
  monthly_interest: number
  delay_month_count: number
  /**
   * Bu aidat satırının kaynak bazlı kalan faizi (rapor tarihi).
   * Takvim ayı “Dönem Sonu Kalan Faiz” alanından farklıdır.
   */
  delay_interest: number
  can_edit: boolean
  can_delete: boolean
  is_payment_only?: boolean
  /**
   * Aidat tahakkuku olmayan, yalnızca faiz hareketi olan takvim ayı satırı.
   * Sahte aidat değildir; monthly_due = 0 ve ana para kolonları boş gösterilir.
   */
  is_interest_only?: boolean
  /** is_payment_only satırlarda silinecek ödeme id'leri */
  payment_ids?: number[]
}

/** Faizin kaynak aidatı ile işlediği takvim ayını ayıran tahakkuk olayı. */
export interface InterestAccrualEvent {
  source_due_id: number
  source_due_period_month: number
  source_due_period_year: number
  accrual_period_month: number
  accrual_period_year: number
  interest_start_date: string
  base_remaining_principal: number
  monthly_rate: number
  month_index: number
  accrued_interest_amount: number
  paid_interest_amount: number
  remaining_interest_amount: number
  payment_ids: number[]
}

/** Takvim ayı bazlı faiz zaman çizelgesi satırı. */
export interface MonthlyInterestTimelineEntry {
  period_year: number
  period_month: number
  period_label: string
  monthly_accrued_interest: number
  monthly_paid_interest: number
  closing_interest_balance: number
  accrual_events: InterestAccrualEvent[]
  /** Bu ayda aidat satırı var mı (rapor birleştirme sonrası doldurulabilir) */
  has_due?: boolean
  has_interest_activity?: boolean
  has_payment_activity?: boolean
}

/** Bir aidat satırına düşen tek bir ödeme parçası (mahsup dökümü). */
export interface MemberDebtRowPaymentAllocation {
  payment_id: number
  payment_date: string
  /** Ödemenin tamamı (kasaya giren) */
  payment_amount: number
  applied_to_this_due_principal: number
  applied_to_this_due_interest: number
  /** Ana para mahsupu vade içinde mi */
  is_on_time?: boolean
  allocation_order?: number
  source: string
  description: string | null
  note: string
}

export interface MemberDebtTableTotals {
  total_due: number
  /** Gerçek ödeme toplamı (payments tablosu / Ödeme Geçmişi) */
  total_paid: number
  /** Aidat anaparalarına FIFO ile mahsup edilen toplam */
  total_allocated_paid: number
  remaining_principal: number
  total_delay_interest: number
  /** Kalan aidat borcu (ana borç + gecikme faizi) */
  grand_total: number
  /** Kalan ek borç toplamı */
  extra_debts_total: number
  /** Aidat + ek borç genel toplamı */
  general_grand_total: number
  /** Borçtan fazla ödeme / devreden alacak */
  carried_forward_credit?: number
}

/** Hesap dökümünde tek bir ödemenin nereye dağıldığı (sadece açıklama amaçlı). */
export interface MemberDebtAuditPaymentRow {
  payment_id: number
  payment_date: string
  payment_amount: number
  applied_to_interest: number
  applied_to_principal: number
  applied_to_extra_debt: number
  carried_forward: number
  note: string
}

/**
 * Hesap denetimi: "Toplam Aidat - Toplam Ödeme" ile "Kalan Aidat" arasındaki farkın
 * hangi kalemlerden geldiğini gösterir. Hesaplamayı DEĞİŞTİRMEZ, sadece açıklar.
 */
export interface MemberDebtAudit {
  total_due_amount: number
  total_payment_amount: number
  payment_to_principal: number
  payment_to_interest: number
  payment_to_extra_debt: number
  remaining_principal: number
  remaining_interest: number
  carried_forward_credit: number
  /** Kullanıcının yaptığı basit hesap: toplam aidat - toplam ödeme */
  simple_difference: number
  /** Kalan ana para ile basit fark arasındaki sapma */
  difference_to_explain: number
  /** Faiz + ek borç + devreden ile açıklanabilen kısım */
  explained_difference: number
  /** Hiçbir kalemle açıklanamayan kısım (0 olmalı) */
  unexplained_difference: number
  is_balanced: boolean
  /** Kullanıcı diliyle açıklama cümleleri */
  explanations: string[]
  payment_allocations: MemberDebtAuditPaymentRow[]
}

export interface MemberDebtTableReport {
  partner_id: number
  partner_no: string
  full_name: string
  interest_rate: number
  /**
   * Üst bilgi için durum:
   * EXEMPT | SPECIAL_PERIODS | IN_SCOPE | OUT_OF_SCOPE | NO_ACTIVE_POLICY
   */
  interest_status?:
    | 'EXEMPT'
    | 'SPECIAL_PERIODS'
    | 'IN_SCOPE'
    | 'OUT_OF_SCOPE'
    | 'NO_ACTIVE_POLICY'
  /** Üye kapsam dışı / aktif karar yok vb. sade mesaj */
  interest_status_message?: string | null
  /** Aidat gecikme faizinden muaf */
  interest_exempt: boolean
  interest_exempt_note: string | null
  interest_special_periods: MemberInterestSpecialPeriod[]
  has_interest_special_periods: boolean
  /** Faiz kararı kapsamı dışında kalan gecikme ayları hakkında bilgi notu */
  interest_coverage_note?: string | null
  as_of_date: string
  rows: MemberDebtTableRow[]
  totals: MemberDebtTableTotals
  extra_debts: MemberExtraDebtRow[]
  payment_history: MemberPaymentHistoryItem[]
  /** Gelecek dönem planlanan aidatlar (aktif borça dahil değil) */
  planned_rows?: MemberDebtTableRow[]
  /** Planlanan aidatların toplam tutarı */
  planned_total?: number
  /** Hesap dökümü / denetim bilgisi (sonucu etkilemez) */
  audit?: MemberDebtAudit
  /** Takvim ayı faiz tahakkuk olayları (tek kaynak) */
  interest_accrual_events?: InterestAccrualEvent[]
  /** Takvim ayı faiz zaman çizelgesi */
  monthly_interest_timeline?: MonthlyInterestTimelineEntry[]
}

export type MemberExtraDebtType = 'NOTARY_NOTICE' | 'SEREFIYE' | 'OTHER'
export type MemberPaymentScope = 'GENERAL' | 'AIDAT_ONLY' | 'EXTRA_ONLY' | 'PERIOD'

export interface MemberExtraDebtRow {
  id: number
  partner_id: number
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

export interface MemberExtraDebtPayload {
  partner_id: number
  debt_date: string
  debt_type: MemberExtraDebtType
  amount: number
  due_date?: string | null
  interest_enabled: number
  description?: string | null
}

export interface MemberExtraDebtUpdatePayload {
  debt_date: string
  debt_type: MemberExtraDebtType
  amount: number
  due_date?: string | null
  interest_enabled: number
  description?: string | null
}

export interface MemberPaymentPayload {
  partner_id: number
  payment_date: string
  amount: number
  payment_scope?: MemberPaymentScope
  /** PERIOD kapsamı: mahsup yalnız bu aidat yılı/ayına yazılır */
  target_period_year?: number | null
  target_period_month?: number | null
  payment_method?: 'Nakit' | 'Banka' | 'POS' | 'Diğer'
  receipt_no?: string | null
  description?: string | null
  /** true ise kasa kaydı oluşturma (banka dağıtımında tek kasa satırı için) */
  skip_cash?: boolean
  bank_transaction_id?: number | null
  split_group_id?: string | null
}

export type BankMatchStatus =
  | 'MATCHED'
  | 'MANUAL_MATCHED'
  | 'REMEMBERED_MATCH'
  | 'NEEDS_REVIEW'
  | 'UNMATCHED'
  | 'ALREADY_IMPORTED'
  | 'SKIPPED'
  | 'PROCESSED'
  | 'SPLIT_PROCESSED'

export interface BankSplitAllocationLine {
  partner_id: number
  amount: number
  description?: string | null
}

export interface BankSplitProcessPayload {
  file_name: string
  transaction_date: string
  voucher_no: string | null
  description: string
  amount: number
  balance: number | null
  transaction_hash: string
  allocations: BankSplitAllocationLine[]
}

export interface BankSplitProcessResult {
  bank_transaction_id: number
  split_group_id: string
  payment_count: number
  total_amount: number
  message: string
}

export interface BankCancelSplitResult {
  message: string
  cancelled_payment_count: number
}

export interface BankImportPreviewRow {
  row_key: string
  transaction_date: string
  voucher_no: string | null
  description: string
  amount: number
  balance: number | null
  transaction_hash: string
  matched_partner_id: number | null
  matched_partner_label: string | null
  match_status: BankMatchStatus
  match_confidence: number
  selected: boolean
  remember_match: boolean
  match_rule_id?: number | null
  remembered_pattern?: string | null
}

export interface BankImportPreviewResult {
  file_name: string
  rows: BankImportPreviewRow[]
  unmatched_count: number
  matched_count: number
  excel_row_count: number
  parsed_ok_count: number
  error_or_skipped_count: number
  already_imported_count: number
  selected_count: number
  selected_preview_total: number
  selected_new_payment_total: number
}

export interface BankProcessImportRow {
  row_key: string
  transaction_date: string
  voucher_no: string | null
  description: string
  amount: number
  balance: number | null
  transaction_hash: string
  matched_partner_id: number
  match_status: 'MATCHED' | 'MANUAL_MATCHED' | 'REMEMBERED_MATCH'
  remember_match?: boolean
  pattern_text?: string
}

export interface BankProcessImportPayload {
  file_name: string
  rows: BankProcessImportRow[]
  /** Önizlemede gösterilen seçili toplam; yoksa satır toplamı kullanılır. */
  selected_preview_total?: number
}

export interface BankProcessImportResult {
  processed_count: number
  total_amount: number
  batch_id: number
  message: string
  selected_preview_total: number
  inserted_payments_total: number
  duplicate_skipped_total: number
  explicitly_skipped_total: number
}

export interface BankSaveMatchRuleResult {
  message: string
  pattern_text: string
}

export interface BankSuggestMatchPatternResult {
  pattern_text: string
}

export interface BankMatchRuleItem {
  id: number
  pattern_text: string
  partner_id: number
  partner_label: string
  confidence: number
  last_used_at: string | null
  updated_at: string
  created_at: string
}

export interface BankForgetMatchRuleResult {
  message: string
  deactivated_count: number
}

export interface BankUpdateMatchRuleResult {
  message: string
  pattern_text: string
}

export interface MemberPaymentDeleteOptions {
  forget_match_rule?: boolean
}

export interface BankImportBatch {
  id: number
  file_name: string
  imported_at: string
  total_rows: number
  matched_rows: number
  unmatched_rows: number
  processed_rows: number
  total_processed_amount: number
}

export type MemberImportRowStatus = 'NEW' | 'EXISTS' | 'ERROR' | 'UPDATE'

export type MemberImportDuplicateMode = 'skip' | 'update'

export interface ParsedMemberExcelRow {
  row_number: number
  partner_no: string
  full_name: string
  tax_id: string | null
  birth_date: string | null
  member_type: string | null
  address: string | null
  share_count: number | null
  share_ratio: number | null
}

export interface MemberImportPreviewRow {
  row_key: string
  row_number: number
  status: MemberImportRowStatus
  partner_no: string
  full_name: string
  tax_id: string | null
  birth_date: string | null
  member_type: string | null
  address: string | null
  share_count: number | null
  share_ratio: number | null
  warning: string | null
  selected: boolean
  existing_partner_id: number | null
}

export interface MemberImportPreviewResult {
  file_name: string
  header_row: number
  rows: MemberImportPreviewRow[]
  total_rows: number
  new_count: number
  existing_count: number
  error_count: number
  update_count: number
}

export interface MemberImportProcessRow {
  row_key: string
  row_number: number
  status: 'NEW' | 'UPDATE'
  partner_no: string
  full_name: string
  tax_id: string | null
  birth_date: string | null
  member_type: string | null
  address: string | null
  share_count: number | null
  share_ratio: number | null
  existing_partner_id?: number | null
}

export interface MemberImportProcessPayload {
  file_name: string
  duplicate_mode: MemberImportDuplicateMode
  rows: MemberImportProcessRow[]
}

export interface MemberImportProcessResult {
  created_count: number
  updated_count: number
  skipped_count: number
  error_count: number
  batch_id: number
  message: string
}

export interface MemberImportBatch {
  id: number
  file_name: string
  total_rows: number
  created_count: number
  skipped_count: number
  error_count: number
  imported_by: number | null
  created_at: string
}

export type CashEntryType = 'INCOME' | 'EXPENSE'
export type CashSourceType = 'MANUAL' | 'MEMBER_PAYMENT' | 'SYSTEM' | 'CARRY_FORWARD'

export interface CashEntry {
  id: number
  entry_date: string
  entry_type: CashEntryType
  transaction_type: string
  category: string
  description: string | null
  amount: number
  signed_amount: number
  source_type: CashSourceType
  source_id: number | null
  is_locked: number
  running_balance: number
  source_label: string
  can_edit: boolean
  can_delete: boolean
}

export interface CashEntryPayload {
  entry_date: string
  entry_type: CashEntryType
  category: string
  category_custom?: string | null
  amount: number
  description?: string | null
}

export interface CashEntryUpdatePayload extends CashEntryPayload {}

export interface CashEntryFilters {
  date_from?: string
  date_to?: string
  period_year?: number
  period_month?: number
  entry_type?: CashEntryType | ''
  category?: string
}

export interface CashPeriodSummary {
  period_year: number
  period_month: number
  period_label: string
  opening_balance: number
  period_income: number
  period_expense: number
  period_end_balance: number
  is_closed: boolean
}

export interface CashClosePeriodResult {
  status: 'success' | 'already_closed'
  message: string
  closing_balance: number
  from_period_label: string
  to_period_label: string
  carry_forward_entry_id?: number
}

export interface CashPeriodClosedCheck {
  is_closed: boolean
  period_year: number
  period_month: number
  period_label: string
}

export interface CashSummary {
  total_income: number
  total_expense: number
  balance: number
  month_income: number
  month_expense: number
  month_net: number
  period?: CashPeriodSummary
}

export interface CashExportData {
  cooperative: CooperativeInfo
  summary: CashSummary
  entries: CashEntry[]
  issue_date: string
  filters: CashEntryFilters
}

export interface MemberDuePayload {
  partner_id: number
  period_year: number
  period_month: number
  amount: number
  due_date: string
  description?: string | null
}

export interface MemberDueUpdatePayload {
  period_year: number
  period_month: number
  amount: number
  due_date: string
  description?: string | null
}

export interface MemberMultipleDuesPayload {
  partner_id: number
  period_year: number
  period_months: number[]
  amount: number
  description?: string | null
}

export interface MemberMultipleDuesResult {
  created_count: number
  skipped_count: number
  message: string
}

export interface SimpleSettingsPayload {
  cooperative_name: string
  monthly_interest_rate: number
  last_payment_day: number
  use_end_of_month_due: boolean
}

export interface MemberDebtTablePdfData {
  cooperative: CooperativeInfo
  partner: {
    partner_no: string
    full_name: string
  }
  report: MemberDebtTableReport
  issue_date: string
}

/** Önizleme, yazdır, PDF ve Excel için ortak borç tablosu verisi */
export interface MemberDebtTableExportData {
  cooperative: CooperativeInfo
  partner: {
    partner_no: string
    full_name: string
    share_ratio?: number
  }
  report: MemberDebtTableReport
}

export interface AllMembersDebtTablePdfSection {
  partner: {
    id: number
    partner_no: string
    full_name: string
    share_ratio: number
    phone: string | null
    email: string | null
    city: string | null
    district: string | null
  }
  report: MemberDebtTableReport
}

export interface AllMembersDebtTablePdfData {
  cooperative: CooperativeInfo
  report_date: string
  scope: 'all_active' | 'with_debt' | 'overdue'
  include_planned_rows: boolean
  sections: AllMembersDebtTablePdfSection[]
  aggregate: {
    total_active_count: number
    included_count: number
    debt_bearing_count: number
    total_remaining_principal: number
    total_remaining_interest: number
    total_debt: number
  }
}

export type AidatDistributionRoundingMode = 'last_month' | 'first_month' | 'ignore'

export interface AidatDistributionInput {
  year: number
  start_month: number
  month_count: number
  total_amount: number
  last_payment_day: number
  description: string
  rounding_mode: AidatDistributionRoundingMode
}

export interface AidatDistributionMonthPreview {
  year: number
  month: number
  label: string
  memberCount: number
  /** 1 tam pay için aylık tutar (özet); üye bazlı tutarlar farklı olabilir */
  amountPerMember: number
  monthTotal: number
  skippedCount: number
}

export interface AidatDistributionPartnerPreview {
  partner_id: number
  partner_no: string
  full_name: string
  share_ratio: number
  monthly_amount: number
  yearly_amount: number
}

export interface AidatDistributionSkippedPreview {
  partner_id: number
  partner_no: string
  full_name: string
  year: number
  month: number
  label: string
}

export interface AidatDistributionPreview {
  activeMemberCount: number
  totalShareRatio: number
  yearlyPerMember: number
  monthlyPerMember: number
  totalRecords: number
  totalAmount: number
  roundingDifference: number
  skippedTotal: number
  months: AidatDistributionMonthPreview[]
  partners: AidatDistributionPartnerPreview[]
  skipped: AidatDistributionSkippedPreview[]
}

export interface AidatDistributionResult {
  batch_id: number
  created_due_count: number
  skipped_due_count: number
  total_amount: number
  message: string
}

export interface AidatDistributionBatch {
  id: number
  year: number
  start_month: number
  month_count: number
  total_amount: number
  active_member_count: number
  monthly_amount: number
  created_due_count: number
  skipped_due_count: number
  rounding_difference: number
  description: string | null
  created_by: number | null
  created_at: string
}

export type CooperativeStatus = 'ACTIVE' | 'ARCHIVED'

export interface CooperativeRecord {
  id: string
  name: string
  status: CooperativeStatus
  relative_path: string
  created_at: string
  last_opened_at: string | null
  origin: 'legacy' | 'created'
}

export interface CooperativeListResult {
  current_id: string | null
  cooperatives: CooperativeRecord[]
}

export interface CooperativeCreatePayload {
  cooperative_name: string
  authorized_person?: string
  phone?: string
  email?: string
  address?: string
  city?: string
  district?: string
  tax_id?: string
  description?: string
  admin_full_name: string
  admin_email: string
  admin_phone: string
  admin_password: string
  admin_password_confirm: string
  open_after_create?: boolean
}

export interface CooperativeCreateResult {
  cooperative: CooperativeRecord
  opened: boolean
  user?: AuthUser | null
}

export interface CooperativeSwitchResult {
  current: CooperativeRecord
  user: AuthUser | null
}

export interface LibraryFolder {
  id: number
  parent_id: number | null
  name: string
  sort_order: number
  created_at: string
  updated_at: string
}

export interface LibraryFolderNode extends LibraryFolder {
  children: LibraryFolderNode[]
}

export interface LibraryFile {
  id: number
  folder_id: number
  display_name: string
  original_name: string
  storage_name: string
  mime_type: string | null
  extension: string | null
  size_bytes: number
  note: string | null
  sha256: string | null
  created_at: string
  updated_at: string
}

export interface LibraryFolderContents {
  folder: LibraryFolder | null
  breadcrumb: LibraryFolder[]
  folders: LibraryFolder[]
  files: LibraryFile[]
}

export interface LibraryFolderDeletePreview {
  folder_id: number
  name: string
  descendant_folder_count: number
  file_count: number
  can_delete: boolean
}

export interface LibrarySearchFileHit extends LibraryFile {
  breadcrumb: LibraryFolder[]
}

export interface LibrarySearchFolderHit extends LibraryFolder {
  breadcrumb: LibraryFolder[]
}

export interface LibrarySearchResult {
  folders: LibrarySearchFolderHit[]
  files: LibrarySearchFileHit[]
}

export interface LibraryImportDuplicate {
  file: LibraryFile
  existing: LibraryFile[]
}

export interface LibraryImportFailure {
  name: string
  error: string
}

export interface LibraryImportResult {
  imported: LibraryFile[]
  duplicates: LibraryImportDuplicate[]
  failed?: LibraryImportFailure[]
}

export interface LibraryExportResult {
  file_path: string
  file_size: number
}

export type LibraryPreviewKind = 'pdf' | 'image' | 'text' | 'unsupported'

export type LibraryPreviewStatus = 'ok' | 'missing' | 'unreadable' | 'unsupported'

export interface LibraryPreviewResult {
  file: LibraryFile
  kind: LibraryPreviewKind
  status: LibraryPreviewStatus
  mime_type: string
  text?: string
  truncated?: boolean
  data_base64?: string
  error?: string
}

