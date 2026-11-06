export const LIBRARY_PREVIEW_DEFAULT_PCT = 42
export const LIBRARY_PREVIEW_MIN_PCT = 30
export const LIBRARY_PREVIEW_MAX_PCT = 70

export function clampPreviewWidthPct(pct: number): number {
  if (!Number.isFinite(pct)) return LIBRARY_PREVIEW_DEFAULT_PCT
  return Math.min(LIBRARY_PREVIEW_MAX_PCT, Math.max(LIBRARY_PREVIEW_MIN_PCT, pct))
}

export function nextPreviewWidthPct(
  startPct: number,
  startClientX: number,
  currentClientX: number,
  workspaceWidth: number
): number {
  if (workspaceWidth <= 0) return clampPreviewWidthPct(startPct)
  const startWidth = (clampPreviewWidthPct(startPct) / 100) * workspaceWidth
  const nextWidth = startWidth + (startClientX - currentClientX)
  return clampPreviewWidthPct((nextWidth / workspaceWidth) * 100)
}
