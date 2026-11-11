import type { InterestRunDetail } from '../../shared/types'
import { entitySingular } from '../../utils/entityLabels'
import { formatDate, formatMoney, formatPeriod } from '../../utils/format'
import EmptyState from '../ui/EmptyState'

interface InterestRunDetailModalProps {
  detail: InterestRunDetail
  onClose: () => void
}

export default function InterestRunDetailModal({
  detail,
  onClose
}: InterestRunDetailModalProps): JSX.Element {
  const { run, policy, items } = detail
  const periodLabel = formatPeriod(run.period_year, run.period_month)
  const policyText = policy
    ? `${formatDate(policy.start_date)} — ${formatDate(policy.end_date)} | %${policy.monthly_rate}`
    : '—'

  return (
    <div className="modal-overlay">
      <div className="modal interest-run-detail-modal">
        <header className="interest-run-detail-modal__header">
          <div className="interest-run-detail-modal__header-main">
            <div className="interest-run-detail-modal__title-row">
              <h3 className="interest-run-detail-modal__title">Faiz İşlem Detayı</h3>
              <span className="interest-run-detail-modal__period-badge">{periodLabel}</span>
              <button type="button" className="btn btn-sm" onClick={onClose}>
                Kapat
              </button>
            </div>
            <p className="interest-run-detail-modal__subtitle">
              İşlenen gecikme faizi özeti ve satır detayları
            </p>
          </div>
        </header>

        <div className="modal-body interest-run-detail-modal__body">
          <div className="interest-run-detail-modal__summary">
            <div className="interest-run-detail-modal__summary-card">
              <span className="interest-run-detail-modal__summary-label">
                {run.interest_written_through
                  ? `${formatDate(run.interest_written_through)}'ya kadar yazılan faiz`
                  : 'Yazılma ufku'}
              </span>
              <span className="interest-run-detail-modal__summary-value">
                {run.interest_written_through
                  ? formatDate(run.interest_written_through)
                  : formatDate(run.calculation_date)}
              </span>
            </div>
            <div className="interest-run-detail-modal__summary-card">
              <span className="interest-run-detail-modal__summary-label">Faiz Oranı</span>
              <span className="interest-run-detail-modal__summary-value">%{run.interest_rate}</span>
            </div>
            <div className="interest-run-detail-modal__summary-card">
              <span className="interest-run-detail-modal__summary-label">{entitySingular} Sayısı</span>
              <span className="interest-run-detail-modal__summary-value">
                {run.affected_partner_count}
              </span>
            </div>
            <div className="interest-run-detail-modal__summary-card interest-run-detail-modal__summary-card--debit">
              <span className="interest-run-detail-modal__summary-label">Toplam Ana Borç</span>
              <span className="interest-run-detail-modal__summary-value money debit">
                {formatMoney(run.total_principal)}
              </span>
            </div>
            <div className="interest-run-detail-modal__summary-card interest-run-detail-modal__summary-card--debit">
              <span className="interest-run-detail-modal__summary-label">
                İşlenen toplam faiz (ödenenler dahil)
              </span>
              <span className="interest-run-detail-modal__summary-value money debit">
                {formatMoney(run.total_interest)}
              </span>
            </div>
          </div>

          <div className="interest-run-detail-modal__info">
            <div className="interest-run-detail-modal__info-title">İşlem Bilgisi</div>
            <div className="interest-run-detail-modal__info-rows">
              <div className="interest-run-detail-modal__info-row">
                <span className="interest-run-detail-modal__info-label">Politika</span>
                <span className="interest-run-detail-modal__info-value">{policyText}</span>
              </div>
              <div className="interest-run-detail-modal__info-row">
                <span className="interest-run-detail-modal__info-label">Açıklama</span>
                <span className="interest-run-detail-modal__info-value">
                  {run.description || '—'}
                </span>
              </div>
            </div>
          </div>

          <section className="interest-run-detail-modal__table-section">
            <h4 className="interest-run-detail-modal__table-title">İşlenen Faiz Satırları</h4>
            {items.length === 0 ? (
              <EmptyState message="Detay satırı bulunamadı." compact />
            ) : (
              <div className="interest-run-detail-modal__table-wrap">
                <table className="data-table interest-run-detail-modal__table">
                  <thead>
                    <tr>
                      <th>{entitySingular}</th>
                      <th>Tahakkuk Dönemi</th>
                      <th className="text-right">Ana Borç</th>
                      <th className="text-right">Kalan Borç</th>
                      <th className="text-right">Oran</th>
                      <th className="text-right">Faiz</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.ledger_entry_id}>
                        <td className="interest-run-detail-modal__partner-cell">
                          <span className="interest-run-detail-modal__partner-no">
                            {item.partner_no}
                          </span>
                          <span className="interest-run-detail-modal__partner-sep"> — </span>
                          <span className="interest-run-detail-modal__partner-name">
                            {item.full_name}
                          </span>
                        </td>
                        <td>
                          {formatPeriod(item.accrual_period_year, item.accrual_period_month)}
                        </td>
                        <td className="text-right money debit">
                          {formatMoney(item.principal_amount)}
                        </td>
                        <td className="text-right money debit">
                          {formatMoney(item.remaining_principal)}
                        </td>
                        <td className="text-right">%{item.interest_rate}</td>
                        <td className="text-right money debit">
                          {formatMoney(item.interest_amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <footer className="modal-footer interest-run-detail-modal__footer">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Tamam
          </button>
        </footer>
      </div>
    </div>
  )
}
