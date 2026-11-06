interface EmptyStateProps {
  title?: string
  message: string
  compact?: boolean
}

export default function EmptyState({ title, message, compact = false }: EmptyStateProps): JSX.Element {
  return (
    <div className={`empty-state${compact ? ' empty-state--compact' : ''}`}>
      {title && <div className="empty-state__title">{title}</div>}
      <div className="empty-state__message">{message}</div>
    </div>
  )
}
