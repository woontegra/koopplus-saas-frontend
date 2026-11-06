import type { Partner, PartnerInput } from '@shared/types'
import { toNumericId } from './idMap'

/** SaaS camelCase partner → masaüstü snake_case + numeric id */
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
    interest_special_periods: Array.isArray(raw.interest_special_periods)
      ? (raw.interest_special_periods as Partner['interest_special_periods'])
      : [],
    linked_members: Array.isArray(raw.linked_members)
      ? (raw.linked_members as Partner['linked_members'])
      : [],
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

/** PartnerInput → SaaS write body (özel dönem / bağlı üye bilinçli atlanır). */
export function toSaasWriteBody(input: PartnerInput): Record<string, unknown> {
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
    notes: input.notes ?? null
  }
}
