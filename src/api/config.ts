/**
 * API kök adresi.
 * Öncelik: VITE_API_URL → VITE_API_BASE_URL → '' (göreli /api; Vite proxy / Vercel rewrite).
 */
export function getApiBaseUrl(): string {
  const raw = String(
    import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || ''
  ).trim()
  return raw.replace(/\/$/, '')
}

export function apiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  const base = getApiBaseUrl()
  return `${base}${normalized}`
}
