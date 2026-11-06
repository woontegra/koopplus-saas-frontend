import type { MemberDebtRowPaymentAllocation, MemberDebtTableRow } from '@shared/types'
import { formatDate, formatMoney } from '../../utils/format'

export type MemberDebtRowAllocationSource = Pick<
  MemberDebtTableRow,
  | 'period_label'
  | 'period_month'
  | 'period_year'
  | 'monthly_due'
  | 'remaining_due'
  | 'due_date'
  | 'paid_principal_on_time'
  | 'paid_principal_late'
  | 'paid_amount'
  | 'accrued_interest_total'
  | 'paid_interest_total'
  | 'remaining_interest'
  | 'delay_interest'
  | 'total_collection_used_for_period'
  | 'closing_date'
  | 'row_status_label'
  | 'payment_allocations'
  | 'interest_accrual_events'
  | 'source_interest_accruals'
  | 'closed_by_later_payments'
>

interface MemberDebtRowAllocationModalProps {
  row: MemberDebtRowAllocationSource
  onClose: () => void
}

function periodLabel(month: number, year: number): string {
  const names = [
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
  ]
  return `${names[month - 1] ?? month}.${String(year).slice(-2)}`
}

function periodLabelLong(month: number, year: number): string {
  const names = [
    'Ocak',
    'Şubat',
    'Mart',
    'Nisan',
    'Mayıs',
    'Haziran',
    'Temmuz',
    'Ağustos',
    'Eylül',
    'Ekim',
    'Kasım',
    'Aralık'
  ]
  return `${names[month - 1] ?? month} ${year}`
}

export default function MemberDebtRowAllocationModal({
  row,
  onClose
}: MemberDebtRowAllocationModalProps): JSX.Element {
  const allocations = row.payment_allocations ?? []
  const principalTotal =
    row.paid_amount ??
    allocations.reduce((sum, item) => sum + item.applied_to_this_due_principal, 0)
  const monthAccruals = row.interest_accrual_events ?? []
  const sourceAccruals = row.source_interest_accruals ?? []
  const sourceAccruedElsewhere = sourceAccruals.filter(
    (event) =>
      event.accrual_period_year !== row.period_year ||
      event.accrual_period_month !== row.period_month
  )

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--wide" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h3>{periodLabelLong(row.period_month, row.period_year)} Mahsup Detayı</h3>
          <button type="button" className="btn btn-xs" onClick={onClose}>
            Kapat
          </button>
        </div>

        <div className="modal-body">
          <table className="data-table debt-audit__table">
            <tbody>
              <tr>
                <td>Aidat Tutarı</td>
                <td className="money debit text-right">{formatMoney(row.monthly_due)}</td>
              </tr>
              <tr>
                <td>Son Ödeme Tarihi</td>
                <td className="text-right">{formatDate(row.due_date)}</td>
              </tr>
              <tr>
                <td>Vadesinde Mahsup</td>
                <td className="money credit text-right">
                  {formatMoney(row.paid_principal_on_time ?? 0)}
                </td>
              </tr>
              <tr>
                <td>Sonradan Mahsup</td>
                <td className="money credit text-right">
                  {formatMoney(row.paid_principal_late ?? 0)}
                </td>
              </tr>
              <tr>
                <td>Dönem Faizi</td>
                <td className="money text-right">
                  {formatMoney(row.accrued_interest_total ?? 0)}
                </td>
              </tr>
              <tr>
                <td>Faize Mahsup Edilen</td>
                <td className="money credit text-right">
                  {formatMoney(row.paid_interest_total ?? 0)}
                </td>
              </tr>
              <tr>
                <td>Ana Paraya Mahsup Edilen</td>
                <td className="money credit text-right">{formatMoney(principalTotal)}</td>
              </tr>
              <tr>
                <td>Kalan Ana Para</td>
                <td className="money text-right">
                  {formatMoney(row.remaining_due)}
                </td>
              </tr>
              <tr>
                <td>Dönem Sonu Kalan Faiz</td>
                <td className="money debit text-right">
                  {formatMoney(row.remaining_interest ?? 0)}
                </td>
              </tr>
              {row.closing_date && (
                <tr>
                  <td>Kapanış Tarihi</td>
                  <td className="text-right">{formatDate(row.closing_date)}</td>
                </tr>
              )}
              {row.row_status_label && (
                <tr>
                  <td>Durum</td>
                  <td className="text-right">{row.row_status_label}</td>
                </tr>
              )}
            </tbody>
          </table>

          {sourceAccruedElsewhere.length > 0 && (
            <p className="debt-audit__intro" style={{ marginTop: 10 }}>
              Bu aidattan doğan{' '}
              {formatMoney(
                sourceAccruedElsewhere.reduce((sum, event) => sum + event.accrued_interest_amount, 0)
              )}{' '}
              gecikme faizi{' '}
              {sourceAccruedElsewhere
                .map(
                  (event) =>
                    periodLabel(event.accrual_period_month, event.accrual_period_year)
                )
                .filter((label, index, arr) => arr.indexOf(label) === index)
                .join(', ')}{' '}
              döneminde tahakkuk etmiştir; bu ayın “Bu Ay İşleyen Faiz” toplamına eklenmez.
            </p>
          )}

          {row.closed_by_later_payments && (
            <p className="debt-audit__intro" style={{ marginTop: 10 }}>
              Bu aidat, sonraki tarihli ödemelerle kapatılmıştır.
            </p>
          )}

          <h4 className="debt-audit__section-title">Ödeme Dağılım Listesi</h4>
          {allocations.length === 0 ? (
            <p className="debt-audit__intro">Bu aidata henüz mahsup edilen ödeme yok.</p>
          ) : (
            <div className="table-wrap table-wrap--scroll">
              <table className="data-table debt-audit__table">
                <thead>
                  <tr>
                    <th>Ödeme Tarihi</th>
                    <th className="text-right">Gerçek Ödeme Tutarı</th>
                    <th className="text-right">Bu Dönem Ana Parasına Mahsup</th>
                    <th className="text-right">Bu Dönem Faizine Mahsup</th>
                    <th>Kaynak</th>
                    <th>Açıklama</th>
                  </tr>
                </thead>
                <tbody>
                  {allocations
                    .filter((item) => item.applied_to_this_due_principal > 0.005)
                    .map((item: MemberDebtRowPaymentAllocation) => (
                      <tr
                        key={`${item.payment_id}-${item.payment_date}-${item.applied_to_this_due_principal}`}
                      >
                        <td>{formatDate(item.payment_date)}</td>
                        <td className="money credit text-right">
                          {formatMoney(item.payment_amount)}
                        </td>
                        <td className="money text-right">
                          {formatMoney(item.applied_to_this_due_principal)}
                        </td>
                        <td className="money text-right">
                          {formatMoney(item.applied_to_this_due_interest ?? 0)}
                        </td>
                        <td>{item.source}</td>
                        <td className="debt-audit__note">
                          {item.description?.trim() || item.note || '—'}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
          {monthAccruals.length > 0 && (
            <p className="debt-audit__intro" style={{ marginTop: 10 }}>
              Bu dönemde {formatMoney(monthAccruals.reduce((sum, e) => sum + e.accrued_interest_amount, 0))}{' '}
              faiz tahakkuku oluştu.
            </p>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn" onClick={onClose}>
            Kapat
          </button>
        </div>
      </div>
    </div>
  )
}
