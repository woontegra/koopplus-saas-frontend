import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from 'react'

export type ProgressState = {
  visible: boolean
  label: string
  processed: number
  total: number
}

type ProgressContextValue = {
  state: ProgressState
  showProgress: (label: string, processed: number, total: number) => void
  updateProgress: (processed: number, total: number) => void
  hideProgress: () => void
}

const ProgressContext = createContext<ProgressContextValue | null>(null)

const INITIAL: ProgressState = {
  visible: false,
  label: '',
  processed: 0,
  total: 0
}

export function ProgressProvider({ children }: { children: ReactNode }): JSX.Element {
  const [state, setState] = useState<ProgressState>(INITIAL)

  const showProgress = useCallback((label: string, processed: number, total: number) => {
    setState({ visible: true, label, processed, total: Math.max(total, 0) })
  }, [])

  const updateProgress = useCallback((processed: number, total: number) => {
    setState((prev) =>
      prev.visible
        ? { ...prev, processed, total: Math.max(total, prev.total) }
        : prev
    )
  }, [])

  const hideProgress = useCallback(() => {
    setState(INITIAL)
  }, [])

  const value = useMemo(
    () => ({ state, showProgress, updateProgress, hideProgress }),
    [state, showProgress, updateProgress, hideProgress]
  )

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
}

export function useProgress(): ProgressContextValue {
  const ctx = useContext(ProgressContext)
  if (!ctx) {
    throw new Error('useProgress yalnızca ProgressProvider içinde kullanılabilir')
  }
  return ctx
}

/** Provider dışı (window.api) güvenli erişim — yoksa no-op. */
let bridge: ProgressContextValue | null = null

export function bindProgressBridge(value: ProgressContextValue | null): void {
  bridge = value
}

export function getProgressBridge(): ProgressContextValue | null {
  return bridge
}
