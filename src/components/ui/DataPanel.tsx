import type { ReactNode } from 'react'

interface DataPanelProps {
  title: string
  subtitle?: string
  actions?: ReactNode
  children: ReactNode
  compact?: boolean
  noPadding?: boolean
  className?: string
}

export default function DataPanel({
  title,
  subtitle,
  actions,
  children,
  compact = false,
  noPadding = false,
  className = ''
}: DataPanelProps): JSX.Element {
  return (
    <section className={`data-panel ${className}`.trim()}>
      <header className="data-panel__header">
        <div className="data-panel__titles">
          <h2 className="data-panel__title">{title}</h2>
          {subtitle && <span className="data-panel__subtitle">{subtitle}</span>}
        </div>
        {actions && <div className="data-panel__actions">{actions}</div>}
      </header>
      <div
        className={`data-panel__body${compact ? ' data-panel__body--compact' : ''}${noPadding ? ' data-panel__body--flush' : ''}`}
      >
        {children}
      </div>
    </section>
  )
}
