const MAX_DECIMALS = 4

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

  const factor = 10 ** MAX_DECIMALS
  return Math.round(parsed * factor) / factor
}

export function validateShareRatio(value: number): string | null {
  if (!Number.isFinite(value) || value <= 0) {
    return 'Pay oranı sıfırdan büyük olmalıdır.'
  }
  return null
}

export function formatShareRatioTr(value: number): string {
  return value.toLocaleString('tr-TR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: MAX_DECIMALS
  })
}

export function resolveShareRatio(
  shareRatio?: number | null,
  legacyShareCount?: number | null
): number {
  if (shareRatio != null && shareRatio > 0) return shareRatio
  if (legacyShareCount != null && legacyShareCount > 0) return legacyShareCount
  return 1
}

/** Excel hücre değerinden pay oranı parse et */
export function parseShareRatioFromExcel(
  value: string | number | null | undefined,
  display?: string | null
): number | null {
  if (value != null && value !== '') {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      const factor = 10 ** MAX_DECIMALS
      return Math.round(value * factor) / factor
    }
    const fromValue = parseShareRatioInput(String(value))
    if (fromValue != null) return fromValue
  }

  if (display != null && display.trim()) {
    return parseShareRatioInput(display)
  }

  return null
}
