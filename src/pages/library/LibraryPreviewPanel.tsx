import { useEffect, useMemo, useState } from 'react'
import type { LibraryFile, LibraryPreviewResult } from '@shared/types'
import {
  IconClose,
  IconCollapse,
  IconExcel,
  IconExpand,
  IconExternal,
  IconFileText,
  IconImage,
  IconSave
} from '../../components/ui/icons'
import { formatDateTime, formatFileSize } from '../../utils/format'

const ZOOM_MIN = 50
const ZOOM_MAX = 200
const ZOOM_STEP = 25

interface LibraryPreviewPanelProps {
  file: LibraryFile
  expanded: boolean
  widthPct: number
  resizing: boolean
  onClose: () => void
  onToggleExpand: () => void
  onResizeStart: (clientX: number) => void
  onOpenExternal: (file: LibraryFile) => void
  onExport: (file: LibraryFile) => void
}

function previewIcon(file: LibraryFile): JSX.Element {
  const ext = (file.extension || '').toLowerCase()
  if (['xls', 'xlsx', 'csv', 'ods'].includes(ext)) return <IconExcel size={16} />
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tif', 'tiff'].includes(ext)) {
    return <IconImage size={16} />
  }
  return <IconFileText size={16} />
}

function typeLabel(file: LibraryFile): string {
  return (file.extension || 'dosya').toUpperCase()
}

