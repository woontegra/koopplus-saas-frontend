/** Kullanım süresi yardımcıları. */
export const USAGE_WARNING_DAYS = 7

/** Kalan gün (yukarı yuvarlanır). Süre yoksa null; geçmişse 0 veya negatif. */
export function daysRemaining(iso: string | null | undefined, now = new Date()): number | null {
  if (!iso) return null
  const end = new Date(iso)
  if (Number.isNaN(end.getTime())) return null
  return Math.ceil((end.getTime() - now.getTime()) / 86_400_000)
}

export function usageLabel(days: number | null): string {
  if (days === null) return 'Sınırsız'
  if (days <= 0) return 'Süre doldu'
  return `${days} gün kaldı`
}
