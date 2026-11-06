import type { ReactNode } from 'react'

interface PlatformModalProps {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}

export default function PlatformModal({
  title,
  onClose,
  children,
  footer,
  wide = false
}: PlatformModalProps): JSX.Element {
  return (
    <div className="modal-overlay">
      <div className={`modal${wide ? ' modal--wide' : ''}`} role="dialog" aria-modal="true">
        <div className="modal-header">
          <h3>{title}</h3>
          <button type="button" className="btn btn-sm" onClick={onClose}>
            Kapat
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-footer">{footer}</div> : null}
      </div>
    </div>
  )
}
