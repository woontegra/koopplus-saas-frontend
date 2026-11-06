import { useMemo, useState } from 'react'
import type {
  BankImportPreviewRow,
  BankSplitAllocationLine,
  Partner,
  PartnerLinkedMember
} from '@shared/types'
import PartnerSearchSelect from '../partners/PartnerSearchSelect'
import { formatDate, formatMoney } from '../../utils/format'
import { formatMoneyInputFromNumber, parseMoneyInput } from '@shared/moneyInput'
import MoneyAmountInput from '../ui/MoneyAmountInput'
import { useAskDialog } from '../../hooks/useAskDialog'

interface BankSplitModalProps {
  row: BankImportPreviewRow
  partners: Partner[]
  fileName: string
  onClose: () => void
  onDone: (message: string) => void
}

type SplitLine = {
  key: string
  partner_id: number | ''
  amount: string
  description: string
}

const EPSILON = 0.005

function parseAmount(raw: string): number {
  const value = parseMoneyInput(raw)
  return value == null ? NaN : value
}

function formatAmountInput(value: number): string {
  return formatMoneyInputFromNumber(value)
}

function createLine(partnerId: number | '' = '', amount = ''): SplitLine {
  return {
    key: `line-${Date.now()}-${Math.random()}`,
    partner_id: partnerId,
    amount,
    description: ''
  }
}

