type Props = {
  open: boolean
  onContinue: () => void
  onLogout: () => void
}

/** 60 dk idle'dan 1 dk önce gösterilir. */
export default function IdleWarningModal({ open, onContinue, onLogout }: Props): JSX.Element | null {
  if (!open) return null
  return (
    <div className="idle-warn" role="dialog" aria-modal="true" aria-labelledby="idle-warn-title">
      <div className="idle-warn__card">
        <h2 id="idle-warn-title" className="idle-warn__title">
          Oturumunuz 1 dakika içinde kapanacak
        </h2>
        <p className="idle-warn__text">
          Hareketsizlik nedeniyle oturumunuz kapanmak üzere. Çalışmaya devam etmek için «Devam et»
          düğmesine basın.
        </p>
        <div className="idle-warn__actions">
          <button type="button" className="btn btn-primary" onClick={onContinue}>
            Devam et
          </button>
          <button type="button" className="btn" onClick={onLogout}>
            Çıkış yap
          </button>
        </div>
      </div>
    </div>
  )
}
