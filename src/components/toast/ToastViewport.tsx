import { IconAlert, IconCheck, IconClose, IconInfo } from '../ui/icons'
import type { ToastItem, ToastKind } from '@shared/toast'
import { toastAriaLive } from '@shared/toast'

function ToastIcon({ kind }: { kind: ToastKind }): JSX.Element {
  if (kind === 'success') return <IconCheck size={16} />
  if (kind === 'warning') return <IconAlert size={16} />
  if (kind === 'info') return <IconInfo size={16} />
  return <IconClose size={16} />
}

export default function ToastViewport({
  toasts,
  onDismiss
}: {
  toasts: ToastItem[]
  onDismiss: (id: string) => void
}): JSX.Element {
  const live = toasts.some((item) => item.kind === 'error') ? 'assertive' : 'polite'
  return (
    <div className="koopplus-toast-viewport" aria-live={live} aria-relevant="additions text" role="status">
      {toasts.map((item) => (
        <div
          key={item.id}
          className={`koopplus-toast koopplus-toast--${item.kind}`}
          role={item.kind === 'error' ? 'alert' : 'status'}
          aria-live={toastAriaLive(item.kind)}
        >
          <span className="koopplus-toast__icon" aria-hidden>
            <ToastIcon kind={item.kind} />
          </span>
          <div className="koopplus-toast__body">
            <strong className="koopplus-toast__title">{item.title}</strong>
            <p className="koopplus-toast__message">{item.message}</p>
          </div>
          <button
            type="button"
            className="koopplus-toast__close"
            aria-label="Kapat"
            onClick={() => onDismiss(item.id)}
          >
            <IconClose size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
