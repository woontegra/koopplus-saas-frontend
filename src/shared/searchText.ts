import type { Partner } from './types'

/** Türkçe karakter toleranslı, büyük/küçük harf duyarsız arama için metin normalize eder */
export function normalizeSearchText(value: string): string {
  return value
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

export function matchesSearchText(haystack: string | null | undefined, query: string): boolean {
  const normalizedQuery = normalizeSearchText(query)
  if (!normalizedQuery) return true
  const normalizedHaystack = normalizeSearchText(haystack ?? '')
  if (!normalizedHaystack) return false
  return normalizedHaystack.includes(normalizedQuery)
}

/** Üye no karşılaştırması: "001" ↔ "0001" ↔ "1" */
export function partnerNoMatches(partnerNo: string | null | undefined, query: string): boolean {
  const trimmedQuery = query.trim()
  if (!trimmedQuery) return true
  if (matchesSearchText(partnerNo, trimmedQuery)) return true

  const queryDigits = trimmedQuery.replace(/\D/g, '')
  if (!queryDigits) return false

  const partnerDigits = String(partnerNo ?? '').replace(/\D/g, '')
  if (!partnerDigits) return false

  const normalizeDigits = (value: string): string => value.replace(/^0+/, '') || '0'
  return (
    normalizeDigits(partnerDigits) === normalizeDigits(queryDigits) ||
    partnerDigits.includes(queryDigits) ||
    queryDigits.includes(partnerDigits)
  )
}

export function partnerSearchableValues(partner: Partner): string[] {
  return [
    partner.partner_no,
    partner.full_name,
    partner.tax_id,
    partner.phone,
    partner.email,
    partner.city,
    partner.district,
    partner.address
  ].filter((value): value is string => typeof value === 'string' && value.length > 0)
}

export function partnerMatchesSearch(partner: Partner, query: string): boolean {
  const normalizedQuery = normalizeSearchText(query)
  if (!normalizedQuery) return true
  if (partnerNoMatches(partner.partner_no, query)) return true
  return partnerSearchableValues(partner)
    .filter((value) => value !== partner.partner_no)
    .some((value) => matchesSearchText(value, normalizedQuery))
}

export function filterPartnersBySearch<T extends Partner>(partners: T[], query?: string | null): T[] {
  const trimmed = query?.trim()
  if (!trimmed) return partners
  return partners.filter((partner) => partnerMatchesSearch(partner, trimmed))
}
