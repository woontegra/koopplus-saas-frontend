import { useCallback, useEffect, useMemo, useState } from 'react'
import type {
  AllMembersDebtPdfPreview,
  AllMembersDebtPdfScope,
  AllMembersDebtTablePdfOptions
} from '@shared/allMembersDebtTablePdf'
import { todayISO } from '../../utils/format'
import { useActionToast } from '../../hooks/useActionToast'

interface AllMembersDebtTablePdfModalProps {
  defaultReportDate: string
  onClose: () => void
  onSaved: (message: string) => void
}

const SCOPE_OPTIONS: Array<{ value: AllMembersDebtPdfScope; label: string }> = [
  { value: 'all_active', label: 'Tüm aktif üyeler' },
  { value: 'with_debt', label: 'Sadece borcu olan üyeler' },
  { value: 'overdue', label: 'Sadece vadesi geçmiş borcu olan üyeler' }
]

export default function AllMembersDebtTablePdfModal({
  defaultReportDate,
  onClose,
  onSaved
}: AllMembersDebtTablePdfModalProps): JSX.Element {
  const toast = useActionToast()
  const [scope, setScope] = useState<AllMembersDebtPdfScope>('all_active')
  const [reportDate, setReportDate] = useState(defaultReportDate || todayISO())
  const [includePlanned, setIncludePlanned] = useState(false)
  const [preview, setPreview] = useState<AllMembersDebtPdfPreview | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  const options = useMemo<AllMembersDebtTablePdfOptions>(
    () => ({
      report_date: reportDate,
      scope,
      include_planned_rows: includePlanned
    }),
    [reportDate, scope, includePlanned]
  )

  const loadPreview = useCallback(async (): Promise<void> => {
    if (!reportDate) return
    setPreviewLoading(true)
    setError('')
    const res = await window.api.documents.previewAllMembersDebtTablePdf(options)
    setPreviewLoading(false)
    if (res.success && res.data) {
      setPreview(res.data)
    } else {
      setPreview(null)
      setError(res.error ?? 'Üye sayısı hesaplanamadı.')
    }
  }, [options, reportDate])

  useEffect(() => {
    loadPreview()
  }, [loadPreview])

  const previewMessage = useMemo(() => {
    if (previewLoading) return 'Üye sayısı hesaplanıyor...'
    if (!preview) return ''
    if (preview.matching_count === 0) {
      return 'Seçilen kapsamda PDF’e eklenecek üye bulunamadı.'
    }
    if (scope === 'all_active') {
      return `${preview.matching_count} üye için PDF oluşturulacak.`
    }
    return `${preview.matching_count} üye için PDF oluşturulacak.`
  }, [preview, previewLoading, scope])

  const handleGenerate = async (): Promise<void> => {
    if (!reportDate) {
      setError('Rapor tarihi zorunludur.')
      return
    }
    if (preview?.matching_count === 0) {
      setError('Seçilen kapsamda PDF’e eklenecek üye bulunamadı.')
      return
    }

    setGenerating(true)
    setError('')
    try {
      const res = await window.api.documents.saveAllMembersDebtTablePdf(options)
      if (res.success) {
        onSaved('Toplu PDF dosyası oluşturuldu.')
        onClose()
      } else if (res.error !== 'Kayıt iptal edildi') {
        console.error('[all-members-pdf] Toplu PDF oluşturma hatası:', res.error)
        setError(res.error ?? 'Toplu PDF oluşturulamadı. Lütfen tekrar deneyin.')
        toast.fail('PDF oluşturulamadı', res.error)
      }
    } catch (err) {
      console.error('[all-members-pdf] Toplu PDF oluşturma hatası:', err)
      setError('Toplu PDF oluşturulamadı. Lütfen tekrar deneyin.')
      toast.fail('PDF oluşturulamadı', 'Toplu PDF oluşturulamadı. Lütfen tekrar deneyin.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal modal--narrow">
        <div className="modal-header">
          <h3>Tüm Üyeler PDF Çıktısı</h3>
          <button type="button" className="modal-close" onClick={onClose} disabled={generating}>
            ×
          </button>
        </div>
        <div className="modal-body">
          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-group">
            <span className="form-label">Üye kapsamı</span>
            <div className="all-members-pdf-scope">
              {SCOPE_OPTIONS.map((option) => (
                <label key={option.value} className="all-members-pdf-scope__option">
                  <input
                    type="radio"
                    name="all-members-pdf-scope"
                    value={option.value}
                    checked={scope === option.value}
                    disabled={generating}
                    onChange={() => setScope(option.value)}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="all-members-pdf-date">Rapor tarihi</label>
            <input
              id="all-members-pdf-date"
              type="date"
              className="field-input"
              value={reportDate}
              disabled={generating}
              onChange={(e) => setReportDate(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={includePlanned}
                disabled={generating}
                onChange={(e) => setIncludePlanned(e.target.checked)}
              />
              Planlanan aidatları PDF’e dahil et
            </label>
            <p className="form-hint">
              Planlanan aidatlar aktif borca ve bugünkü genel borç toplamına dahil edilmez.
            </p>
          </div>

          {previewMessage && (
            <p className="all-members-pdf-preview-msg">{previewMessage}</p>
          )}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn" onClick={onClose} disabled={generating}>
            İptal
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={generating || previewLoading || (preview?.matching_count ?? 0) === 0}
            onClick={() => handleGenerate()}
          >
            {generating ? 'PDF hazırlanıyor...' : 'PDF Oluştur'}
          </button>
        </div>
      </div>
    </div>
  )
}
