import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import type { ToastInput, ToastItem, ToastKind } from '@shared/toast'
import { createToastItem, upsertToast } from '@shared/toast'
import ToastViewport from '../components/toast/ToastViewport'

interface ToastApi {
  push: (input: ToastInput) => void
  success: (title: string, message: string, id?: string) => void
  error: (title: string, message: string, id?: string) => void
  warning: (title: string, message: string, id?: string) => void
  info: (title: string, message: string, id?: string) => void
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timersRef = useRef<Map<string, number>>(new Map())

  const dismiss = useCallback((id: string): void => {
    const timer = timersRef.current.get(id)
    if (timer) {
      window.clearTimeout(timer)
      timersRef.current.delete(id)
    }
    setToasts((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const push = useCallback(
    (input: ToastInput): void => {
      const item = createToastItem(input)
      setToasts((prev) => upsertToast(prev, item))
      const previous = timersRef.current.get(item.id)
      if (previous) window.clearTimeout(previous)
      const timer = window.setTimeout(() => dismiss(item.id), item.durationMs)
      timersRef.current.set(item.id, timer)
    },
    [dismiss]
  )

  const typed = useCallback(
    (kind: ToastKind) =>
      (title: string, message: string, id?: string): void => {
        push({ kind, title, message, id })
      },
    [push]
  )

  const value = useMemo<ToastApi>(
    () => ({
      push,
      success: typed('success'),
      error: typed('error'),
      warning: typed('warning'),
      info: typed('info'),
      dismiss
    }),
    [push, typed, dismiss]
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast ToastProvider dışında kullanılamaz')
  return ctx
}
