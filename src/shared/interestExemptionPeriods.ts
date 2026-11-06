/** @deprecated interestSpecialPeriods kullanın */
export {
  endOfMonthISO,
  dateRangesOverlap,
  formatSpecialPeriodRange,
  formatSpecialPeriodSummary,
  getEffectiveInterestRate,
  getEffectiveInterestRateForMonth,
  getSpecialPeriodForDate,
  getSpecialPeriodForMonth,
  normalizeActionType,
  validateSpecialPeriodInput,
  validateSpecialPeriodList
} from './interestSpecialPeriods'

export { validateSpecialPeriodList as validateExemptionPeriodList } from './interestSpecialPeriods'

export function isMonthInExemptionPeriod(
  year: number,
  month: number,
  periods: Array<{ start_date: string; end_date: string; action_type?: string }>
): boolean {
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return periods.some(
    (period) =>
      period.start_date <= monthEnd &&
      period.end_date >= monthStart &&
      (period.action_type ?? 'NO_INTEREST') === 'NO_INTEREST'
  )
}
