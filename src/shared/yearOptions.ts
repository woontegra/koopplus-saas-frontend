/** Rapor / form yıl seçenekleri — geçmiş aidat yıllarını da kapsar. */
export function buildYearOptions(
  centerYear = new Date().getFullYear(),
  yearsBack = 5,
  yearsForward = 2
): number[] {
  const years: number[] = []
  for (let y = centerYear - yearsBack; y <= centerYear + yearsForward; y += 1) {
    years.push(y)
  }
  return years
}
