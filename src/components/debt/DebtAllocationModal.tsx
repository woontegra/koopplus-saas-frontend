import { useEffect, useId } from 'react'
import type { ApiDebtTableRow } from '../../api/debtTypes'
import { formatDateTr, formatMoneyTr } from '../../utils/format'

type Props = {
  row: ApiDebtTableRow
  onClose: () => void
}

export default function DebtAllocationModal({ row, onClose }: Props): JSX.Element {
  const titleId = useId()
  const allocations = row.payment_allocations ?? []

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return (
    <div className="member-modal" role="presentation">
      <button type="button" className="member-modal__backdrop" aria-label="Kapat" onClick={onClose} />
      <div className="member-modal__dialog member-modal__dialog--wide" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="member-modal__header">
          <h2 id={titleId} className="member-modal__title">
            Mahsup Detayı — {row.period_label}
          </h2>
          <button type="button" className="member-modal__close" onClick={onClose} aria-label="Kapat">
            ×
          </button>
        </div>
        <div className="member-modal__form">
          <p className="debt-muted">
            Vade {formatDateTr(row.due_date)} · Aidat {formatMoneyTr(row.monthly_due)} ₺ · Kalan{' '}
            {formatMoneyTr(row.remaining_due)} ₺
          </p>
          {allocations.length === 0 ? (
            <p className="debt-muted">Bu döneme mahsup kaydı yok.</p>
          ) : (
            <div className="members-table-wrap">
              <table className="members-table">
                <thead>
                  <tr>
                    <th>Tarih</th>
                    <th>Ödeme</th>
                    <th>Ana Para</th>
                    <th>Faiz</th>
                    <th>Kaynak</th>
                    <th>Not</th>
                  </tr>
                </thead>
                <tbody>
                  {allocations.map((a) => (
                    <tr key={`${a.payment_id}-${a.allocation_order ?? 0}-${a.payment_date}`}>
                      <td>{formatDateTr(a.payment_date)}</td>
                      <td className="members-table__mono">{formatMoneyTr(a.payment_amount)}</td>
                      <td className="members-table__mono">
                        {formatMoneyTr(a.applied_to_this_due_principal)}
                      </td>
                      <td className="members-table__mono">
                        {formatMoneyTr(a.applied_to_this_due_interest)}
                      </td>
                      <td>{a.source}</td>
                      <td>{a.note || a.description || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="member-modal__actions">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Kapat
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
