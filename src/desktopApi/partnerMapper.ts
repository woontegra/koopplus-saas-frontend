import type {
  MemberInterestSpecialPeriod,
  MemberInterestSpecialPeriodInput,
  Partner,
  PartnerInput,
  PartnerLinkedMember,
  PartnerLinkedMemberInput
} from '@shared/types'
import { toCuid, toNumericId } from './idMap'

function mapSpecialPeriods(
  tenantId: string,
  raw: unknown
): MemberInterestSpecialPeriod[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item) => {
    const row = item as Record<string, unknown>
    const cuid = String(row.id ?? '')
    const memberCuid = String(row.member_id ?? row.partner_id ?? row.partnerId ?? '')
    return {
      id: cuid ? toNumericId(tenantId, `period:${cuid}`) : 0,
      member_id: memberCuid ? toNumericId(tenantId, memberCuid) : 0,
      start_date: String(row.start_date ?? row.startDate ?? ''),
      end_date: String(row.end_date ?? row.endDate ?? ''),
      action_type: (row.action_type ?? row.actionType ?? 'NO_INTEREST') as MemberInterestSpecialPeriod['action_type'],
      custom_interest_rate:
        row.custom_interest_rate != null
          ? Number(row.custom_interest_rate)
          : row.customInterestRate != null
            ? Number(row.customInterestRate)
            : null,
      note: (row.note ?? null) as string | null,
      created_at: String(row.created_at ?? row.createdAt ?? ''),
      updated_at: String(row.updated_at ?? row.updatedAt ?? '')
    }
  })
}

function mapLinkedMembers(tenantId: string, raw: unknown): PartnerLinkedMember[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item) => {
    const row = item as Record<string, unknown>
    const cuid = String(row.id ?? '')
    const partnerCuid = String(row.partner_id ?? row.partnerId ?? '')
    const linkedCuid = String(row.linked_partner_id ?? row.linkedPartnerId ?? '')
    return {
      id: cuid ? toNumericId(tenantId, `link:${cuid}`) : 0,
      partner_id: partnerCuid ? toNumericId(tenantId, partnerCuid) : 0,
      linked_partner_id: linkedCuid ? toNumericId(tenantId, linkedCuid) : 0,
      linked_partner_no: String(row.linked_partner_no ?? row.linkedPartnerNo ?? ''),
      linked_partner_name: String(row.linked_partner_name ?? row.linkedPartnerName ?? ''),
      relationship_type: (row.relationship_type ??
        row.relationshipType ??
        'OTHER') as PartnerLinkedMember['relationship_type'],
      default_split_amount:
        row.default_split_amount != null
          ? Number(row.default_split_amount)
          : row.defaultSplitAmount != null
            ? Number(row.defaultSplitAmount)
            : null,
      note: (row.note ?? null) as string | null
    }
  })
}

/** SaaS partner → masaüstü snake_case + numeric id */
export function toDesktopPartner(
  tenantId: string,
  raw: Record<string, unknown>,
  extras?: { debt_balance?: number; balance?: number; carried_forward_credit?: number }
): Partner {
  const cuid = String(raw.id ?? '')
  const id = toNumericId(tenantId, cuid)
  const shareRatio = Number(raw.shareRatio ?? raw.share_ratio ?? 1)
  const isActiveRaw = raw.isActive ?? raw.is_active
  const isActive =
    isActiveRaw === true || isActiveRaw === 1 || isActiveRaw === '1' ? 1 : 0

  return {
    id,
    partner_no: String(raw.partnerNo ?? raw.partner_no ?? ''),
    full_name: String(raw.fullName ?? raw.full_name ?? ''),
    tax_id: (raw.taxId ?? raw.tax_id ?? null) as string | null,
    phone: (raw.phone ?? null) as string | null,
    email: (raw.email ?? null) as string | null,
    address: (raw.address ?? null) as string | null,
    city: (raw.city ?? null) as string | null,
    district: (raw.district ?? null) as string | null,
    join_date: (raw.joinDate ?? raw.join_date ?? null) as string | null,
    birth_date: (raw.birthDate ?? raw.birth_date ?? null) as string | null,
    member_type: (raw.memberType ?? raw.member_type ?? null) as string | null,
    share_count: (raw.shareCount ?? raw.share_count ?? shareRatio) as number | null,
    share_ratio: shareRatio,
    is_active: isActive,
    opening_balance: Number(raw.openingBalance ?? raw.opening_balance ?? 0),
    notes: (raw.notes ?? null) as string | null,
    interest_exempt: raw.interestExempt === true || raw.interest_exempt === 1 ? 1 : 0,
    interest_exempt_note: (raw.interestExemptNote ?? raw.interest_exempt_note ?? null) as
      | string
      | null,
    created_at: String(raw.createdAt ?? raw.created_at ?? ''),
    updated_at: String(raw.updatedAt ?? raw.updated_at ?? ''),
    interest_special_periods: mapSpecialPeriods(tenantId, raw.interest_special_periods),
    linked_members: mapLinkedMembers(tenantId, raw.linked_members),
    balance: extras?.balance ?? (raw.balance as number | undefined),
    debt_balance:
      extras?.debt_balance ??
      (raw.debtBalance as number | undefined) ??
      (raw.debt_balance as number | undefined),
    carried_forward_credit:
      extras?.carried_forward_credit ??
      (raw.carriedForwardCredit as number | undefined) ??
      (raw.carried_forward_credit as number | undefined)
  }
}

function periodsToSaas(
  periods: MemberInterestSpecialPeriodInput[] | undefined
): Record<string, unknown>[] | undefined {
  if (periods === undefined) return undefined
  return periods.map((period) => ({
    start_date: period.start_date,
    end_date: period.end_date,
    action_type: period.action_type,
    custom_interest_rate: period.custom_interest_rate ?? null,
    note: period.note ?? null
  }))
}

function linksToSaas(
  tenantId: string,
  links: PartnerLinkedMemberInput[] | undefined
): Record<string, unknown>[] | undefined {
  if (links === undefined) return undefined
  return links.map((link) => {
    const cuid = toCuid(tenantId, link.linked_partner_id)
    return {
      linked_partner_id: cuid ?? String(link.linked_partner_id),
      relationship_type: link.relationship_type,
      default_split_amount: link.default_split_amount ?? null,
      note: link.note ?? null
    }
  })
}

/** PartnerInput → SaaS write body (özel dönem + bağlı üye dahil). */
export function toSaasWriteBody(tenantId: string, input: PartnerInput): Record<string, unknown> {
  return {
    partnerNo: input.partner_no,
    fullName: input.full_name,
    taxId: input.tax_id ?? null,
    phone: input.phone ?? null,
    email: input.email ?? null,
    address: input.address ?? null,
    city: input.city ?? null,
    district: input.district ?? null,
    joinDate: input.join_date ?? null,
    birthDate: input.birth_date ?? null,
    memberType: input.member_type ?? null,
    shareRatio: input.share_ratio ?? input.share_count ?? 1,
    shareCount: input.share_count ?? input.share_ratio ?? 1,
    isActive: input.is_active === undefined ? true : Boolean(input.is_active),
    openingBalance: input.opening_balance ?? 0,
    interestExempt: Boolean(input.interest_exempt),
    interestExemptNote: input.interest_exempt_note ?? null,
    notes: input.notes ?? null,
    interest_special_periods: periodsToSaas(input.interest_special_periods),
    linked_members: linksToSaas(tenantId, input.linked_members)
  }
}
