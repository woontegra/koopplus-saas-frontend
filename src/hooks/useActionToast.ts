import { useMemo } from 'react'
import { safeUserMessage } from '@shared/actionFeedback'
import { useToast } from '../context/ToastContext'

export function useActionToast() {
  const toast = useToast()

  return useMemo(
    () => ({
      success: (title: string, message: string, id?: string): void => {
        toast.success(title, message, id)
      },
      fail: (title: string, error?: string | null, id?: string): void => {
        toast.error(title, safeUserMessage(error), id)
      },
      warn: (title: string, message: string, id?: string): void => {
        toast.warning(title, safeUserMessage(message, message), id)
      },
      info: (title: string, message: string, id?: string): void => {
        toast.info(title, message, id)
      }
    }),
    [toast]
  )
}
