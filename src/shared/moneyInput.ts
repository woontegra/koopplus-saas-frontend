/** Türkçe para girişi: nokta binlik, virgül ondalık. Hesaplara sayı olarak gider. */

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '')
}

function groupThousands(digits: string): string {
  const normalized = digits.replace(/^0+(?=\d)/, '')
  return normalized.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

function splitMoneyText(raw: string): { negative: boolean; intDigits: string; decDigits: string; hasComma: boolean } | null {
  const text = raw.replace(/₺/g, '').replace(/\s/g, '')
  if (!text) return null
  const negative = text.startsWith('-')
  const body = negative ? text.slice(1) : text
  const comma = body.lastIndexOf(',')
  if (comma >= 0) {
    return {
      negative,
      intDigits: digitsOnly(body.slice(0, comma)),
      decDigits: digitsOnly(body.slice(comma + 1)).slice(0, 2),
      hasComma: true
    }
  }
  return {
    negative,
    intDigits: digitsOnly(body),
    decDigits: '',
    hasComma: false
  }
}

export function parseMoneyInput(raw: string): number | null {
  const parts = splitMoneyText(raw)
  if (!parts) return null
  if (!parts.intDigits && !parts.decDigits) return null
  const value = Number(`${parts.intDigits || '0'}.${parts.decDigits || '0'}`)
  if (!Number.isFinite(value)) return null
  const signed = parts.negative ? -value : value
  return Math.round(signed * 100) / 100
}

/** Yazarken binlik ayırır; virgülden sonraki kuruşu olduğu gibi bırakır. */
export function formatMoneyInputLive(raw: string): string {
  const text = raw.replace(/₺/g, '').replace(/\s/g, '')
  if (!text || text === '-') return text === '-' ? '-' : ''
  const parts = splitMoneyText(raw)
  if (!parts) return ''
  if (!parts.intDigits && !parts.decDigits && !parts.hasComma) return parts.negative ? '-' : ''
  const grouped = groupThousands(parts.intDigits || '0')
  const sign = parts.negative ? '-' : ''
  if (!parts.hasComma) return sign + grouped
  return `${sign}${grouped},${parts.decDigits}`
}

/** Alan terk edilince veya yapıştırınca iki kuruş basamağına tamamlar. */
export function formatMoneyInputFinal(raw: string): string {
  const value = parseMoneyInput(raw)
  if (value == null) return ''
  return formatMoneyInputFromNumber(value)
}

export function formatMoneyInputFromNumber(value: number): string {
  if (!Number.isFinite(value)) return ''
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}
