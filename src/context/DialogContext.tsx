import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import {
  EXIT_DIALOG_COPY,
  inferConfirmLabel,
  inferConfirmVariant,
  type AppDialogRequest,
  type AppDialogVariant
} from '@shared/appDialog'
import AppDialog from '../components/dialog/AppDialog'

type ConfirmInput = {
  title?: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: AppDialogVariant
}

type AlertInput = {
  title?: string
  description: string
  confirmLabel?: string
  variant?: AppDialogVariant
}

interface DialogApi {
  confirm: (input: ConfirmInput) => Promise<boolean>
  alert: (input: AlertInput | string) => Promise<void>
  confirmExit: () => Promise<boolean>
}

type Pending =
  | { kind: 'confirm'; request: AppDialogRequest; resolve: (value: boolean) => void }
  | { kind: 'alert'; request: AppDialogRequest; resolve: (value: boolean) => void }

const DialogContext = createContext<DialogApi | null>(null)

export function DialogProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [pending, setPending] = useState<Pending | null>(null)
  const pendingRef = useRef<Pending | null>(null)

  const closePending = useCallback((value: boolean): void => {
    const current = pendingRef.current
    pendingRef.current = null
    setPending(null)
    current?.resolve(value)
  }, [])

  const confirm = useCallback((input: ConfirmInput): Promise<boolean> => {
    return new Promise((resolve) => {
      pendingRef.current?.resolve(false)
      const request: AppDialogRequest = {
        title: input.title ?? 'Onay',
        description: input.description,
        confirmLabel: input.confirmLabel ?? inferConfirmLabel(input.description),
        cancelLabel: input.cancelLabel ?? 'Vazgeç',
        variant: input.variant ?? inferConfirmVariant(input.description)
      }
      const next: Pending = { kind: 'confirm', request, resolve }
      pendingRef.current = next
      setPending(next)
    })
  }, [])

  const alert = useCallback((input: AlertInput | string): Promise<void> => {
    const parsed = typeof input === 'string' ? { description: input } : input
    return new Promise((resolve) => {
      pendingRef.current?.resolve(false)
      const request: AppDialogRequest = {
        title: parsed.title ?? 'Bilgi',
        description: parsed.description,
        confirmLabel: parsed.confirmLabel ?? 'Tamam',
        variant: parsed.variant ?? 'info'
      }
      const next: Pending = {
        kind: 'alert',
        request,
        resolve: () => resolve()
      }
      pendingRef.current = next
      setPending(next)
    })
  }, [])

  const confirmExit = useCallback((): Promise<boolean> => {
    return confirm({
      title: EXIT_DIALOG_COPY.title,
      description: EXIT_DIALOG_COPY.description,
      confirmLabel: EXIT_DIALOG_COPY.confirmLabel,
      cancelLabel: EXIT_DIALOG_COPY.cancelLabel,
      variant: EXIT_DIALOG_COPY.variant
    })
  }, [confirm])

  const value = useMemo<DialogApi>(
    () => ({ confirm, alert, confirmExit }),
    [confirm, alert, confirmExit]
  )

  return (
    <DialogContext.Provider value={value}>
      {children}
      <AppDialog
        open={pending != null}
        title={pending?.request.title ?? ''}
        description={pending?.request.description ?? ''}
        confirmLabel={pending?.request.confirmLabel ?? 'Tamam'}
        cancelLabel={pending?.kind === 'alert' ? undefined : pending?.request.cancelLabel}
        variant={pending?.request.variant ?? 'confirm'}
        onConfirm={() => closePending(true)}
        onCancel={() => closePending(false)}
      />
    </DialogContext.Provider>
  )
}

export function useDialog(): DialogApi {
  const ctx = useContext(DialogContext)
  if (!ctx) throw new Error('useDialog DialogProvider dışında kullanılamaz')
  return ctx
}
