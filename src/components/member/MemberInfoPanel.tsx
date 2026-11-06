import type { Partner } from '@shared/types'
import { formatShareRatioTr, resolveShareRatio } from '@shared/shareRatio'
import StatusBadge from '../ui/StatusBadge'
import { formatDate } from '../../utils/format'
import { entityNoLabel } from '../../utils/entityLabels'

interface MemberInfoPanelProps {
  partner: Partner
  variant?: 'compact' | 'full'
}

function displayValue(value: string | null | undefined): string {
  return value?.trim() ? value.trim() : '—'
}

function cityDistrict(partner: Partner): string {
  const city = partner.city?.trim()
  const district = partner.district?.trim()
  if (city && district) return `${city} / ${district}`
  return city || district || '—'
}

export default function MemberInfoPanel({
  partner,
  variant = 'compact'
}: MemberInfoPanelProps): JSX.Element {
  const shareRatio = resolveShareRatio(partner.share_ratio, partner.share_count)
  const shareRatioLabel = formatShareRatioTr(shareRatio)

  if (variant === 'compact') {
    return (
      <div className="member-info-panel member-info-panel--compact">
        <div className="member-info-panel__meta">
          <span>Pay Oranı: {shareRatioLabel}</span>
          <span className="member-info-panel__sep">|</span>
          <span>Telefon: {displayValue(partner.phone)}</span>
          <span className="member-info-panel__sep">|</span>
          <span>E-posta: {displayValue(partner.email)}</span>
          <span className="member-info-panel__sep">|</span>
          <span>İl/İlçe: {cityDistrict(partner)}</span>
          <span className="member-info-panel__sep">|</span>
          <span>Giriş Tarihi: {partner.join_date ? formatDate(partner.join_date) : '—'}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="member-info-panel member-info-panel--full">
      <div className="member-info-panel__grid">
        <div className="member-info-panel__field">
          <span className="member-info-panel__label">{entityNoLabel}</span>
          <span className="member-info-panel__value">{partner.partner_no}</span>
        </div>
        <div className="member-info-panel__field">
          <span className="member-info-panel__label">Ad Soyad / Ünvan</span>
          <span className="member-info-panel__value">{partner.full_name}</span>
        </div>
        <div className="member-info-panel__field">
          <span className="member-info-panel__label">Pay Oranı</span>
          <span className="member-info-panel__value">{shareRatioLabel}</span>
        </div>
        <div className="member-info-panel__field">
          <span className="member-info-panel__label">T.C. / Vergi No</span>
          <span className="member-info-panel__value">{displayValue(partner.tax_id)}</span>
        </div>
        <div className="member-info-panel__field">
          <span className="member-info-panel__label">Telefon</span>
          <span className="member-info-panel__value">{displayValue(partner.phone)}</span>
        </div>
        <div className="member-info-panel__field">
          <span className="member-info-panel__label">E-posta</span>
          <span className="member-info-panel__value">{displayValue(partner.email)}</span>
        </div>
        <div className="member-info-panel__field">
          <span className="member-info-panel__label">Giriş Tarihi</span>
          <span className="member-info-panel__value">
            {partner.join_date ? formatDate(partner.join_date) : '—'}
          </span>
        </div>
        <div className="member-info-panel__field member-info-panel__field--wide">
          <span className="member-info-panel__label">Ev Adresi</span>
          <span className="member-info-panel__value">{displayValue(partner.address)}</span>
        </div>
        <div className="member-info-panel__field">
          <span className="member-info-panel__label">İl / İlçe</span>
          <span className="member-info-panel__value">{cityDistrict(partner)}</span>
        </div>
        <div className="member-info-panel__field">
          <span className="member-info-panel__label">Durum</span>
          <span className="member-info-panel__value">
            <StatusBadge active={partner.is_active === 1} />
          </span>
        </div>
        <div className="member-info-panel__field member-info-panel__field--wide">
          <span className="member-info-panel__label">Açıklama / Not</span>
          <span className="member-info-panel__value member-info-panel__value--notes">
            {displayValue(partner.notes)}
          </span>
        </div>
      </div>
    </div>
  )
}
