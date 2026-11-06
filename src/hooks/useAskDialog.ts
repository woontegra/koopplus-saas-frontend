import { useDialog } from '../context/DialogContext'
import { inferConfirmLabel, inferConfirmVariant } from '@shared/appDialog'

export function useAskDialog() {
  const dialog = useDialog()
  return {
    confirm: (
      message: string,
      options?: { title?: string; confirmLabel?: string; variant?: 'danger' | 'warning' | 'confirm' }
    ): Promise<boolean> =>
      dialog.confirm({
        title: options?.title ?? 'Onay',
        description: message,
        confirmLabel: options?.confirmLabel ?? inferConfirmLabel(message),
        variant: options?.variant ?? inferConfirmVariant(message)
      }),
    alert: (message: string, title = 'Bilgi'): Promise<void> =>
      dialog.alert({ title, description: message, variant: 'info' })
  }
}
