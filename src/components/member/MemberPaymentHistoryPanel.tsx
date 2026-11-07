import type {
  MemberDebtTableReport,
  MemberDebtTableRow,
  MemberPaymentHistoryItem
} from '@shared/types'
import { formatDate, formatMoney, formatMoneyTr } from '../../utils/format'

interface MemberPaymentHistoryPanelProps {
  report: MemberDebtTableReport
  canDelete?: boolean
  onDelete?: (item: MemberPaymentHistoryItem) => void
  onEdit?: (item: MemberPaymentHistoryItem) => void
}

const MONTH_SHORT = [
  'Oca',
  'Şub',
  'Mar',
  'Nis',
  'May',
  'Haz',
  'Tem',
  'Ağu',
  'Eyl',
  'Eki',
  'Kas',
  'Ara'
] as const

function paymentSplit(
  report: MemberDebtTableReport,
  paymentId: number
): { interest: number; principal: number } {
  const auditRow = report.audit?.payment_allocations?.find((row) => row.payment_id === paymentId)
  if (auditRow) {
    return {
      interest: auditRow.applied_to_interest ?? 0,
      principal: auditRow.applied_to_principal ?? 0
    }
  }

  let interest = 0
  let principal = 0
  for (const row of report.rows) {
    for (const allocation of row.payment_allocations ?? []) {
      if (allocation.payment_id !== paymentId) continue
      interest += allocation.applied_to_this_due_interest ?? 0
      principal += allocation.applied_to_this_due_principal ?? 0
    }
  }
  return { interest, principal }
}

function shortPeriodLabel(row: MemberDebtTableRow): string {
  const m = MONTH_SHORT[(row.period_month ?? 1) - 1] ?? String(row.period_month)
  return m
}

/** Örn: "Oca faizi 50 · Şub faizi 25 · Oca ana para 500 · Mar ana para 425" */
function paymentPeriodBreakdown(report: MemberDebtTableReport, paymentId: number): string {
  type Agg = { interest: number; principal: number; order: number; label: string }
  const byKey = new Map<string, Agg>()

  for (const row of report.rows) {
    for (const allocation of row.payment_allocations ?? []) {
      if (allocation.payment_id !== paymentId) continue
      const key = `${row.period_year}-${String(row.period_month).padStart(2, '0')}`
      const cur = byKey.get(key) ?? {
        interest: 0,
        principal: 0,
        order: row.period_year * 12 + row.period_month,
        label: shortPeriodLabel(row)
      }
      cur.interest += allocation.applied_to_this_due_interest ?? 0
      cur.principal += allocation.applied_to_this_due_principal ?? 0
      byKey.set(key, cur)
    }
  }

  const ordered = [...byKey.values()].sort((a, b) => a.order - b.order)
  const parts: string[] = []
  for (const item of ordered) {
    if (item.interest > 0.005) {
      parts.push(`${item.label} faizi ${formatMoneyTr(item.interest)}`)
    }
  }
  for (const item of ordered) {
    if (item.principal > 0.005) {
      parts.push(`${item.label} ana para ${formatMoneyTr(item.principal)}`)
    }
  }
  return parts.join(' · ')
}

export default function MemberPaymentHistoryPanel({
  report,
  canDelete = false,
  onDelete,
  onEdit
}: MemberPaymentHistoryPanelProps): JSX.Element {
  const rows = [...report.payment_history].sort((a, b) => {
    if (a.payment_date !== b.payment_date) return b.payment_date.localeCompare(a.payment_date)
    return b.payment_id - a.payment_id
  })

  return (
    <div className="member-payment-history member-payment-history--cards">
      <div className="member-payment-history__header">
        <h4>Son tahsilatlar ve nereye gittikleri</h4>
      </div>
      {rows.length === 0 ? (
        <p className="muted">Bu üye için henüz tahsilat yok.</p>
      ) : (
        <div className="member-payment-cards">
          {rows.map((item) => {
            const split = paymentSplit(report, item.payment_id)
            const total = Math.max(split.interest + split.principal, 0)
            const interestPct = total > 0.005 ? (split.interest / total) * 100 : 0
            const principalPct = total > 0.005 ? (split.principal / total) * 100 : 0
            const method = item.payment_method?.trim() || item.source_label?.trim() || '—'
            const description = item.description?.trim() || 'Tahsilat'
            const breakdown = paymentPeriodBreakdown(report, item.payment_id)
            return (
              <div key={item.payment_id} className="member-payment-card">
                <div className="member-payment-card__top">
                  <div className="member-payment-card__main">
                    <div className="member-payment-card__date">{formatDate(item.payment_date)}</div>
                    <div className="member-payment-card__desc">{description}</div>
                    <div className="member-payment-card__method">{method}</div>
                  </div>
                  <div className="member-payment-card__amount">{formatMoney(item.amount)}</div>
                </div>
                <div className="alloc-bar">
                  <div className="alloc-bar__track">
                    {interestPct > 0 && (
                      <span
                        className="alloc-bar__seg alloc-bar__seg--interest"
                        style={{ width: `${interestPct}%` }}
                      />
                    )}
                    {principalPct > 0 && (
                      <span
                        className="alloc-bar__seg alloc-bar__seg--principal"
                        style={{ width: `${principalPct}%` }}
                      />
                    )}
                  </div>
                  <div className="alloc-bar__legend">
                    <span className="alloc-bar__interest">
                      {formatMoney(split.interest)} faize
                    </span>
                    <span aria-hidden> · </span>
                    <span className="alloc-bar__principal">
                      {formatMoney(split.principal)} ana paraya
                    </span>
                  </div>
                  {breakdown ? (
                    <div className="member-payment-card__breakdown">{breakdown}</div>
                  ) : null}
                </div>
                {(canDelete || onEdit) && (
                  <div className="member-payment-card__actions">
                    {onEdit && (
                      <button type="button" className="btn btn-xs" onClick={() => onEdit(item)}>
                        Düzenle
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        className="btn btn-xs btn-danger-outline"
                        onClick={() => onDelete?.(item)}
                      >
                        Sil
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
