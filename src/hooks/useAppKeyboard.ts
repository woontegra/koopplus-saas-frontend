import { useEffect } from 'react'
import { isTypingTarget } from '@shared/keyboard'

export interface AppKeyboardHandlers {
  onEscape?: () => void
  onF2?: () => void
}

/**
 * Uygulama geneli kısayollar — input/textarea/select içindeyken native davranışa dokunmaz.
 */
export function useAppKeyboard(handlers: AppKeyboardHandlers, enabled = true): void {
  useEffect(() => {
    if (!enabled) return

    const onKeyDown = (event: KeyboardEvent): void => {
      if (isTypingTarget(event.target)) {
        event.stopPropagation()
        return
      }

      if (event.key === 'Escape' && handlers.onEscape) {
        handlers.onEscape()
        return
      }

      if (event.key === 'F2' && handlers.onF2) {
        event.preventDefault()
        handlers.onF2()
      }
    }

    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [enabled, handlers.onEscape, handlers.onF2])
}

/**
 * Form alanlarında Home/End/Ctrl kısayollarının üst katmanlarca engellenmesini önler.
 */
export function useProtectNativeTyping(): void {
  useEffect(() => {
    const guard = (event: KeyboardEvent): void => {
      if (isTypingTarget(event.target)) {
        event.stopPropagation()
      }
    }

    document.addEventListener('keydown', guard, true)
    document.addEventListener('keyup', guard, true)
    return () => {
      document.removeEventListener('keydown', guard, true)
      document.removeEventListener('keyup', guard, true)
    }
  }, [])
}
