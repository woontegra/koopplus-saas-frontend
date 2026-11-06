import { useCallback, useEffect, useState } from 'react'
import type { BankMatchRuleItem, Partner } from '@shared/types'
import PartnerSearchSelect from '../partners/PartnerSearchSelect'
import { formatDate } from '../../utils/format'
import { useActionToast } from '../../hooks/useActionToast'
import { useAskDialog } from '../../hooks/useAskDialog'

interface BankMatchRulesModalProps {
  partners: Partner[]
  canWrite: boolean
  onClose: () => void
  onChanged: () => void
}

export default function BankMatchRulesModal({
  partners,
  canWrite,
  onClose,
  onChanged
}: BankMatchRulesModalProps): JSX.Element {
  const toast = useActionToast()
  const ask = useAskDialog()
  const [rules, setRules] = useState<BankMatchRuleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editPartnerId, setEditPartnerId] = useState<number | ''>('')
  const [editPattern, setEditPattern] = useState('')
  const [saving, setSaving] = useState(false)

  const loadRules = useCallback(async (): Promise<void> => {
    setLoading(true)
    setError('')
    const res = await window.api.bank.listMatchRules()
    setLoading(false)
    if (res.success && res.data) {
      setRules(res.data)
    } else {
      setRules([])
      setError(res.error ?? 'Eşleşme kuralları yüklenemedi.')
    }
  }, [])

  useEffect(() => {
    void loadRules()
  }, [loadRules])

  const startEdit = (rule: BankMatchRuleItem): void => {
    setEditingId(rule.id)
    setEditPartnerId(rule.partner_id)
    setEditPattern(rule.pattern_text)
    setSuccess('')
    setError('')
  }

  const cancelEdit = (): void => {
    setEditingId(null)
    setEditPartnerId('')
    setEditPattern('')
  }

  const handleSaveEdit = async (): Promise<void> => {
    if (!editingId || !editPartnerId) return
    setSaving(true)
    setError('')
    const res = await window.api.bank.updateMatchRule(editingId, editPartnerId, editPattern)
    setSaving(false)
    if (!res.success || !res.data) {
      setError(res.error ?? 'Kural güncellenemedi.')
      toast.fail('Banka eşleşmesi güncellenemedi', res.error)
      return
    }
    setSuccess(res.data.message)
    toast.success('Banka eşleşmesi kaydedildi', res.data.message)
    cancelEdit()
    onChanged()
    void loadRules()
  }

  const handleDelete = async (rule: BankMatchRuleItem): Promise<void> => {
    if (!(await ask.confirm(`"${rule.pattern_text}" eşleşme kuralı silinecek. Devam etmek istiyor musunuz?`))) {
      return
    }
    setError('')
    const res = await window.api.bank.forgetMatchRuleById(rule.id)
    if (!res.success || !res.data) {
      setError(res.error ?? 'Kural silinemedi.')
      toast.fail('Banka eşleşmesi silinemedi', res.error)
      return
    }
    setSuccess(res.data.message)
    toast.success('Banka eşleşmesi silindi', res.data.message)
    onChanged()
    void loadRules()
  }

  return (
    <div className="modal-overlay">
      <div className="modal modal--wide bank-match-rules-modal">
        <div className="modal-header">
          <h3>Eşleşme Kuralları</h3>
          <button type="button" className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}
          {loading ? (
            <p className="bank-empty-text">Kurallar yükleniyor…</p>
          ) : rules.length === 0 ? (
            <p className="bank-empty-text">Kayıtlı hatırlanan eşleşme bulunmuyor.</p>
          ) : (
            <div className="table-wrap table-wrap--scroll">
              <table className="data-table data-table--compact">
                <thead>
                  <tr>
                    <th>Aranan Metin / Gönderen</th>
                    <th>Eşleşen Üye</th>
                    <th>Güven</th>
                    <th>Son Kullanım</th>
                    <th>İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((rule) => (
                    <tr key={rule.id}>
                      <td>
                        {editingId === rule.id ? (
                          <input
                            type="text"
                            className="field-input"
                            value={editPattern}
                            onChange={(e) => setEditPattern(e.target.value)}
                          />
                        ) : (
                          rule.pattern_text
                        )}
                      </td>
                      <td>
                        {editingId === rule.id ? (
                          <PartnerSearchSelect
                            partners={partners}
                            value={editPartnerId}
                            disabled={!canWrite}
                            compact
                            onChange={(nextId) => setEditPartnerId(nextId || '')}
                          />
                        ) : (
                          rule.partner_label
                        )}
                      </td>
                      <td>%{rule.confidence}</td>
                      <td>
                        {rule.last_used_at
                          ? formatDate(rule.last_used_at)
                          : formatDate(rule.updated_at)}
                      </td>
                      <td>
                        <div className="bank-match-rules-actions">
                          {editingId === rule.id ? (
                            <>
                              <button
                                type="button"
                                className="btn btn-sm btn-primary"
                                disabled={!canWrite || saving || !editPartnerId}
                                onClick={() => void handleSaveEdit()}
                              >
                                Kaydet
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm"
                                disabled={saving}
                                onClick={cancelEdit}
                              >
                                İptal
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="btn btn-sm"
                                disabled={!canWrite}
                                onClick={() => startEdit(rule)}
                              >
                                Düzenle
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-danger"
                                disabled={!canWrite}
                                onClick={() => void handleDelete(rule)}
                              >
                                Sil
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
