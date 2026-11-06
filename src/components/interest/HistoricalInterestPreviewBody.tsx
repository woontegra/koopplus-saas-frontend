import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { HistoricalInterestPreviewResult } from '../../shared/types'
import EmptyState from '../ui/EmptyState'
import StatPanel from '../ui/StatPanel'
import { formatMoney, MONTH_NAMES } from '../../utils/format'
import { interestStatusClass, isApplicableInterestStatus } from './historicalInterestUi'
import { useActionToast } from '../../hooks/useActionToast'
import { useAskDialog } from '../../hooks/useAskDialog'

interface HistoricalInterestPreviewBodyProps {
  preview: HistoricalInterestPreviewResult | null
  loadingPreview: boolean
  partnerId: number
  ledgerEntryId: number
  endDate: string
  onPreviewRefresh: () => void
}

export default function HistoricalInterestPreviewBody({
  preview,
  loadingPreview,
  onPreviewRefresh
}: HistoricalInterestPreviewBodyProps): JSX.Element {
  const toast = useActionToast()
  const ask = useAskDialog()
  const [creatingPolicy, setCreatingPolicy] = useState(false)
  const [policyMessage, setPolicyMessage] = useState('')

  const handleCreateMissingPolicy = async (): Promise<void> => {
    if (!preview || preview.missing_policy_years.length === 0) return

    const confirmMsg = `${preview.missing_policy_years.join(', ')} yılları için aylık %5 aktif faiz kararı oluşturulacak. Devam edilsin mi?`
    if (!(await ask.confirm(confirmMsg))) return

    setCreatingPolicy(true)
    setPolicyMessage('')
    const res = await window.api.interestPolicies.createForYears({
      years: preview.missing_policy_years,
      monthly_rate: 5,
      is_active: 1,
      description_prefix: 'Geçmiş gecikme faizi'
    })
    setCreatingPolicy(false)

    if (res.success && res.data) {
      setPolicyMessage(res.data.message)
      toast.success('Faiz kararı kaydedildi', res.data.message)
      onPreviewRefresh()
    } else {
      setPolicyMessage(res.error ?? 'Faiz kararları eklenemedi')
      toast.fail('Faiz kararı kaydedilemedi', res.error)
    }
  }

  if (loadingPreview && !preview) {
    return <div className="page-loading">Geçmiş dönem faizi hesaplanıyor...</div>
  }

  if (!preview) {
    return <EmptyState message="Ön izleme yüklenemedi." compact />
  }

  const showPolicyGap = Boolean(preview.policy_gap_warning)

  return (
    <>
      {showPolicyGap && (
        <div className="alert alert-policy-gap">
          <strong>Faiz kararı eksik dönemler var</strong>
          <p>{preview.policy_gap_warning}</p>
          {preview.missing_policy_years.length > 0 && (
            <p className="alert-policy-gap__detail">
              Eksik yıllar: {preview.missing_policy_years.join(', ')}
            </p>
          )}
          <div className="alert-policy-gap__actions">
            {preview.missing_policy_years.length > 0 && (
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={handleCreateMissingPolicy}
                disabled={creatingPolicy}
              >
                {creatingPolicy ? 'Ekleniyor...' : 'Eksik Yıllara %5 Karar Ekle'}
              </button>
            )}
            <Link to="/ayarlar?section=interest" className="btn btn-sm">
              Faiz Kararlarına Git
            </Link>
          </div>
        </div>
      )}

      {policyMessage && (
        <div
          className={`alert ${policyMessage.includes('eklenemedi') ? 'alert-error' : 'alert-success'}`}
        >
          {policyMessage}
        </div>
      )}

      <div className="interest-summary-grid interest-summary-grid--compact">
        <StatPanel label="Geciken ay" value={preview.summary.total_months} />
        <StatPanel label="Faiz hesaplanan ay" value={preview.summary.applicable_count} variant="accent" />
        <StatPanel
          label="Eksik karar ayı"
          value={preview.summary.missing_policy_count}
          variant={preview.summary.missing_policy_count > 0 ? 'debit' : undefined}
        />
        <StatPanel label="Toplam faiz" value={formatMoney(preview.summary.total_interest)} variant="debit" />
        <StatPanel label="Ana borç + faiz" value={formatMoney(preview.total_debt)} variant="debit" />
      </div>

      {loadingPreview ? (
        <div className="page-loading">Ay bazlı faiz tablosu hesaplanıyor...</div>
      ) : preview.rows.length === 0 ? (
        <EmptyState message="Hesaplanacak faiz ayı bulunamadı." compact />
      ) : (
        <div className="table-wrap table-wrap--compact table-wrap--scroll-tall">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ay/Yıl</th>
                <th className="text-right">Kalan Ana Borç</th>
                <th className="text-right">Faiz Oranı</th>
                <th className="text-right">Faiz Tutarı</th>
                <th>Durum</th>
              </tr>
            </thead>
            <tbody>
              {preview.rows.map((row) => (
                <tr
                  key={`${row.interest_period_year}-${row.interest_period_month}`}
                  className={isApplicableInterestStatus(row.status) ? 'row-risk' : 'row-muted'}
                >
                  <td>
                    {MONTH_NAMES[row.interest_period_month - 1]} {row.interest_period_year}
                  </td>
                  <td className="money debit">{formatMoney(row.remaining_principal)}</td>
                  <td className="text-right">
                    {row.interest_rate > 0 ? `%${row.interest_rate}` : '—'}
                  </td>
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
      )}
    </>
  )
}

