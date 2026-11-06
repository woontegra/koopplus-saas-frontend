interface StatusBadgeProps {
  active: boolean
}

export default function StatusBadge({ active }: StatusBadgeProps): JSX.Element {
  return (
    <span className={`status-badge ${active ? 'status-badge--active' : 'status-badge--passive'}`}>
      {active ? 'Aktif' : 'Pasif'}
    </span>
  )
}
