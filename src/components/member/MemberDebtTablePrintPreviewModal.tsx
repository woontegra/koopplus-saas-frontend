import { useEffect, useState } from 'react'
import { useActionToast } from '../../hooks/useActionToast'

interface MemberDebtTablePrintPreviewModalProps {
  partnerId: number
  onClose: () => void
  onMessage: (message: string) => void
}

export default function MemberDebtTablePrintPreviewModal({
  partnerId,
  onClose,
  onMessage
}: MemberDebtTablePrintPreviewModalProps): JSX.Element {
  const toast = useActionToast()
  const [html, setHtml] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [printing, setPrinting] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')

    window.api.memberDebtTable.getPrintHtml(partnerId).then((res) => {
      if (!active) return
      setLoading(false)
      if (res.success && res.data) {
        setHtml(res.data.html)
      } else {
        setError(res.error ?? 'Önizleme yüklenemedi')
      }
    })

    return () => {
      active = false
    }
  }, [partnerId])

  const handlePrint = async (): Promise<void> => {
    setPrinting(true)
    try {
      const res = await window.api.documents.printMemberDebtTable(partnerId)
      if (res.success) {
        onMessage('Yazdırma önizlemesi tarayıcıda açıldı.')
        toast.success('Yazdırma başlatıldı', 'Yazdırma önizlemesi tarayıcıda açıldı.')
      } else {
        console.error('[memberDebtPrint] Yazdırma hatası:', res.error)
        toast.fail('Yazdırma başlatılamadı', res.error)
      }
    } catch (err) {
      console.error('[memberDebtPrint] Yazdırma hatası:', err)
      toast.fail('Yazdırma başlatılamadı', err instanceof Error ? err.message : 'Bilinmeyen hata')
    } finally {
      setPrinting(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal modal--wide modal--tall print-preview-modal">
        <div className="modal-header">
          <h3>Borç Tablosu Önizleme</h3>
          <button type="button" className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body print-preview-modal__body">
          {loading && <div className="page-loading">Önizleme hazırlanıyor...</div>}
          {error && <div className="alert alert-error">{error}</div>}
          {html && (
            <iframe
              className="print-preview-frame"
              title="Borç tablosu önizleme"
              srcDoc={html}
            />
          )}
          <div className="settings-actions print-preview-modal__actions">
            <button type="button" className="btn btn-sm" onClick={onClose}>
              Kapat
            </button>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={handlePrint}
              disabled={!html || printing}
            >
              {printing ? 'Yazdırılıyor...' : 'Yazdır'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
