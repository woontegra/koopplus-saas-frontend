import type {
  InterestSpecialPeriodActionType,
  MemberInterestSpecialPeriod,
  MemberInterestSpecialPeriodInput
} from './types'

export interface DateRange {
  start_date: string
  end_date: string
}

export function endOfMonthISO(year: number, month: number): string {
  const lastDay = new Date(year, month, 0).getDate()
  return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
}

export function normalizeActionType(
  value: InterestSpecialPeriodActionType | string | null | undefined
): InterestSpecialPeriodActionType {
  return value === 'CUSTOM_RATE' ? 'CUSTOM_RATE' : 'NO_INTEREST'
}

export function validateSpecialPeriodInput(period: MemberInterestSpecialPeriodInput): string | null {
  const start = period.start_date?.trim()
  const end = period.end_date?.trim()
  if (!start) return 'Başlangıç tarihi boş olamaz.'
  if (!end) return 'Bitiş tarihi boş olamaz.'
  if (end < start) return 'Bitiş tarihi başlangıç tarihinden önce olamaz.'

  const actionType = normalizeActionType(period.action_type)
  if (actionType === 'CUSTOM_RATE') {
    const rate = period.custom_interest_rate
    if (rate == null || !Number.isFinite(rate)) {
      return 'Özel faiz oranı girilmelidir.'
    }
    if (rate < 0) return 'Özel faiz oranı negatif olamaz.'
    if (rate <= 0) return 'Özel faiz oranı girilmelidir.'
  }

  return null
}

export function dateRangesOverlap(a: DateRange, b: DateRange): boolean {
  return a.start_date <= b.end_date && b.start_date <= a.end_date
}

export function validateSpecialPeriodList(periods: MemberInterestSpecialPeriodInput[]): string | null {
  for (const period of periods) {
    const error = validateSpecialPeriodInput(period)
    if (error) return error
  }

  for (let i = 0; i < periods.length; i += 1) {
    for (let j = i + 1; j < periods.length; j += 1) {
      if (dateRangesOverlap(periods[i], periods[j])) {
        return 'Faiz özel dönemleri birbiriyle çakışıyor.'
      }
    }
  }

  return null
}

export function getSpecialPeriodForDate(
  date: string,
  periods: MemberInterestSpecialPeriod[]
): MemberInterestSpecialPeriod | null {
  if (!periods.length) return null
  return (
    periods.find((period) => date >= period.start_date && date <= period.end_date) ?? null
  )
}

export function getSpecialPeriodForMonth(
  year: number,
  month: number,
  periods: MemberInterestSpecialPeriod[]
): MemberInterestSpecialPeriod | null {
  if (!periods.length) return null
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
  const monthEnd = endOfMonthISO(year, month)
  return (
    periods.find(
      (period) => period.start_date <= monthEnd && period.end_date >= monthStart
    ) ?? null
  )
}

export function getEffectiveInterestRate(
  interestExempt: boolean,
  date: string,
  defaultRate: number,
  periods: MemberInterestSpecialPeriod[]
): number {
  if (interestExempt) return 0

  const period = getSpecialPeriodForDate(date, periods)
  if (!period) return defaultRate

  if (period.action_type === 'NO_INTEREST') return 0
  if (period.action_type === 'CUSTOM_RATE') {
    const customRate = period.custom_interest_rate
    if (customRate != null && customRate > 0) return customRate
  }

  return defaultRate
}

export function getEffectiveInterestRateForMonth(
  year: number,
  month: number,
  defaultRate: number,
  periods: MemberInterestSpecialPeriod[]
): number {
  const period = getSpecialPeriodForMonth(year, month, periods)
  if (!period) return defaultRate

  if (period.action_type === 'NO_INTEREST') return 0
  if (period.action_type === 'CUSTOM_RATE') {
    const customRate = period.custom_interest_rate
    if (customRate != null && customRate > 0) return customRate
  }

  return defaultRate
}

export function formatSpecialPeriodSummary(period: MemberInterestSpecialPeriod): string {
  if (period.action_type === 'CUSTOM_RATE' && period.custom_interest_rate != null) {
    return `%${period.custom_interest_rate} özel faiz uygulanır`
  }
  return 'Faiz işletilmez'
}

export function formatSpecialPeriodRange(period: MemberInterestSpecialPeriod): string {
  return `${period.start_date} - ${period.end_date}: ${formatSpecialPeriodSummary(period)}`
}
