import type { ReactNode } from 'react'

interface TableToolbarProps {
  children: ReactNode
  meta?: ReactNode
}

export default function TableToolbar({ children, meta }: TableToolbarProps): JSX.Element {
  return (
    <div className="table-toolbar">
      <div className="table-toolbar__controls">{children}</div>
      {meta && <div className="table-toolbar__meta">{meta}</div>}
    </div>
  )
}
