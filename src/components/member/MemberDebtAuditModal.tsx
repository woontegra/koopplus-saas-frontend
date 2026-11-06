import type { MemberDebtAudit } from '@shared/types'
import { formatDate, formatMoney } from '../../utils/format'

interface MemberDebtAuditModalProps {
  audit: MemberDebtAudit
  partnerNo: string
  fullName: string
  asOfDate: string
  onClose: () => void
}

export default function MemberDebtAuditModal({
  audit,
  partnerNo,
  fullName,
  asOfDate,
  onClose
}: MemberDebtAuditModalProps): JSX.Element {
  const hasAllocations = audit.payment_allocations.length > 0

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--tall" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h3>Hesap Dökümü — {partnerNo} / {fullName}</h3>
          <button type="button" className="btn btn-xs" onClick={onClose}>
            Kapat
          </button>
        </div>

        <div className="modal-body">
          <p className="debt-audit__intro">
            Rapor tarihi: {formatDate(asOfDate)} — Bu ekran hesabı değiştirmez, sadece ödemelerin
            nereye gittiğini gösterir.
          </p>

          <div className={`debt-audit__verdict ${audit.is_balanced ? 'is-ok' : 'is-warning'}`}>
            {audit.is_balanced ? (
              <>
                <strong>Hesap tutarlı.</strong> Aradaki fark aşağıdaki kalemlerle tamamen
                açıklanmaktadır.
              </>
            ) : (
              <>
                <strong>Hesap farkı açıklanamıyor.</strong> Açıklanamayan tutar:{' '}
                {formatMoney(Math.abs(audit.unexplained_difference))}. Lütfen hesap denetimini
                kontrol edin.
              </>
            )}
          </div>

          <h4 className="debt-audit__section-title">Fark Nereden Geliyor?</h4>
          <table className="data-table debt-audit__table">
            <tbody>
              <tr>
                <td>Toplam Aidat</td>
                <td className="money debit text-right">{formatMoney(audit.total_due_amount)}</td>
              </tr>
              <tr>
                <td>Toplam Ödeme</td>
                <td className="money credit text-right">{formatMoney(audit.total_payment_amount)}</td>
              </tr>
              <tr>
                <td>Basit fark (Toplam Aidat − Toplam Ödeme)</td>
                <td className="money text-right">{formatMoney(audit.simple_difference)}</td>
              </tr>
              <tr>
                <td>Faize mahsup edilen ödeme</td>
                <td className="money text-right">+ {formatMoney(audit.payment_to_interest)}</td>
              </tr>
              {audit.payment_to_extra_debt > 0.005 && (
                <tr>
                  <td>Ek borca mahsup edilen ödeme</td>
                  <td className="money text-right">+ {formatMoney(audit.payment_to_extra_debt)}</td>
                </tr>
              )}
              {audit.carried_forward_credit > 0.005 && (
                <tr>
                  <td>Devreden ödeme (üyenin alacağı)</td>
                  <td className="money text-right">+ {formatMoney(audit.carried_forward_credit)}</td>
                </tr>
              )}
              <tr className="debt-audit__table-total">
                <td>Kalan Ana Para</td>
                <td className="money debit text-right">{formatMoney(audit.remaining_principal)}</td>
              </tr>
              {!audit.is_balanced && (
                <tr className="debt-audit__table-warning">
                  <td>Açıklanamayan fark</td>
                  <td className="money debit text-right">
                    {formatMoney(audit.unexplained_difference)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <ul className="debt-audit__explanations">
            {audit.explanations.map((line, index) => (
              <li key={index}>{line}</li>
            ))}
          </ul>

          <h4 className="debt-audit__section-title">Ödeme Dağılımı</h4>
          {hasAllocations ? (
            <div className="table-wrap table-wrap--scroll">
              <table className="data-table debt-audit__table">
                <thead>
                  <tr>
                    <th>Tarih</th>
                    <th>İşlem</th>
                    <th className="text-right">Tutar</th>
                    <th className="text-right">Faize Mahsup</th>
                    <th className="text-right">Ana Paraya Mahsup</th>
                    <th className="text-right">Ek Borca Mahsup</th>
                    <th className="text-right">Devreden</th>
                    <th>Açıklama</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.payment_allocations.map((row) => (
                    <tr key={row.payment_id}>
                      <td>{formatDate(row.payment_date)}</td>
                      <td>Ödeme</td>
                      <td className="money credit text-right">{formatMoney(row.payment_amount)}</td>
                      <td className="money text-right">{formatMoney(row.applied_to_interest)}</td>
                      <td className="money text-right">{formatMoney(row.applied_to_principal)}</td>
                      <td className="money text-right">{formatMoney(row.applied_to_extra_debt)}</td>
                      <td className="money text-right">{formatMoney(row.carried_forward)}</td>
                      <td className="debt-audit__note">{row.note}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2}>
                      <strong>TOPLAM</strong>
                    </td>
                    <td className="money credit text-right">
                      <strong>{formatMoney(audit.total_payment_amount)}</strong>
                    </td>
                    <td className="money text-right">
                      <strong>{formatMoney(audit.payment_to_interest)}</strong>
                    </td>
                    <td className="money text-right">
                      <strong>{formatMoney(audit.payment_to_principal)}</strong>
                    </td>
                    <td className="money text-right">
                      <strong>{formatMoney(audit.payment_to_extra_debt)}</strong>
                    </td>
                    <td className="money text-right">
                      <strong>{formatMoney(audit.carried_forward_credit)}</strong>
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <p className="debt-audit__intro">Bu üye için kayıtlı ödeme bulunmuyor.</p>
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
