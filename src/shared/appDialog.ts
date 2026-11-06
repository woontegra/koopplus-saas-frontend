export type AppDialogVariant = 'info' | 'success' | 'warning' | 'danger' | 'confirm'

export type AppDialogRequest = {
  title: string
  description: string
  confirmLabel: string
  cancelLabel?: string
  variant: AppDialogVariant
  dismissible?: boolean
}

export const EXIT_DIALOG_COPY = {
  title: 'Programdan çıkmak istiyor musunuz?',
  description: 'Açık işlemleriniz tamamlandıysa KoopPlus’ı güvenle kapatabilirsiniz.',
  confirmLabel: 'Programdan Çık',
  cancelLabel: 'Vazgeç',
  variant: 'confirm' as const
}

export function shouldBypassCloseConfirm(input: {
  forceQuit: boolean
  sessionEnding: boolean
}): boolean {
  return input.forceQuit || input.sessionEnding
}

export function closeConfirmDispatch(input: {
  bypass: boolean
  confirmPending: boolean
}): { preventDefault: boolean; sendRequest: boolean } {
  if (input.bypass) return { preventDefault: false, sendRequest: false }
  if (input.confirmPending) return { preventDefault: true, sendRequest: false }
  return { preventDefault: true, sendRequest: true }
}

export function overlayClickShouldConfirm(): boolean {
  return false
}

export function inferConfirmVariant(message: string): 'danger' | 'warning' {
  if (/sil|pasif|geri yükle|arşiv|iptal|kaldır/i.test(message)) return 'danger'
  return 'warning'
}

export function inferConfirmLabel(message: string): string {
  if (/geri yükle/i.test(message)) return 'Geri Yükle'
  if (/pasif/i.test(message)) return 'Pasif Yap'
  if (/arşiv/i.test(message)) return 'Arşivle'
  if (/sil/i.test(message)) return 'Sil'
  return 'Devam et'
}

export function appDialogConfirmButtonClass(variant: AppDialogVariant): string {
  if (variant === 'danger') return 'btn btn-danger'
  return 'btn btn-primary'
}
