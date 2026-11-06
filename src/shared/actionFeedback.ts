import { toastContainsSecret } from './licenseFeedback'

const DEFAULT_ERROR = 'İşlem tamamlanamadı.'

export function safeUserMessage(raw?: string | null, fallback = DEFAULT_ERROR): string {
  const text = (raw ?? '').trim()
  if (!text) return fallback
  if (toastContainsSecret(text)) return fallback
  if (/[{[]/.test(text) || /stack|at\s+\S+\s+\(/i.test(text) || /https?:\/\//i.test(text)) {
    return fallback
  }
  if (/\b(SELECT|INSERT|UPDATE|DELETE|SQLITE|sql\s+error)\b/i.test(text)) {
    return fallback
  }
  if (/[A-Za-z]:\\|\.db\b|node_modules|ipcRenderer/i.test(text)) {
    return fallback
  }
  if (text.length > 220) return fallback
  return text
}

export function actionErrorTitle(contextTitle?: string): string {
  return contextTitle?.trim() || DEFAULT_ERROR
}
