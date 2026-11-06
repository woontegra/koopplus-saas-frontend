import { useCallback, useEffect, useMemo, useState } from 'react'
import { formatShareRatioTr } from '@shared/shareRatio'
import type {
  MemberImportBatch,
  MemberImportDuplicateMode,
  MemberImportPreviewRow,
  MemberImportProcessRow,
  MemberImportRowStatus
} from '@shared/types'
import { formatDate } from '../../utils/format'
import { useActionToast } from '../../hooks/useActionToast'

interface MemberImportModalProps {
  onClose: () => void
  onImported: (message: string) => void
}

const STATUS_LABELS: Record<MemberImportRowStatus, string> = {
  NEW: 'Yeni Kayıt',
  EXISTS: 'Zaten Var',
  ERROR: 'Hatalı',
  UPDATE: 'Güncellenecek'
}

const STATUS_BADGE_CLASS: Record<MemberImportRowStatus, string> = {
  NEW: 'member-import-badge member-import-badge--new',
  EXISTS: 'member-import-badge member-import-badge--exists',
  ERROR: 'member-import-badge member-import-badge--error',
  UPDATE: 'member-import-badge member-import-badge--update'
}

const ROW_CLASS: Record<MemberImportRowStatus, string> = {
  NEW: 'member-import-row--new',
  EXISTS: 'member-import-row--exists',
  ERROR: 'member-import-row--error',
  UPDATE: 'member-import-row--update'
}

function canImportRow(row: MemberImportPreviewRow): boolean {
  return row.status === 'NEW' || row.status === 'UPDATE'
}

