import { useCallback, useEffect, useMemo, useState } from 'react'
import type {
  BankImportBatch,
  BankImportPreviewRow,
  BankMatchStatus,
  BankProcessImportRow,
  Partner
} from '@shared/types'
import { useAuth } from '../../auth/AuthContext'
import { useActionToast } from '../../hooks/useActionToast'
import DataPanel from '../../components/ui/DataPanel'
import PartnerSearchSelect from '../../components/partners/PartnerSearchSelect'
import BankMatchRulesModal from '../../components/bank/BankMatchRulesModal'
import BankSplitModal from '../../components/bank/BankSplitModal'
import { formatDate, formatMoney } from '../../utils/format'

type PreviewRow = BankImportPreviewRow & {
  pattern_text?: string
  match_rule_saved?: boolean
}

type ChangeRememberPrompt = {
  rowKey: string
  partnerId: number
  patternText: string
  hadRule: boolean
}

const STATUS_LABELS: Record<BankMatchStatus, string> = {
  MATCHED: 'Eşleşti',
  MANUAL_MATCHED: 'Manuel Eşleşti',
  REMEMBERED_MATCH: 'Hatırlanan Eşleşme',
  NEEDS_REVIEW: 'Kontrol Gerekli',
  UNMATCHED: 'Eşleşmedi',
  ALREADY_IMPORTED: 'Daha Önce Aktarılmış',
  SKIPPED: 'İşlenmeyecek',
  PROCESSED: 'İşlendi',
  SPLIT_PROCESSED: 'Dağıtıldı'
}

const STATUS_BADGE_CLASS: Record<BankMatchStatus, string> = {
  MATCHED: 'bank-status-badge bank-status-badge--matched',
  MANUAL_MATCHED: 'bank-status-badge bank-status-badge--manual',
  REMEMBERED_MATCH: 'bank-status-badge bank-status-badge--remembered',
  NEEDS_REVIEW: 'bank-status-badge bank-status-badge--review',
  UNMATCHED: 'bank-status-badge bank-status-badge--unmatched',
  ALREADY_IMPORTED: 'bank-status-badge bank-status-badge--muted',
  SKIPPED: 'bank-status-badge bank-status-badge--muted',
  PROCESSED: 'bank-status-badge bank-status-badge--processed',
  SPLIT_PROCESSED: 'bank-status-badge bank-status-badge--processed'
}

const ROW_CLASS: Record<BankMatchStatus, string> = {
  MATCHED: 'bank-row--matched',
  MANUAL_MATCHED: 'bank-row--manual',
  REMEMBERED_MATCH: 'bank-row--remembered',
  NEEDS_REVIEW: 'bank-row--review',
  UNMATCHED: 'bank-row--unmatched',
  ALREADY_IMPORTED: 'bank-row--muted',
  SKIPPED: 'bank-row--muted',
  PROCESSED: 'bank-row--processed',
  SPLIT_PROCESSED: 'bank-row--processed'
}

function canSelectRow(row: PreviewRow): boolean {
  return (
    (row.match_status === 'MATCHED' ||
      row.match_status === 'REMEMBERED_MATCH' ||
      row.match_status === 'MANUAL_MATCHED') &&
    !!row.matched_partner_id
  )
}

function canManualMatch(row: PreviewRow): boolean {
  return row.match_status === 'UNMATCHED' || row.match_status === 'NEEDS_REVIEW'
}

function canChangeMatch(row: PreviewRow): boolean {
  return (
    row.match_status === 'MATCHED' ||
    row.match_status === 'REMEMBERED_MATCH' ||
    row.match_status === 'MANUAL_MATCHED'
  )
}

function canSplitRow(row: PreviewRow): boolean {
  return (
    row.amount > 0 &&
    row.match_status !== 'ALREADY_IMPORTED' &&
    row.match_status !== 'SKIPPED' &&
    row.match_status !== 'PROCESSED' &&
    row.match_status !== 'SPLIT_PROCESSED'
  )
}

function hasRememberedRule(row: PreviewRow): boolean {
  return (
    row.match_status === 'REMEMBERED_MATCH' ||
    !!row.match_rule_id ||
    !!row.match_rule_saved ||
    !!row.remembered_pattern
  )
}

