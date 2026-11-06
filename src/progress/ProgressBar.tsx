import { useProgress } from './ProgressContext'

/** Uygulama üstü ortak ilerleme çubuğu — uzun işlemler (Excel aktarım vb.). */
export default function ProgressBar(): JSX.Element | null {
  const { state } = useProgress()
  if (!state.visible) return null

  const total = Math.max(state.total, 1)
  const pct = Math.min(100, Math.round((state.processed / total) * 100))
  const label =
    state.total > 0
      ? `${state.label}: ${state.processed} / ${state.total} satır (%${pct})`
      : state.label

  return (
    <div className="app-progress" role="status" aria-live="polite" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
      <div className="app-progress__text">{label}</div>
      <div className="app-progress__track">
        <div className="app-progress__fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
