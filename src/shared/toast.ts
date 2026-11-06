export type ToastKind = 'success' | 'error' | 'warning' | 'info'

export type ToastInput = {
  kind: ToastKind
  title: string
  message: string
  id?: string
}

export type ToastItem = {
  id: string
  kind: ToastKind
  title: string
  message: string
  createdAt: number
  durationMs: number
}

export function toastDurationMs(kind: ToastKind): number {
  if (kind === 'error') return 7000
  if (kind === 'warning') return 5500
  return 4500
}

export function toastAriaLive(kind: ToastKind): 'polite' | 'assertive' {
  return kind === 'error' ? 'assertive' : 'polite'
}

export function toastId(input: ToastInput): string {
  return input.id ?? `${input.kind}:${input.title}:${input.message}`
}

export function createToastItem(input: ToastInput, now = Date.now()): ToastItem {
  return {
    id: toastId(input),
    kind: input.kind,
    title: input.title,
    message: input.message,
    createdAt: now,
    durationMs: toastDurationMs(input.kind)
  }
}

/** Aynı id tekrar gelirse yenisiyle değiştirir; en fazla 3 toast tutulur. */
export function upsertToast(existing: ToastItem[], incoming: ToastItem): ToastItem[] {
  const next = existing.filter((item) => item.id !== incoming.id)
  next.push(incoming)
  return next.slice(-3)
}

export function licenseInfoColumnCount(widthPx: number): 1 | 2 {
  return widthPx < 720 ? 1 : 2
}