function partnerOptionLabel(partner: Partner): string {
  return `${partner.partner_no} — ${partner.full_name}`
}

export default function BankTransactionsPage(): JSX.Element {
  const { canWrite } = useAuth()
  const toast = useActionToast()
  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState<PreviewRow[]>([])
  const [partners, setPartners] = useState<Partner[]>([])
  const [batches, setBatches] = useState<BankImportBatch[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [showMatchRules, setShowMatchRules] = useState(false)
  const [splitRow, setSplitRow] = useState<PreviewRow | null>(null)
  const [editingRowKey, setEditingRowKey] = useState<string | null>(null)
  const [changeRememberPrompt, setChangeRememberPrompt] = useState<ChangeRememberPrompt | null>(
    null
  )
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [savingMatchRuleKey, setSavingMatchRuleKey] = useState<string | null>(null)
  const [rowActionKey, setRowActionKey] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const unmatchedCount = useMemo(
    () => rows.filter((row) => row.match_status === 'UNMATCHED').length,
    [rows]
  )

  const selectedProcessCount = useMemo(
    () => rows.filter((row) => row.selected && canSelectRow(row)).length,
    [rows]
  )

  const loadPartners = useCallback(async () => {
    const res = await window.api.partners.list({ is_active: 1 })
    if (res.success && res.data) setPartners(res.data)
  }, [])

  const loadHistory = useCallback(async () => {
    const res = await window.api.bank.listBatches()
    if (res.success && res.data) setBatches(res.data)
  }, [])

  useEffect(() => {
    loadPartners()
    loadHistory()
  }, [loadPartners, loadHistory])

  const applyPartnerChange = (
    rowKey: string,
    partner: Partner,
    patternText: string,
    status: BankMatchStatus,
    rememberMeta?: {
      match_rule_id?: number | null
      remembered_pattern?: string | null
      match_rule_saved?: boolean
    }
  ): void => {
    setRows((prev) =>
      prev.map((item) => {
        if (item.row_key !== rowKey) return item
        return {
          ...item,
          matched_partner_id: partner.id,
          matched_partner_label: partnerOptionLabel(partner),
          match_status: status,
          match_confidence: status === 'REMEMBERED_MATCH' ? 95 : 92,
          selected: true,
          pattern_text: patternText,
          match_rule_id: rememberMeta?.match_rule_id ?? null,
          remembered_pattern: rememberMeta?.remembered_pattern ?? null,
          match_rule_saved: rememberMeta?.match_rule_saved ?? false,
          remember_match: rememberMeta?.match_rule_saved ?? item.remember_match
        }
      })
    )
    setEditingRowKey(null)
  }

  const handleImport = async (): Promise<void> => {
    if (!canWrite) {
      setError('Bu işlem için yetkiniz yok.')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')
    const res = await window.api.bank.importExcelPreview()
    setLoading(false)

    if (!res.success || !res.data) {
      if (res.error !== 'Kayıt iptal edildi') {
        setError(res.error ?? 'Excel dosyası okunamadı.')
        toast.fail('İçe aktarma tamamlanamadı', res.error)
      }
      return
    }

    setFileName(res.data.file_name)
    setRows(res.data.rows.map((row) => ({ ...row })))
    setShowHistory(false)
    setEditingRowKey(null)
  }

  const handleClear = (): void => {
    setFileName('')
    setRows([])
    setError('')
    setSuccess('')
    setEditingRowKey(null)
  }

  const toggleRowSelected = (rowKey: string): void => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.row_key !== rowKey || !canSelectRow(row)) return row
        return { ...row, selected: !row.selected }
      })
    )
  }

  const handlePartnerSelect = async (
    rowKey: string,
    partnerId: number,
    options?: { fromChange?: boolean }
  ): Promise<void> => {
    const partner = partners.find((item) => item.id === partnerId)
    const row = rows.find((item) => item.row_key === rowKey)
    if (!partner || !row) return

    let patternText = partner.full_name
    const suggestRes = await window.api.bank.suggestMatchPattern(row.description, partnerId)
    if (suggestRes.success && suggestRes.data?.pattern_text) {
      patternText = suggestRes.data.pattern_text
    }

    const hadRule = hasRememberedRule(row)
    if (options?.fromChange && hadRule) {
      setChangeRememberPrompt({
        rowKey,
        partnerId,
        patternText,
        hadRule: true
      })
      return
    }

    applyPartnerChange(rowKey, partner, patternText, 'MANUAL_MATCHED', {
      match_rule_id: null,
      remembered_pattern: null,
      match_rule_saved: false
    })
  }

  const handleChangeRememberChoice = async (remember: boolean): Promise<void> => {
    if (!changeRememberPrompt) return
    const { rowKey, partnerId, patternText } = changeRememberPrompt
    const row = rows.find((item) => item.row_key === rowKey)
    const partner = partners.find((item) => item.id === partnerId)
    if (!row || !partner) {
      setChangeRememberPrompt(null)
      return
    }

    setChangeRememberPrompt(null)

    if (!remember) {
      applyPartnerChange(rowKey, partner, patternText, 'MANUAL_MATCHED', {
        match_rule_id: null,
        remembered_pattern: null,
        match_rule_saved: false
      })
      return
    }

    setRowActionKey(rowKey)
    setError('')
    const res = await window.api.bank.updateAndRememberMatchRule(
      row.description,
      partnerId,
      patternText
    )
    setRowActionKey(null)

    if (!res.success || !res.data) {
      setError(res.error ?? 'Eşleşme güncellenemedi.')
      toast.fail('Banka eşleşmesi güncellenemedi', res.error)
      return
    }

    applyPartnerChange(rowKey, partner, res.data.pattern_text, 'REMEMBERED_MATCH', {
      match_rule_id: row.match_rule_id,
      remembered_pattern: res.data.pattern_text,
      match_rule_saved: true
    })
    setSuccess(res.data.message)
    toast.success('Banka eşleşmesi kaydedildi', res.data.message)
  }

  const updatePatternText = (rowKey: string, patternText: string): void => {
    setRows((prev) =>
      prev.map((row) =>
        row.row_key === rowKey ? { ...row, pattern_text: patternText, match_rule_saved: false } : row
      )
    )
  }

  const handleSaveMatchRule = async (row: PreviewRow): Promise<void> => {
    if (!canWrite || !row.matched_partner_id) return

    const patternText = row.pattern_text?.trim()
    if (!patternText) {
      setError('Hatırlanacak metin boş olamaz.')
      return
    }

    setSavingMatchRuleKey(row.row_key)
    setError('')
    const res = await window.api.bank.saveMatchRule(
      row.matched_partner_id,
      patternText,
      row.description
    )
    setSavingMatchRuleKey(null)

    if (!res.success || !res.data) {
      setError(res.error ?? 'Eşleşme kuralı kaydedilemedi.')
      toast.fail('Banka eşleşmesi kaydedilemedi', res.error)
      return
    }

    setRows((prev) =>
      prev.map((item) =>
        item.row_key === row.row_key
          ? {
              ...item,
              pattern_text: res.data!.pattern_text,
              remembered_pattern: res.data!.pattern_text,
              match_rule_saved: true,
              remember_match: true,
              match_status: 'REMEMBERED_MATCH',
              match_confidence: 95
            }
          : item
      )
    )
    setSuccess(res.data.message)
    toast.success('Banka eşleşmesi kaydedildi', res.data.message)
  }

  const handleUpdateAndRemember = async (row: PreviewRow): Promise<void> => {
    if (!canWrite || !row.matched_partner_id) return

    const patternText =
      row.pattern_text?.trim() ||
      row.remembered_pattern?.trim() ||
      row.matched_partner_label?.split('—').pop()?.trim() ||
      ''

    setRowActionKey(row.row_key)
    setError('')
    const res = await window.api.bank.updateAndRememberMatchRule(
      row.description,
      row.matched_partner_id,
      patternText || null
    )
    setRowActionKey(null)

    if (!res.success || !res.data) {
      setError(res.error ?? 'Eşleşme güncellenemedi.')
      toast.fail('Banka eşleşmesi güncellenemedi', res.error)
      return
    }

    setRows((prev) =>
      prev.map((item) =>
        item.row_key === row.row_key
          ? {
              ...item,
              pattern_text: res.data!.pattern_text,
              remembered_pattern: res.data!.pattern_text,
              match_rule_saved: true,
              remember_match: true,
              match_status: 'REMEMBERED_MATCH',
              match_confidence: 95
            }
          : item
      )
    )
    setSuccess(res.data.message)
    toast.success('Banka eşleşmesi kaydedildi', res.data.message)
  }

  const handleForgetMatch = async (row: PreviewRow): Promise<void> => {
    if (!canWrite) return

    setRowActionKey(row.row_key)
    setError('')
    const res = await window.api.bank.forgetMatchRule(row.description)
    setRowActionKey(null)

    if (!res.success || !res.data) {
      setError(res.error ?? 'Hatırlanan eşleşme silinemedi.')
      toast.fail('Banka eşleşmesi silinemedi', res.error)
      return
    }

    setRows((prev) =>
      prev.map((item) => {
        if (item.row_key !== row.row_key) return item
        if (item.match_status === 'REMEMBERED_MATCH') {
          return {
            ...item,
            match_status: 'UNMATCHED',
            matched_partner_id: null,
            matched_partner_label: null,
            match_confidence: 0,
            selected: false,
            match_rule_id: null,
            remembered_pattern: null,
            match_rule_saved: false,
            remember_match: false
          }
        }
        return {
          ...item,
          match_rule_id: null,
          remembered_pattern: null,
          match_rule_saved: false,
          remember_match: false
        }
      })
    )
    setSuccess(res.data.message)
    toast.success('Banka eşleşmesi silindi', res.data.message)
  }

  const handleProcess = async (): Promise<void> => {
    if (!canWrite) {
      setError('Bu işlem için yetkiniz yok.')
      return
    }

    const processRows: BankProcessImportRow[] = rows
      .filter((row) => row.selected && canSelectRow(row))
      .map((row) => ({
        row_key: row.row_key,
        transaction_date: row.transaction_date,
        voucher_no: row.voucher_no,
        description: row.description,
        amount: row.amount,
        balance: row.balance,
        transaction_hash: row.transaction_hash,
        matched_partner_id: row.matched_partner_id!,
        match_status: row.match_status as 'MATCHED' | 'MANUAL_MATCHED' | 'REMEMBERED_MATCH',
        remember_match: row.remember_match,
        pattern_text: row.pattern_text
      }))

    if (processRows.length === 0) {
      setError('Ödeme olarak işlenecek eşleşmiş satır bulunamadı.')
      return
    }

    setProcessing(true)
    setError('')
    setSuccess('')

    const res = await window.api.bank.processImport({
      file_name: fileName || 'banka.xlsx',
      rows: processRows
    })

    setProcessing(false)

    if (!res.success || !res.data) {
      setError(res.error ?? 'İşlem tamamlanamadı.')
      toast.fail('Banka hareketi kaydedilemedi', res.error)
      return
    }

    const processedKeys = new Set(processRows.map((row) => row.row_key))
    setRows((prev) =>
      prev.map((row) =>
        processedKeys.has(row.row_key)
          ? {
              ...row,
              match_status: 'PROCESSED',
              selected: false,
              match_confidence: 100
            }
          : row
      )
    )
    setSuccess(res.data.message)
    const unmatchedLeft = rows.some(
      (row) =>
        !processedKeys.has(row.row_key) &&
        (row.match_status === 'UNMATCHED' || row.match_status === 'NEEDS_REVIEW')
    )
    if (unmatchedLeft) {
      toast.warn(
        'İçe aktarma tamamlandı',
        res.data.message || 'Bazı banka hareketleri eşleşmediği için işlenmedi.'
      )
    } else {
      toast.success('İçe aktarma tamamlandı', res.data.message || 'Banka hareketleri işlendi.')
    }
    loadHistory()
  }

  return (
    <div className="bank-transactions-page">
      <div className="bank-toolbar">
        <button
          type="button"
          className="btn btn-sm btn-primary"
          disabled={!canWrite || loading}
          onClick={handleImport}
        >
          Excel İçe Aktar
        </button>
        <button
          type="button"
          className="btn btn-sm btn-accent"
          disabled={!canWrite || processing || selectedProcessCount === 0}
          onClick={handleProcess}
        >
          Seçili Eşleşenleri Ödeme Olarak İşle
          {selectedProcessCount > 0 ? ` (${selectedProcessCount})` : ''}
        </button>
        <button
          type="button"
          className="btn btn-sm"
          disabled={rows.length === 0}
          onClick={handleClear}
        >
          Eşleşmeleri Temizle
        </button>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => {
            setShowHistory((value) => !value)
            if (!showHistory) loadHistory()
          }}
        >
          Aktarım Geçmişi
        </button>
        <button type="button" className="btn btn-sm" onClick={() => setShowMatchRules(true)}>
          Eşleşme Kuralları
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {unmatchedCount > 0 && (
        <div className="alert alert-warning bank-unmatched-alert">
          Bazı banka hareketleri üyelerle eşleşmedi. Kırmızı satırları kontrol edip manuel üye
          seçebilirsiniz.
        </div>
      )}

      {showMatchRules && (
        <BankMatchRulesModal
          partners={partners}
          canWrite={canWrite}
          onClose={() => setShowMatchRules(false)}
          onChanged={() => {
            if (rows.length > 0) {
              setSuccess('Eşleşme kuralları güncellendi. Önizlemeyi yenilemek için Excel’i tekrar yükleyin.')
            }
          }}
        />
      )}

      {changeRememberPrompt && (
        <div className="modal-overlay">
          <div className="modal bank-change-remember-modal">
            <div className="modal-header">
              <h3>Eşleşme Değişikliği</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setChangeRememberPrompt(null)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p>
                Bu değişikliği bundan sonraki aktarımlarda da hatırlamak ister misiniz?
              </p>
              <div className="bank-change-remember-actions">
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => void handleChangeRememberChoice(false)}
                >
                  Sadece bu satırda değiştir
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={() => void handleChangeRememberChoice(true)}
                >
                  Eşleşmeyi güncelle ve hatırla
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showHistory && (
        <DataPanel title="Aktarım Geçmişi" className="bank-history-panel">
          {batches.length === 0 ? (
            <p className="bank-empty-text">Henüz aktarım kaydı yok.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table data-table--compact">
                <thead>
                  <tr>
                    <th>Aktarım Tarihi</th>
                    <th>Dosya Adı</th>
                    <th>Toplam Satır</th>
                    <th>Eşleşen</th>
                    <th>İşlenen Ödeme</th>
                    <th>Eşleşmeyen</th>
                    <th>Toplam Tutar</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((batch) => (
                    <tr key={batch.id}>
                      <td>{formatDate(batch.imported_at)}</td>
                      <td>{batch.file_name}</td>
                      <td>{batch.total_rows}</td>
                      <td>{batch.matched_rows}</td>
                      <td>{batch.processed_rows}</td>
                      <td>{batch.unmatched_rows}</td>
                      <td>{formatMoney(batch.total_processed_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DataPanel>
      )}

      <DataPanel
        title={fileName ? `Banka Hareketleri — ${fileName}` : 'Banka Hareketleri Önizleme'}
        className="bank-preview-panel"
      >
        {rows.length === 0 ? (
          <p className="bank-empty-text">
            Excel dosyası seçerek banka hareketlerini önizleyebilirsiniz. İçe aktarma sonrası hiçbir
            ödeme otomatik kaydedilmez.
          </p>
        ) : (
          <div className="table-wrap table-wrap--scroll bank-table-wrap">
            <table className="data-table data-table--compact bank-preview-table">
              <thead>
                <tr>
                  <th>Durum</th>
                  <th>Tarih</th>
                  <th>Fiş No</th>
                  <th>Açıklama</th>
                  <th className="text-right">Tutar</th>
                  <th>Eşleşen Üye</th>
                  <th>Güven</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const isEditing = editingRowKey === row.row_key
                  const showPartnerPicker =
                    canManualMatch(row) || (isEditing && canChangeMatch(row) && canWrite)

                  return (
                    <tr key={row.row_key} className={ROW_CLASS[row.match_status]}>
                      <td>
                        <span className={STATUS_BADGE_CLASS[row.match_status]}>
                          {STATUS_LABELS[row.match_status]}
                        </span>
                        {row.match_status === 'REMEMBERED_MATCH' && (
                          <div className="bank-remembered-note">Hatırlanan eşleşme</div>
                        )}
                      </td>
                      <td>{formatDate(row.transaction_date)}</td>
                      <td>{row.voucher_no ?? '—'}</td>
                      <td className="bank-description-cell">{row.description}</td>
                      <td className="text-right">{formatMoney(row.amount)}</td>
                      <td>
                        {showPartnerPicker ? (
                          <PartnerSearchSelect
                            partners={partners}
                            value={row.matched_partner_id ?? ''}
                            disabled={!canWrite}
                            compact
                            allowEmpty
                            emptyLabel="Üye seçin…"
                            onChange={(nextId) => {
                              if (!nextId) return
                              if (isEditing) {
                                void handlePartnerSelect(row.row_key, nextId, { fromChange: true })
                              } else {
                                void handlePartnerSelect(row.row_key, nextId)
                              }
                            }}
                          />
                        ) : (
                          row.matched_partner_label ?? '—'
                        )}
                      </td>
                      <td>{row.match_confidence > 0 ? `%${row.match_confidence}` : '—'}</td>
                      <td>
                        <div className="bank-row-actions">
                          {canSelectRow(row) && (
                            <label className="bank-select-label">
                              <input
                                type="checkbox"
                                checked={row.selected}
                                disabled={!canWrite || row.match_status === 'PROCESSED'}
                                onChange={() => toggleRowSelected(row.row_key)}
                              />
                              Seç
                            </label>
                          )}

                          {canWrite && canSplitRow(row) && (
                            <button
                              type="button"
                              className="btn btn-sm bank-match-action-btn"
                              onClick={() => setSplitRow(row)}
                            >
                              Dağıt
                            </button>
                          )}

                          {canWrite && canChangeMatch(row) && row.match_status !== 'PROCESSED' && (
                            <div className="bank-match-action-menu">
                              {!isEditing && (
                                <button
                                  type="button"
                                  className="btn btn-sm bank-match-action-btn"
                                  onClick={() => setEditingRowKey(row.row_key)}
                                >
                                  Değiştir
                                </button>
                              )}
                              {isEditing && (
                                <button
                                  type="button"
                                  className="btn btn-sm bank-match-action-btn"
                                  onClick={() => setEditingRowKey(null)}
                                >
                                  Vazgeç
                                </button>
                              )}
                              {hasRememberedRule(row) && (
                                <button
                                  type="button"
                                  className="btn btn-sm bank-match-action-btn"
                                  disabled={rowActionKey === row.row_key}
                                  onClick={() => void handleForgetMatch(row)}
                                >
                                  Unut
                                </button>
                              )}
                              {row.matched_partner_id &&
                                (hasRememberedRule(row) || row.match_status === 'MANUAL_MATCHED') && (
                                <button
                                  type="button"
                                  className="btn btn-sm bank-match-action-btn btn-primary"
                                  disabled={rowActionKey === row.row_key}
                                  onClick={() => void handleUpdateAndRemember(row)}
                                >
                                  Güncelle/Hatırla
                                </button>
                              )}
                            </div>
                          )}

                          {row.match_status === 'MANUAL_MATCHED' && canWrite && (
                            <div className="bank-remember-block">
                              <input
                                type="text"
                                className="field-input bank-remember-block__pattern"
                                value={row.pattern_text ?? ''}
                                placeholder="Banka açıklamasındaki gönderen adı (ör. YAĞMUR TÜRKMEN)"
                                onChange={(e) => updatePatternText(row.row_key, e.target.value)}
                              />
                              <button
                                type="button"
                                className="btn btn-sm btn-primary"
                                disabled={savingMatchRuleKey === row.row_key}
                                onClick={() => handleSaveMatchRule(row)}
                              >
                                {savingMatchRuleKey === row.row_key
                                  ? 'Kaydediliyor…'
                                  : 'Eşleşmeyi Kaydet'}
                              </button>
                              {row.match_rule_saved ? (
                                <span className="bank-remember-block__saved">Kaydedildi</span>
                              ) : null}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </DataPanel>

      {splitRow && (
        <BankSplitModal
          row={splitRow}
          partners={partners}
          fileName={fileName}
          onClose={() => setSplitRow(null)}
          onDone={(message) => {
            setSuccess(message)
            setRows((prev) =>
              prev.map((item) =>
                item.row_key === splitRow.row_key
                  ? {
                      ...item,
                      match_status: 'ALREADY_IMPORTED',
                      selected: false,
                      match_confidence: 100
                    }
                  : item
              )
            )
            setSplitRow(null)
            void loadHistory()
          }}
        />
      )}
    </div>
  )
}
