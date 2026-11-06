export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function formatDateTr(value: string | null | undefined): string {
  if (!value) return '—'
  const parts = value.slice(0, 10).split('-')
  if (parts.length !== 3) return value
  return `${parts[2]}.${parts[1]}.${parts[0]}`
}

/** Backend’den gelen bakiyeyi göster — hesaplama yok. */
export function formatMoneyTr(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—'
  return value.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

export function formatShareRatioTr(value: number): string {
  return value.toLocaleString('tr-TR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4
  })
}

export function parseShareRatioInput(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  let normalized = trimmed.replace(/\s/g, '')
  if (normalized.includes(',') && normalized.includes('.')) {
    normalized = normalized.replace(/\./g, '').replace(',', '.')
  } else if (normalized.includes(',')) {
    normalized = normalized.replace(',', '.')
  }
  const parsed = Number(normalized)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return Math.round(parsed * 10000) / 10000
}

export function parseMoneyInput(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return 0
  let normalized = trimmed.replace(/\s/g, '')
  if (normalized.includes(',') && normalized.includes('.')) {
    normalized = normalized.replace(/\./g, '').replace(',', '.')
  } else if (normalized.includes(',')) {
    normalized = normalized.replace(',', '.')
  }
  const parsed = Number(normalized)
  if (!Number.isFinite(parsed)) return null
  return Math.round(parsed * 100) / 100
}

export function formatMoneyInputFromNumber(value: number): string {
  return value.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

// ---- Desktop KoopPlus helpers (copied from renderer/utils/format.ts; todayISO already defined above) ----
export const MONTH_NAMES = [
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

export function formatMonthYear(month: number, year: number): string {
  return `${MONTH_NAMES[month - 1] ?? month} ${year}`
}

export function computeDueDate(year: number, month: number, lastPaymentDay: number): string {
  const day = Math.min(Math.max(lastPaymentDay, 1), 28)
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function formatMoney(amount: number): string {
  const formatted = new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Math.abs(amount))

  const prefix = amount < 0 ? '-' : ''
  return `${prefix}${formatted} ₺`
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return dateStr
  return date.toLocaleDateString('tr-TR')
}

export function formatPeriod(year: number | null, month: number | null): string {
  if (!year || !month) return '-'
  return `${String(month).padStart(2, '0')}/${year}`
}

export function formatPeriodRange(
  startYear: number,
  startMonth: number,
  endYear: number,
  endMonth: number
): string {
  const start = formatPeriod(startYear, startMonth)
  const end = formatPeriod(endYear, endMonth)
  if (start === '-' || end === '-') return '-'
  return start === end ? start : `${start} - ${end}`
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr || dateStr === 'Henüz yedek alınmadı') return dateStr || '—'
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return dateStr
  return date.toLocaleString('tr-TR')
}
