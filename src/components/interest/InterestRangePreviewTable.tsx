import type { RangeInterestPreviewRow } from '../../shared/types'
import { entityNoLabel } from '../../utils/entityLabels'
import { formatDate, formatMoney, formatPeriod } from '../../utils/format'
import { interestStatusClass, isApplicableInterestStatus } from './historicalInterestUi'

export function InterestRangePreviewTable({
  rows
}: {
  rows: RangeInterestPreviewRow[]
}): JSX.Element {
  return (
    <div className="table-wrap table-wrap--compact table-wrap--scroll-tall">
      <table className="data-table">
        <thead>
          <tr>
            <th>{entityNoLabel}</th>
            <th>Ad Soyad / Ünvan</th>
            <th>Borç Dönemi</th>
            <th>Son Ödeme Tarihi</th>
            <th className="text-right">Ana Borç</th>
            <th className="text-right">Kalan Ana Borç</th>
            <th className="text-right">Faiz Ayı</th>
            <th className="text-right">Aylık Oran</th>
            <th className="text-right">Hesaplanacak Faiz</th>
            <th>Durum</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.related_ledger_entry_id}
              className={isApplicableInterestStatus(row.status) ? 'row-risk' : 'row-muted'}
            >
              <td className="cell-mono">{row.partner_no}</td>
              <td>{row.full_name}</td>
              <td>{formatPeriod(row.accrual_period_year, row.accrual_period_month)}</td>
              <td>{row.due_date ? formatDate(row.due_date) : '—'}</td>
              <td className="money debit">{formatMoney(row.principal_amount)}</td>
              <td className="money debit">{formatMoney(row.remaining_principal)}</td>
              <td className="text-right">{row.interest_month_count}</td>
              <td className="text-right">%{row.interest_rate}</td>
              <td className="money debit">
                {row.calculated_interest > 0 ? formatMoney(row.calculated_interest) : '—'}
              </td>
              <td>
                <span className={`interest-status ${interestStatusClass(row.status)}`}>
                  {row.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
