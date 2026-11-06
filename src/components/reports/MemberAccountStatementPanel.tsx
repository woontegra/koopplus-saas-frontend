import { useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Partner } from '@shared/types'
import type { MemberAccountStatement } from '@shared/partnerStatementModels'
import PartnerSearchSelect from '../partners/PartnerSearchSelect'
import DataPanel from '../ui/DataPanel'
import EmptyState from '../ui/EmptyState'
import StatPanel from '../ui/StatPanel'
import TableToolbar from '../ui/TableToolbar'
import { formatDate, formatMoney } from '../../utils/format'
import { useActionToast } from '../../hooks/useActionToast'

interface MemberAccountStatementPanelProps {
  partners: Partner[]
}

export default function MemberAccountStatementPanel({
  partners
}: MemberAccountStatementPanelProps): JSX.Element {
  const toast = useActionToast()
  const today = new Date().toISOString().slice(0, 10)
  const [mode, setMode] = useState<'single' | 'all'>('single')
  const [partnerId, setPartnerId] = useState<number | ''>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState(today)
  const [statement, setStatement] = useState<MemberAccountStatement | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [pdfSlot, setPdfSlot] = useState<HTMLElement | null>(null)

  useLayoutEffect(() => {
    setPdfSlot(document.getElementById('member-statement-pdf-slot'))
  }, [])

  const loadPreview = async (): Promise<void> => {
    if (!partnerId) {
      setStatement(null)
      setError('Önizleme için üye seçin')
      return
    }
    setBusy(true)
    setError('')
    const res = await window.api.reports.memberStatement({
      partner_id: Number(partnerId),
      date_from: dateFrom || null,
      date_to: dateTo || today
    })
    setBusy(false)
    if (!res.success || !res.data) {
      setStatement(null)
      setError(res.error ?? 'Ekstre yüklenemedi')
      return
    }
    setStatement(res.data)
  }

  const savePdf = async (allMembers: boolean): Promise<void> => {
    if (!allMembers && !partnerId) {
      setError('PDF için üye seçin')
      return
    }
    setBusy(true)
    setError('')
    const res = await window.api.documents.saveMemberStatementPdf({
      partner_id: allMembers ? null : Number(partnerId),
      all_members: allMembers,
      date_from: dateFrom || null,
      date_to: dateTo || today
    })
    setBusy(false)
    if (res.success) {
      toast.success('Hesap ekstresi PDF', 'PDF dosyası kaydedildi.')
    } else if (res.error !== 'Kayıt iptal edildi' && res.error !== 'Kayıt konumu seçilmedi') {
      setError(res.error ?? 'PDF oluşturulamadı')
      toast.fail('PDF oluşturulamadı', res.error)
    }
  }

  const pdfButton = (
    <button
      type="button"
      className="btn btn-primary"
      onClick={() => void savePdf(mode === 'all')}
      disabled={busy}
    >
      {mode === 'all' ? 'Tüm Üyeler PDF' : 'PDF Al'}
    </button>
  )

  return (
    <div className="member-account-statement">
      {pdfSlot ? createPortal(pdfButton, pdfSlot) : pdfButton}
      <DataPanel title="Filtreler" noPadding>
        <TableToolbar meta="">
          <div className="form-group">
            <label>Kapsam</label>
            <select
              className="field-select"
              value={mode}
              onChange={(e) => {
                const next = e.target.value as 'single' | 'all'
                setMode(next)
                setError('')
                if (next === 'all') setStatement(null)
              }}
            >
              <option value="single">Tek Üye</option>
              <option value="all">Tüm Üyeler</option>
            </select>
          </div>
          {mode === 'single' && (
            <div className="form-group reports-partner-search">
              <label>Üye</label>
              <PartnerSearchSelect
                partners={partners}
                value={partnerId}
                onChange={(id) => {
                  setPartnerId(id)
                  setStatement(null)
                }}
              />
            </div>
          )}
          <div className="form-group">
            <label>Başlangıç</label>
            <input
              className="field-input"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Bitiş</label>
            <input
              className="field-input"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          {mode === 'single' && (
            <button type="button" className="btn" onClick={() => void loadPreview()} disabled={busy}>
              Önizle
            </button>
          )}
        </TableToolbar>
      </DataPanel>

      {error && <div className="alert alert-error">{error}</div>}

      {mode === 'all' && (
        <EmptyState
          compact
          title="Tüm üyeler"
          message="Tüm üyeler tek PDF içinde üretilir. Her üye yeni sayfadan başlar."
        />
      )}

      {mode === 'single' && !statement && !error && (
        <EmptyState
          compact
          title="Ekstre önizlenmedi"
          message="Üye ve tarih aralığını seçip Önizle ile hareketleri görüntüleyin."
        />
      )}

      {statement && mode === 'single' && (
        <>
          <div className="reports-summary">
            <StatPanel label="Toplam Borç" value={formatMoney(statement.total_debit)} variant="debit" />
            <StatPanel label="Toplam Tahsilat" value={formatMoney(statement.total_collection)} variant="credit" />
            <StatPanel label="Toplam Faiz" value={formatMoney(statement.total_interest)} variant="accent" />
            <StatPanel label="Kalan Bakiye" value={formatMoney(statement.closing_balance)} variant="debit" />
          </div>
          <DataPanel
            title="Ekstre Hareketleri"
            subtitle={`${statement.partner_no} — ${statement.full_name} · ${statement.lines.length} kayıt`}
            noPadding
          >
            {statement.lines.length === 0 ? (
              <EmptyState compact message="Seçilen tarih aralığında hareket yok." />
            ) : (
              <div className="table-wrap table-wrap--scroll-tall">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Tarih</th>
                      <th>İşlem Türü</th>
                      <th>Açıklama / Dönem</th>
                      <th className="text-right">Borç</th>
                      <th className="text-right">Tahsilat / Mahsup</th>
                      <th className="text-right">Faiz</th>
                      <th className="text-right">Bakiye</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statement.lines.map((line, index) => (
                      <tr key={`${line.event_date}-${line.event_type}-${index}`}>
                        <td>{formatDate(line.event_date)}</td>
                        <td>{line.event_type_label}</td>
                        <td>{line.description}</td>
                        <td className="money">{line.debit > 0 ? formatMoney(line.debit) : '—'}</td>
                        <td className="money">
                          {line.event_type === 'allocation'
                            ? formatMoney(line.mahsup)
                            : line.collection > 0
                              ? formatMoney(line.collection)
                              : '—'}
                        </td>
                        <td className="money">
                          {Math.abs(line.interest) > 0.009 ? formatMoney(line.interest) : '—'}
                        </td>
                        <td className="money">{formatMoney(line.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </DataPanel>
        </>
      )}
    </div>
  )
}