export default function BankSplitModal({
  row,
  partners,
  fileName,
  onClose,
  onDone
}: BankSplitModalProps): JSX.Element {
  const ask = useAskDialog()
  const [lines, setLines] = useState<SplitLine[]>([
    createLine(row.matched_partner_id ?? '', ''),
    createLine('', '')
  ])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [suggestNote, setSuggestNote] = useState('')

  const bankAmount = row.amount
  const allocated = useMemo(() => {
    return lines.reduce((sum, line) => {
      const amount = parseAmount(line.amount)
      return sum + (Number.isFinite(amount) ? amount : 0)
    }, 0)
  }, [lines])
  const remaining = Math.round((bankAmount - allocated) * 100) / 100

  const updateLine = (key: string, patch: Partial<SplitLine>): void => {
    setLines((prev) => prev.map((line) => (line.key === key ? { ...line, ...patch } : line)))
  }

  const removeLine = (key: string): void => {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((line) => line.key !== key)))
  }

  const handleEqualSplit = (): void => {
    const selected = lines.filter((line) => line.partner_id)
    const count = selected.length || lines.length
    if (count < 1) {
      setError('Eşit bölmek için en az bir satır olmalı.')
      return
    }
    const base = Math.floor((bankAmount / count) * 100) / 100
    let leftover = Math.round((bankAmount - base * count) * 100) / 100
    setLines((prev) =>
      prev.map((line, index) => {
        if (index >= count) return line
        const extra = leftover > 0 ? 0.01 : leftover < 0 ? -0.01 : 0
        if (extra !== 0) leftover = Math.round((leftover - extra) * 100) / 100
        return { ...line, amount: formatAmountInput(base + extra) }
      })
    )
    setError('')
  }

  const handleSuggestLinked = async (): Promise<void> => {
    const primaryId =
      (typeof lines[0]?.partner_id === 'number' ? lines[0].partner_id : null) ||
      row.matched_partner_id
    if (!primaryId) {
      setError('Öneri için önce birinci satırda bir üye seçin.')
      return
    }

    const res = await window.api.bank.listPartnerLinks(primaryId)
    if (!res.success || !res.data) {
      setError(res.error ?? 'Bağlı üyeler yüklenemedi.')
      return
    }

    const links: PartnerLinkedMember[] = res.data
    if (links.length === 0) {
      setSuggestNote('Bu üyeye tanımlı bağlı üye yok. Satırları manuel ekleyebilirsiniz.')
      return
    }

    const confirmSuggest = await ask.confirm(
      `Bu üyeye bağlı ${links.length} üye var. Dağıtım önerisi oluşturulsun mu?\n\nOnaylamadan ödeme oluşmaz.`
    )
    if (!confirmSuggest) return

    const members = [primaryId, ...links.map((link) => link.linked_partner_id)]
    const unique = [...new Set(members)]
    const count = unique.length
    const base = Math.floor((bankAmount / count) * 100) / 100
    let leftover = Math.round((bankAmount - base * count) * 100) / 100

    setLines(
      unique.map((partnerId) => {
        const extra = leftover > 0 ? 0.01 : leftover < 0 ? -0.01 : 0
        if (extra !== 0) leftover = Math.round((leftover - extra) * 100) / 100
        const link = links.find((item) => item.linked_partner_id === partnerId)
        const suggested =
          link?.default_split_amount != null && link.default_split_amount > 0
            ? link.default_split_amount
            : base + extra
        return createLine(partnerId, formatAmountInput(suggested))
      })
    )
    setSuggestNote(
      `Öneri oluşturuldu (${count} üye). Tutarları kontrol edip “Dağıtımı Ödeme Olarak İşle” ile onaylayın.`
    )
    setError('')
  }

  const handleSubmit = async (): Promise<void> => {
    setError('')
    const allocations: BankSplitAllocationLine[] = []

    for (const line of lines) {
      if (!line.partner_id) {
        setError('Dağıtım satırında üye seçilmelidir.')
        return
      }
      const amount = parseAmount(line.amount)
      if (!Number.isFinite(amount) || amount <= EPSILON) {
        setError('Dağıtım tutarı sıfırdan büyük olmalıdır.')
        return
      }
      allocations.push({
        partner_id: Number(line.partner_id),
        amount,
        description: line.description.trim() || null
      })
    }

    const total = Math.round(allocations.reduce((sum, a) => sum + a.amount, 0) * 100) / 100
    if (total > bankAmount + EPSILON) {
      setError('Dağıtılan tutar banka hareketinden fazla olamaz.')
      return
    }
    if (Math.abs(total - bankAmount) > EPSILON) {
      setError('Dağıtım toplamı banka hareketi tutarına eşit olmalıdır.')
      return
    }

    if (
      !(await ask.confirm(
        `${formatMoney(bankAmount)} tutarındaki banka hareketi ${allocations.length} üyeye dağıtılacak. Devam edilsin mi?`
      ))
    ) {
      return
    }

    setSaving(true)
    try {
      const res = await window.api.bank.processSplit({
        file_name: fileName || 'banka.xlsx',
        transaction_date: row.transaction_date,
        voucher_no: row.voucher_no,
        description: row.description,
        amount: row.amount,
        balance: row.balance,
        transaction_hash: row.transaction_hash,
        allocations
      })
      if (res.success && res.data) {
        onDone(res.data.message)
        onClose()
      } else {
        setError(res.error ?? 'Dağıtım işlenemedi.')
      }
    } catch (err) {
      console.error('[bank-split] Dağıtım hatası:', err)
      setError('Dağıtım işlenemedi. Lütfen tekrar deneyin.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal modal--wide">
        <div className="modal-header">
          <h3>Banka Hareketini Üyelere Dağıt</h3>
          <button type="button" className="modal-close" onClick={onClose} disabled={saving}>
            ×
          </button>
        </div>
        <div className="modal-body">
          {error && <div className="alert alert-error">{error}</div>}
          {suggestNote && <div className="alert alert-success">{suggestNote}</div>}

          <div className="bank-split-meta">
            <div>
              <span>Tarih</span>
              <strong>{formatDate(row.transaction_date)}</strong>
            </div>
            <div>
              <span>Fiş No</span>
              <strong>{row.voucher_no?.trim() || '—'}</strong>
            </div>
            <div>
              <span>Toplam Tutar</span>
              <strong>{formatMoney(bankAmount)}</strong>
            </div>
            <div className="bank-split-meta__desc">
              <span>Açıklama</span>
              <strong>{row.description}</strong>
            </div>
          </div>

          <div className="bank-split-toolbar">
            <button type="button" className="btn btn-xs" onClick={() => setLines((prev) => [...prev, createLine()])}>
              Satır Ekle
            </button>
            <button type="button" className="btn btn-xs" onClick={() => void handleSuggestLinked()}>
              Bağlı Üye Öner
            </button>
            <button type="button" className="btn btn-xs" onClick={handleEqualSplit}>
              Eşit Böl
            </button>
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Üye</th>
                  <th className="text-right">Tutar</th>
                  <th>Açıklama</th>
                  <th className="text-center">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.key}>
                    <td>
                      <PartnerSearchSelect
                        partners={partners}
                        value={line.partner_id}
                        compact
                        onChange={(nextId) => updateLine(line.key, { partner_id: nextId })}
                      />
                    </td>
                    <td>
                      <MoneyAmountInput
                        className="field-input text-right"
                        value={line.amount}
                        placeholder="0,00"
                        onValueChange={(value) => updateLine(line.key, { amount: value })}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="field-input"
                        value={line.description}
                        placeholder="Opsiyonel"
                        onChange={(e) => updateLine(line.key, { description: e.target.value })}
                      />
                    </td>
                    <td className="text-center">
                      <button
                        type="button"
                        className="btn btn-xs btn-danger-outline"
                        onClick={() => removeLine(line.key)}
                        disabled={lines.length <= 1}
                      >
                        Sil
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bank-split-totals">
            <span>
              Toplam dağıtım: <strong>{formatMoney(allocated)}</strong>
            </span>
            <span>
              Kalan:{' '}
              <strong className={Math.abs(remaining) > EPSILON ? 'debit' : 'credit'}>
                {formatMoney(remaining)}
              </strong>
            </span>
          </div>
          <p className="form-hint">
            Program otomatik ödeme oluşturmaz. Dağıtım yalnızca sizin onayınızla işlenir. Kalan 0
            olmadan işlem yapılmaz.
          </p>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn" onClick={onClose} disabled={saving}>
            İptal
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={saving || Math.abs(remaining) > EPSILON}
            onClick={() => void handleSubmit()}
          >
            {saving ? 'İşleniyor...' : 'Dağıtımı Ödeme Olarak İşle'}
          </button>
        </div>
      </div>
    </div>
  )
}
