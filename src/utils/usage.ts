/** Kullanım süresi yardımcıları — takvim günü (Europe/Istanbul). */

export const USAGE_WARNING_DAYS = 7

const TR_TZ = 'Europe/Istanbul'

type Ymd = { y: number; m: number; d: number }

function ymdInTimeZone(date: Date, timeZone = TR_TZ): Ymd {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const y = Number(parts.find((p) => p.type === 'year')?.value)
  const m = Number(parts.find((p) => p.type === 'month')?.value)
  const d = Number(parts.find((p) => p.type === 'day')?.value)
  return { y, m, d }
}

function utcNoonFromYmd(ymd: Ymd): number {
  return Date.UTC(ymd.y, ymd.m - 1, ymd.d, 12, 0, 0)
}

/**
 * Kalan gün: bitiş tarihinin TR takvim günü − bugünün TR takvim günü.
 * Saat farkından bağımsızdır (Math.ceil(ms) kullanılmaz).
 */
export function daysRemaining(iso: string | null | undefined, now = new Date()): number | null {
  if (!iso) return null
  const end = new Date(iso)
  if (Number.isNaN(end.getTime())) return null
  try {
    const today = ymdInTimeZone(now)
    const exp = ymdInTimeZone(end)
    return Math.round((utcNoonFromYmd(exp) - utcNoonFromYmd(today)) / 86_400_000)
  } catch {
    return null
  }
}

export function usageLabel(days: number | null): string {
  if (days === null) return 'Sınırsız'
  if (days <= 0) return 'Süre doldu'
  return `${days} gün kaldı`
}

/** Aktif dönem = Türkiye saatiyle bugünün ayı/yılı (ayar kaydından bağımsız). */
export function resolveActivePeriod(now: Date = new Date()): { year: number; month: number } {
  const { y, m } = ymdInTimeZone(now)
  return { year: y, month: m }
}
