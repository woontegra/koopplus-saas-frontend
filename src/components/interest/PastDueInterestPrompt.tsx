interface PastDueInterestPromptProps {
  onCalculate: () => void
  onLater: () => void
}

export default function PastDueInterestPrompt({
  onCalculate,
  onLater
}: PastDueInterestPromptProps): JSX.Element {
  return (
    <div className="modal-overlay">
      <div className="modal modal--narrow" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Geçmiş Faiz Hesaplama</h3>
        </div>
        <div className="modal-body">
          <p>
            Bu geçmiş aidat borcu için bugüne kadar oluşan gecikme faizlerini hesaplamak ister
            misiniz?
          </p>
          <div className="settings-actions">
            <button type="button" className="btn btn-sm" onClick={onLater}>
              Daha Sonra
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={onCalculate}>
              Geçmiş Faizleri Hesapla
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
