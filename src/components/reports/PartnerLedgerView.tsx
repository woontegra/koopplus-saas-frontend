import type { PartnerLedgerReport } from '@shared/types'
import type { PartnerCurrentAccountStatementModel } from '@shared/partnerStatementModels'
import DataPanel from '../ui/DataPanel'
import EmptyState from '../ui/EmptyState'
import StatPanel from '../ui/StatPanel'
import { formatDate, formatMoney } from '../../utils/format'

interface PartnerLedgerViewProps {
  data: PartnerLedgerReport
}

function moneyOrDash(value: number): string {
  return value > 0.005 ? formatMoney(value) : '—'
}

function StatementBody({
  statement
}: {
  statement: PartnerCurrentAccountStatementModel
}): JSX.Element {
  const { closing_summary: summary, events, period } = statement

  return (
    <div className="partner-ledger-view partner-ledger-view--statement">
      <p className="partner-ledger-view__purpose muted">
        Üyenin borcunun tarih tarih hangi işlemlerle oluştuğunu ve nasıl azaldığını gösterir.
      </p>

      <div className="reports-summary partner-ledger-summary-cards partner-ledger-summary-cards--compact">
        <StatPanel label="Dönem" value={period.label} />
        <StatPanel label="Dönem Başı Bakiyesi" value={formatMoney(summary.opening_balance)} />
        <StatPanel
          label="Dönemde Tahakkuk Eden Aidat ve Faiz"
          value={formatMoney(summary.period_accrued_dues_and_interest)}
          variant="debit"
        />
        <StatPanel
          label="Dönemde Yapılan Gerçek Tahsilat"
          value={formatMoney(summary.period_real_collections)}
          variant="credit"
        />
        <StatPanel
          label="Vadesi Geçmiş Kalan Aidat"
          value={formatMoney(summary.overdue_remaining_principal)}
        />
        <StatPanel
          label="Kalan Gecikme Faizi"
          value={formatMoney(summary.remaining_interest)}
          variant={summary.remaining_interest > 0 ? 'debit' : undefined}
        />
        <StatPanel
          label="Bugün Ödenmesi Gereken"
          value={formatMoney(summary.amount_due_today)}
          variant={summary.amount_due_today > 0 ? 'debit' : undefined}
          size="hero"
        />
        <StatPanel
          label="Vadesi Gelmeyen Aidat"
          value={formatMoney(summary.not_yet_due_principal)}
        />
        <StatPanel
          label="Tüm Dönemler Genel Toplam"
          value={formatMoney(summary.all_periods_total_debt)}
        />
      </div>

      <div className="debt-schedule-equation partner-ledger-equations">
        <div>
          <strong>Vadesi Geçmiş Kalan Aidat + Kalan Gecikme Faizi = Bugün Ödenmesi Gereken</strong>
          <div className="debt-schedule-equation__values">{summary.equation_today_due_label}</div>
        </div>
        <div>
          <strong>Bugün Ödenmesi Gereken + Vadesi Gelmeyen Aidat = Tüm Dönemler Genel Toplam</strong>
          <div className="debt-schedule-equation__values">{summary.equation_all_periods_label}</div>
        </div>
      </div>

      <DataPanel title="Cari Hareketler" subtitle="Kronolojik işlem listesi" noPadding>
        {events.length === 0 ? (
          <EmptyState message="Seçilen dönemde hareket bulunamadı." />
        ) : (
          <div className="table-wrap">
            <table className="data-table partner-ledger-statement-table">
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>İşlem Türü</th>
                  <th>Açıklama</th>
                  <th className="num">Borç</th>
                  <th className="num">Gerçek Ödeme</th>
                  <th className="num">Kalan Ana Para</th>
                  <th className="num">Kalan Faiz</th>
                  <th className="num">Toplam Bakiye</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.sort_key}>
                    <td className="nowrap">{formatDate(event.event_date)}</td>
                    <td>{event.event_type_label}</td>
                    <td className="partner-ledger-statement-table__desc">{event.description}</td>
                    <td className="num nowrap">{moneyOrDash(event.debit_amount)}</td>
                    <td className="num nowrap">{moneyOrDash(event.payment_amount)}</td>
                    <td className="num nowrap">{formatMoney(event.principal_balance)}</td>
                    <td className="num nowrap">{formatMoney(event.interest_balance)}</td>
                    <td className="num nowrap">{formatMoney(event.total_balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DataPanel>
    </div>
  )
}

export default function PartnerLedgerView({ data }: PartnerLedgerViewProps): JSX.Element {
  if (!data.current_account) {
    return (
      <EmptyState message="Cari ekstre verisi üretilemedi. Üye borç tablosunu kontrol edin." />
    )
  }

  return <StatementBody statement={data.current_account} />
}
