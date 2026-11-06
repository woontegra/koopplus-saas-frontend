import type { MemberDebtTableReport, MemberPaymentHistoryItem } from '@shared/types'
import { MONTH_NAMES, formatDate, formatMoney } from '../../utils/format'

interface MemberPaymentHistoryPanelProps {
  report: MemberDebtTableReport
  canDelete?: boolean
  onDelete?: (item: MemberPaymentHistoryItem) => void
}

function scopeLabel(item: MemberPaymentHistoryItem): string {
  if (item.payment_scope === 'PERIOD') return 'Belirli Döneme Ödeme'
  if (item.payment_scope === 'AIDAT_ONLY') return 'Sadece Aidat Borcuna'
  if (item.payment_scope === 'EXTRA_ONLY') return 'Sadece Ek Borçlara'
  return 'Genel Ödeme'
}

function targetLabel(item: MemberPaymentHistoryItem): string {
  if (item.payment_scope !== 'PERIOD' || !item.target_period_year || !item.target_period_month) {
    return '—'
  }
  const month = MONTH_NAMES[item.target_period_month - 1] ?? String(item.target_period_month)
  return `${month} ${item.target_period_year}`
}

function allocationSummary(report: MemberDebtTableReport, paymentId: number): string {
  const parts: string[] = []
  for (const row of report.rows) {
    for (const allocation of row.payment_allocations ?? []) {
      if (allocation.payment_id !== paymentId) continue
      if (allocation.applied_to_this_due_interest > 0.009) {
        parts.push(`${row.period_label} faizi ${formatMoney(allocation.applied_to_this_due_interest)}`)
      }
      if (allocation.applied_to_this_due_principal > 0.009) {
        parts.push(`${row.period_label} ana para ${formatMoney(allocation.applied_to_this_due_principal)}`)
      }
    }
  }
  return parts.length > 0 ? parts.join(', ') : '—'
}

export default function MemberPaymentHistoryPanel({
  report,
  canDelete = false,
  onDelete
}: MemberPaymentHistoryPanelProps): JSX.Element {
  const rows = [...report.payment_history].sort((a, b) => {
    if (a.payment_date !== b.payment_date) return b.payment_date.localeCompare(a.payment_date)
    return b.payment_id - a.payment_id
  })

  return (
    <div className="member-payment-history member-payment-history--below">
      <div className="member-payment-history__header">
        <h4>Tahsilat Geçmişi{rows.length > 0 ? ` (${rows.length})` : ''}</h4>
      </div>
      <p className="member-payment-history__hint">
        En yeni tahsilat üsttedir. Silinen kayıt bu üyeye ait ödeme, mahsup, ek borç payı ve kasa
        hareketiyle birlikte geri alınır.
      </p>
      {rows.length === 0 ? (
        <p className="muted">Bu üye için henüz tahsilat yok.</p>
      ) : (
        <div className="table-wrap table-wrap--scroll">
          <table className="data-table member-payment-history-table">
            <thead>
              <tr>
                <th>Tarih</th>
                <th className="text-right">Tutar</th>
                <th>Ödeme Yöntemi</th>
                <th>Ödeme Türü</th>
                <th>Hedef Dönem</th>
                <th>Mahsup</th>
                <th>Açıklama</th>
                {canDelete && <th className="text-center">İşlem</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.payment_id}>
                  <td>{formatDate(item.payment_date)}</td>
                  <td className="money credit text-right">{formatMoney(item.amount)}</td>
                  <td>{item.payment_method?.trim() || '—'}</td>
                  <td>{scopeLabel(item)}</td>
                  <td>{targetLabel(item)}</td>
                  <td>{allocationSummary(report, item.payment_id)}</td>
                  <td>{item.description?.trim() || '—'}</td>
                  {canDelete && (
                    <td className="text-center">
                      <button
                        type="button"
                        className="btn btn-xs btn-danger-outline"
                        onClick={() => onDelete?.(item)}
                      >
                        Sil
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