export default function MemberImportModal({
  onClose,
  onImported
}: MemberImportModalProps): JSX.Element {
  const toast = useActionToast()
  const [fileName, setFileName] = useState('')
  const [headerRow, setHeaderRow] = useState(0)
  const [rows, setRows] = useState<MemberImportPreviewRow[]>([])
  const [duplicateMode, setDuplicateMode] = useState<MemberImportDuplicateMode>('skip')
  const [batches, setBatches] = useState<MemberImportBatch[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const summary = useMemo(
    () => ({
      total: rows.length,
      newCount: rows.filter((row) => row.status === 'NEW').length,
      existingCount: rows.filter((row) => row.status === 'EXISTS').length,
      errorCount: rows.filter((row) => row.status === 'ERROR').length,
      updateCount: rows.filter((row) => row.status === 'UPDATE').length
    }),
    [rows]
  )

  const selectedCount = useMemo(
    () => rows.filter((row) => row.selected && canImportRow(row)).length,
    [rows]
  )

  const loadHistory = useCallback(async () => {
    const res = await window.api.partners.listImportBatches()
    if (res.success && res.data) setBatches(res.data)
  }, [])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const handleSelectFile = async (): Promise<void> => {
    setLoading(true)
    setError('')
    setSuccess('')

    const res = await window.api.partners.importExcelPreview(duplicateMode)
    setLoading(false)

    if (!res.success || !res.data) {
      if (res.error !== 'Kayıt iptal edildi') {
        setError(res.error ?? 'Excel dosyası okunamadı.')
      }
      return
    }

    setFileName(res.data.file_name)
    setHeaderRow(res.data.header_row)
    setRows(res.data.rows)
    setShowHistory(false)
  }

  const handleDuplicateModeChange = async (mode: MemberImportDuplicateMode): Promise<void> => {
    setDuplicateMode(mode)
    if (rows.length === 0) return

    const res = await window.api.partners.rebuildImportPreview(rows, mode)
    if (res.success && res.data) {
      setRows(res.data)
    }
  }

  const toggleRowSelected = (rowKey: string): void => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.row_key !== rowKey || !canImportRow(row)) return row
        return { ...row, selected: !row.selected }
      })
    )
  }

  const handleImport = async (): Promise<void> => {
    const processRows: MemberImportProcessRow[] = rows
      .filter((row) => row.selected && canImportRow(row))
      .map((row) => ({
        row_key: row.row_key,
        row_number: row.row_number,
        status: row.status as 'NEW' | 'UPDATE',
        partner_no: row.partner_no,
        full_name: row.full_name,
        tax_id: row.tax_id,
        birth_date: row.birth_date,
        member_type: row.member_type,
        address: row.address,
        share_count: row.share_ratio ?? row.share_count,
        share_ratio: row.share_ratio ?? row.share_count ?? 1,
        existing_partner_id: row.existing_partner_id
      }))

    if (processRows.length === 0) {
      setError('İçe aktarılacak uygun satır seçilmedi.')
      return
    }

    setProcessing(true)
    setError('')
    setSuccess('')

    const res = await window.api.partners.processImport({
      file_name: fileName,
      duplicate_mode: duplicateMode,
      rows: processRows
    })

    setProcessing(false)

    if (!res.success || !res.data) {
      setError(res.error ?? 'İçe aktarma başarısız.')
      toast.fail('İçe aktarma tamamlanamadı', res.error)
      return
    }

    // Başarılı aktarımda sonuç mesajı üye listesi sayfasında gösterilir; modal kapanır.
    onImported(res.data.message)
    onClose()
  }

  const handleClear = (): void => {
    setFileName('')
    setHeaderRow(0)
    setRows([])
    setError('')
    setSuccess('')
  }

  return (
    <div className="modal-overlay">
      <div className="modal modal--tall member-import-modal">
        <div className="modal-header">
          <h3>Excel&apos;den Üye Aktar</h3>
          <button type="button" className="btn btn-sm" onClick={onClose}>
            Kapat
          </button>
        </div>

        <div className="modal-body member-import-modal__body">
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          <div className="member-import-toolbar">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSelectFile}
              disabled={loading || processing}
            >
              {loading ? 'Dosya okunuyor...' : 'Excel Dosyası Seç'}
            </button>
            {rows.length > 0 && (
              <button type="button" className="btn" onClick={handleClear} disabled={processing}>
                Temizle
              </button>
            )}
            <button
              type="button"
              className="btn"
              onClick={() => setShowHistory((prev) => !prev)}
            >
              Aktarım Geçmişi
            </button>
          </div>

          {fileName && (
            <p className="member-import-file-meta">
              Dosya: <strong>{fileName}</strong>
              {headerRow > 0 && <span> — Başlık satırı: {headerRow}</span>}
            </p>
          )}

          <div className="member-import-mode">
            <span className="member-import-mode__label">Mevcut üyeler:</span>
            <label className="member-import-mode__option">
              <input
                type="radio"
                name="duplicateMode"
                checked={duplicateMode === 'skip'}
                onChange={() => handleDuplicateModeChange('skip')}
              />
              Mevcut üyeleri atla
            </label>
            <label className="member-import-mode__option">
              <input
                type="radio"
                name="duplicateMode"
                checked={duplicateMode === 'update'}
                onChange={() => handleDuplicateModeChange('update')}
              />
              Mevcut üyeleri güncelle
            </label>
          </div>

          {showHistory && (
            <div className="member-import-history table-wrap">
              {batches.length === 0 ? (
                <p className="member-import-empty-text">Henüz aktarım geçmişi yok.</p>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Tarih</th>
                      <th>Dosya</th>
                      <th className="text-right">Satır</th>
                      <th className="text-right">Aktarılan</th>
                      <th className="text-right">Atlanan</th>
                      <th className="text-right">Hatalı</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batches.map((batch) => (
                      <tr key={batch.id}>
                        <td>{formatDate(batch.created_at)}</td>
                        <td>{batch.file_name}</td>
                        <td className="text-right">{batch.total_rows}</td>
                        <td className="text-right">{batch.created_count}</td>
                        <td className="text-right">{batch.skipped_count}</td>
                        <td className="text-right">{batch.error_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {rows.length > 0 && (
            <>
              <div className="member-import-summary-cards">
                <div className="member-import-summary-card">
                  <span className="member-import-summary-card__label">Okunan Satır</span>
                  <strong>{summary.total}</strong>
                </div>
                <div className="member-import-summary-card member-import-summary-card--new">
                  <span className="member-import-summary-card__label">Yeni Kayıt</span>
                  <strong>{summary.newCount}</strong>
                </div>
                <div className="member-import-summary-card member-import-summary-card--exists">
                  <span className="member-import-summary-card__label">Zaten Var</span>
                  <strong>{summary.existingCount}</strong>
                </div>
                <div className="member-import-summary-card member-import-summary-card--error">
                  <span className="member-import-summary-card__label">Hatalı Satır</span>
                  <strong>{summary.errorCount}</strong>
                </div>
                {summary.updateCount > 0 && (
                  <div className="member-import-summary-card member-import-summary-card--update">
                    <span className="member-import-summary-card__label">Güncellenecek</span>
                    <strong>{summary.updateCount}</strong>
                  </div>
                )}
              </div>

              <p className="member-import-summary-text">
                {summary.total} satır okundu. {summary.newCount} yeni kayıt,{' '}
                {summary.existingCount} mevcut kayıt, {summary.errorCount} hatalı satır.
              </p>

              <div className="table-wrap member-import-table-wrap">
                <table className="data-table member-import-table">
                  <thead>
                    <tr>
                      <th className="text-center">Seç</th>
                      <th>Durum</th>
                      <th>Üye No</th>
                      <th>Ad Soyad / Ünvan</th>
                      <th>TC / Vergi No</th>
                      <th>Doğum Tarihi</th>
                      <th>Tip</th>
                      <th>Adres</th>
                      <th className="text-right">Pay Oranı</th>
                      <th>Uyarı</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.row_key} className={ROW_CLASS[row.status]}>
                        <td className="text-center">
                          <input
                            type="checkbox"
                            checked={row.selected}
                            disabled={!canImportRow(row)}
                            onChange={() => toggleRowSelected(row.row_key)}
                          />
                        </td>
                        <td>
                          <span className={STATUS_BADGE_CLASS[row.status]}>
                            {STATUS_LABELS[row.status]}
                          </span>
                        </td>
                        <td className="cell-mono">{row.partner_no || '—'}</td>
                        <td>{row.full_name || '—'}</td>
                        <td className="cell-mono">{row.tax_id || '—'}</td>
                        <td>{row.birth_date ? formatDate(row.birth_date) : '—'}</td>
                        <td>{row.member_type || '—'}</td>
                        <td className="member-import-address-cell">{row.address || '—'}</td>
                        <td className="text-right">
                          {row.share_ratio != null
                            ? formatShareRatioTr(row.share_ratio)
                            : row.share_count != null
                              ? formatShareRatioTr(row.share_count)
                              : '—'}
                        </td>
                        <td className="member-import-warning-cell">{row.warning || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn" onClick={onClose} disabled={processing}>
            İptal
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleImport}
            disabled={processing || selectedCount === 0}
          >
            {processing
              ? 'Aktarılıyor...'
              : `Seçili Üyeleri Aktar (${selectedCount})`}
          </button>
        </div>
      </div>
    </div>
  )
}
