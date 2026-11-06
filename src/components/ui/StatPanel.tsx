import type { ReactNode } from 'react'

interface StatPanelProps {
  label: string
  value: ReactNode
  hint?: string
  variant?: 'default' | 'info' | 'debit' | 'credit' | 'accent' | 'danger'
  size?: 'default' | 'hero'
  icon?: ReactNode
  onClick?: () => void
}

export default function StatPanel({
  label,
  value,
  hint,
  variant = 'default',
  size = 'default',
  icon,
  onClick
}: StatPanelProps): JSX.Element {
  const className = `stat-panel stat-panel--${variant} stat-panel--${size}${onClick ? ' stat-panel--clickable' : ''}`
  const content = (
    <>
      <div className="stat-panel__head">
        {icon && <span className="stat-panel__icon">{icon}</span>}
        <span className="stat-panel__label">{label}</span>
      </div>
      <div className="stat-panel__value">{value}</div>
      {hint && <div className="stat-panel__hint">{hint}</div>}
    </>
  )

  if (onClick) {
    return (
      <button type="button" className={className} onClick={onClick}>
        {content}
      </button>
    )
  }

  return <div className={className}>{content}</div>
}
