import { useEffect, useId, useRef, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import {
  appDialogConfirmButtonClass,
  overlayClickShouldConfirm,
  type AppDialogVariant
} from '@shared/appDialog'
import { IconAlert, IconCheck, IconInfo, IconPower } from '../ui/icons'

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export type AppDialogProps = {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  cancelLabel?: string
  variant?: AppDialogVariant
  isLoading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

function DialogIcon({ variant }: { variant: AppDialogVariant }): JSX.Element {
  if (variant === 'danger' || variant === 'warning') return <IconAlert size={22} />
  if (variant === 'success') return <IconCheck size={22} />
  if (variant === 'confirm') return <IconPower size={22} />
  return <IconInfo size={22} />
}

export default function AppDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  variant = 'confirm',
  isLoading = false,
  onConfirm,
  onCancel
}: AppDialogProps): JSX.Element | null {
  const titleId = useId()
  const descriptionId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const focusTimer = window.setTimeout(() => {
      if (cancelLabel) cancelRef.current?.focus()
      else confirmRef.current?.focus()
    }, 0)

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        if (!isLoading) onCancel()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const nodes = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.tabIndex !== -1
      )
      if (nodes.length === 0) return
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      const active = document.activeElement
      if (event.shiftKey && active === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      window.clearTimeout(focusTimer)
      document.removeEventListener('keydown', onKeyDown, true)
      previous?.focus()
    }
  }, [open, isLoading, onCancel, cancelLabel])

  if (!open) return null

  const handleOverlayMouseDown = (): void => {
    if (overlayClickShouldConfirm()) return
    if (!isLoading) onCancel()
  }

  const handleDialogKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
    if (event.key !== 'Enter' || event.defaultPrevented) return
    const target = event.target
    if (target === confirmRef.current || target === cancelRef.current) return
    event.preventDefault()
  }

  return (
    <div className="app-dialog-overlay" onMouseDown={handleOverlayMouseDown}>
      <div
        ref={dialogRef}
        className={`app-dialog app-dialog--${variant}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={handleDialogKeyDown}
      >
        <div className={`app-dialog__icon app-dialog__icon--${variant}`} aria-hidden>
          <DialogIcon variant={variant} />
        </div>
        <h2 id={titleId} className="app-dialog__title">
          {title}
        </h2>
        <p id={descriptionId} className="app-dialog__description">
          {description}
        </p>
        <div className="app-dialog__actions">
          {cancelLabel ? (
            <button
              ref={cancelRef}
              type="button"
              className="btn"
              disabled={isLoading}
              onClick={onCancel}
            >
              {cancelLabel}
            </button>
          ) : null}
          <button
            ref={confirmRef}
            type="button"
            className={appDialogConfirmButtonClass(variant)}
            disabled={isLoading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