export default function LibraryPreviewPanel({
  file,
  expanded,
  widthPct,
  resizing,
  onClose,
  onToggleExpand,
  onResizeStart,
  onOpenExternal,
  onExport
}: LibraryPreviewPanelProps): JSX.Element {
  const [preview, setPreview] = useState<LibraryPreviewResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [zoom, setZoom] = useState(100)
  const [imageBroken, setImageBroken] = useState(false)
  const [pdfBroken, setPdfBroken] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    setPreview(null)
    setZoom(100)
    setImageBroken(false)
    setPdfBroken(false)
    void window.api.library.getPreview(file.id).then((res) => {
      if (cancelled) return
      if (!res.success || !res.data) {
        setError(res.error || 'Dosya bulunamadı.')
        setLoading(false)
        return
      }
      setPreview(res.data)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [file.id])

  const blobUrl = useMemo(() => {
    if (!preview?.data_base64 || (preview.kind !== 'pdf' && preview.kind !== 'image')) return ''
    const bytes = Uint8Array.from(atob(preview.data_base64), (char) => char.charCodeAt(0))
    const blob = new Blob([bytes], { type: preview.mime_type })
    return URL.createObjectURL(blob)
  }, [preview])

  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl)
    }
  }, [blobUrl])

  const headerFile = preview?.file ?? file
  const zoomOut = (): void => setZoom((value) => Math.max(ZOOM_MIN, value - ZOOM_STEP))
  const zoomIn = (): void => setZoom((value) => Math.min(ZOOM_MAX, value + ZOOM_STEP))
  const fit = (): void => setZoom(100)

  const showImageToolbar = preview?.kind === 'image' && preview.status === 'ok' && !imageBroken
  const bodyScroll = preview?.kind === 'text' || preview?.kind === 'unsupported' || preview?.status === 'unsupported'
  const panelStyle = expanded ? undefined : { flexBasis: `${widthPct}%`, width: `${widthPct}%` }

  return (
    <aside
      className={`library-preview${expanded ? ' is-expanded' : ''}${resizing ? ' is-resizing' : ''}`}
      style={panelStyle}
      aria-label="Doküman önizleme"
    >
      {!expanded && (
        <div
          className="library-preview__resizer"
          role="separator"
          aria-orientation="vertical"
          aria-label="Önizleme genişliği"
          onPointerDown={(event) => {
            event.preventDefault()
            onResizeStart(event.clientX)
          }}
        />
      )}

      <div className="library-preview__header">
        <div className="library-preview__title">
          {previewIcon(headerFile)}
          <div>
            <strong title={headerFile.display_name}>{headerFile.display_name}</strong>
            <span>
              {typeLabel(headerFile)} • {formatFileSize(headerFile.size_bytes)}
            </span>
          </div>
        </div>
        <div className="library-preview__actions">
          <button
            type="button"
            className="library-preview__icon-btn"
            title="Bilgisayarda Aç"
            onClick={() => onOpenExternal(headerFile)}
          >
            <IconExternal size={15} />
          </button>
          <button
            type="button"
            className="library-preview__icon-btn"
            title="Dışa Aktar"
            onClick={() => onExport(headerFile)}
          >
            <IconSave size={15} />
          </button>
          <button
            type="button"
            className="library-preview__icon-btn"
            title={expanded ? 'Normal görünüme dön' : 'Geniş önizleme'}
            onClick={onToggleExpand}
          >
            {expanded ? <IconCollapse size={15} /> : <IconExpand size={15} />}
          </button>
          <button
            type="button"
            className="library-preview__icon-btn"
            title="Önizlemeyi kapat"
            onClick={onClose}
          >
            <IconClose size={15} />
          </button>
        </div>
      </div>

      {showImageToolbar && (
        <div className="library-preview__toolbar">
          <button type="button" className="btn btn-sm" onClick={zoomOut} disabled={zoom <= ZOOM_MIN}>
            −
          </button>
          <span>{zoom}%</span>
          <button type="button" className="btn btn-sm" onClick={zoomIn} disabled={zoom >= ZOOM_MAX}>
            +
          </button>
          <button type="button" className="btn btn-sm" onClick={fit}>
            Sayfaya Sığdır
          </button>
        </div>
      )}

      <div className={`library-preview__body${bodyScroll ? ' is-scroll' : ''}`}>
        {loading ? (
          <div className="library-preview__state">Önizleme yükleniyor...</div>
        ) : error || preview?.status === 'missing' ? (
          <div className="library-preview__state">
            <strong>Dosya bulunamadı.</strong>
            <p>Kayıt duruyor; fiziksel dosya eksik.</p>
          </div>
        ) : preview?.status === 'unreadable' || (preview?.kind === 'pdf' && pdfBroken) ? (
          <div className="library-preview__state">
            <strong>Bu PDF önizlenemedi.</strong>
            <button type="button" className="btn btn-sm" onClick={() => onOpenExternal(headerFile)}>
              Bilgisayarda Aç
            </button>
          </div>
        ) : preview?.kind === 'unsupported' || preview?.status === 'unsupported' ? (
          <div className="library-preview__state">
            {previewIcon(headerFile)}
            <strong title={headerFile.display_name}>{headerFile.display_name}</strong>
            <p>
              {typeLabel(headerFile)} • {formatFileSize(headerFile.size_bytes)}
              <br />
              {formatDateTime(headerFile.created_at)}
            </p>
            {headerFile.note ? <p>{headerFile.note}</p> : null}
            <p>Bu dosya türü uygulama içinde önizlenemiyor.</p>
            <div className="library-preview__fallback-actions">
              <button type="button" className="btn btn-primary btn-sm" onClick={() => onOpenExternal(headerFile)}>
                Bilgisayarda Aç
              </button>
              <button type="button" className="btn btn-sm" onClick={() => onExport(headerFile)}>
                Dışa Aktar
              </button>
            </div>
          </div>
        ) : preview?.kind === 'text' ? (
          <pre className="library-preview__text">
            {preview.text || ''}
            {preview.truncated ? '\n\n… önizleme kısaltıldı' : ''}
          </pre>
        ) : preview?.kind === 'image' && blobUrl ? (
          imageBroken ? (
            <div className="library-preview__state">Görsel önizlenemedi.</div>
          ) : (
            <div className="library-preview__media">
              <img
                src={blobUrl}
                alt={headerFile.display_name}
                style={{ transform: `scale(${zoom / 100})` }}
                onError={() => setImageBroken(true)}
              />
            </div>
          )
        ) : preview?.kind === 'pdf' && blobUrl ? (
          <iframe
            className="library-preview__frame"
            title={headerFile.display_name}
            src={blobUrl}
            onError={() => setPdfBroken(true)}
          />
        ) : (
          <div className="library-preview__state">Önizleme hazırlanamadı.</div>
        )}
      </div>
    </aside>
  )
}
