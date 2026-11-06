import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { InterestPolicy } from '../../shared/types'

interface InterestPolicyInfoBarProps {
  calculationDate: string
  missingYears?: number[]
}

function policyCoversYear(policy: InterestPolicy, year: number): boolean {
  return policy.start_date <= `${year}-12-31` && policy.end_date >= `${year}-01-01`
}

function policyLabelForYear(policies: InterestPolicy[], year: number): string | null {
  const active = policies.find(
    (policy) =>
      policy.is_active === 1 &&
      policy.monthly_rate > 0 &&
      policyCoversYear(policy, year)
  )
  if (!active) return null
  return `${year} yılı aylık %${active.monthly_rate}`
}

export default function InterestPolicyInfoBar({
  calculationDate,
  missingYears = []
}: InterestPolicyInfoBarProps): JSX.Element {
  const [policies, setPolicies] = useState<InterestPolicy[]>([])

  useEffect(() => {
    window.api.interestPolicies.list().then((res) => {
      if (res.success && res.data) setPolicies(res.data)
    })
  }, [])

  const calcYear = useMemo(
    () => new Date(`${calculationDate}T12:00:00`).getFullYear(),
    [calculationDate]
  )

  const activeLabel = useMemo(
    () => policyLabelForYear(policies, calcYear),
    [policies, calcYear]
  )

  const missingYearText =
    missingYears.length > 0
      ? `${missingYears.join(' ve ')} yılları için faiz kararı bulunmadığından bu yıllara faiz hesaplanmaz.`
      : null

  return (
    <div className="interest-policy-info">
      {activeLabel ? (
        <span>Aktif faiz kararı: {activeLabel}</span>
      ) : (
        <span className="interest-policy-info__warn">
          {calcYear} yılı için aktif faiz kararı bulunamadı.
        </span>
      )}
      {missingYearText && (
        <span className="interest-policy-info__warn">{missingYearText}</span>
      )}
      <Link to="/ayarlar?section=interest" className="interest-policy-info__link">
        Faiz Kararları
      </Link>
    </div>
  )
}
