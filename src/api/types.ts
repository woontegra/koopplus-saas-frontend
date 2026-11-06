export type MembershipRole = 'ADMIN' | 'STAFF' | 'VIEWER'

export type AuthUser = {
  id: string
  email: string
  fullName: string
  isActive: boolean
}

export type AuthMembership = {
  id: string
  tenantId: string
  role: MembershipRole
  tenant: {
    id: string
    name: string
    status: string
  }
}

export type ApiSuccess<T> = {
  success: true
  data: T
}

export type ApiFailure = {
  success: false
  error: string
}

export type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure

export type LoginResponse = {
  token: string
  user: AuthUser
  memberships: AuthMembership[]
}

export type MeResponse = {
  user: AuthUser
  memberships: AuthMembership[]
}

/** GET /api/partners liste satırı (slim). */
export type PartnerListItem = {
  id: string
  tenantId: string
  partnerNo: string
  fullName: string
  isActive: boolean
}

/** GET/PUT/POST partner detayı — balance yalnız backend hesaplar. */
export type Partner = {
  id: string
  tenantId: string
  partnerNo: string
  fullName: string
  taxId: string | null
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  district: string | null
  joinDate: string | null
  birthDate: string | null
  memberType: string | null
  shareCount: number | null
  shareRatio: number
  openingBalance: number
  interestExempt: boolean
  interestExemptNote: string | null
  notes: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  balance?: number
}

export type PartnerWriteInput = {
  partnerNo: string
  fullName: string
  taxId?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  city?: string | null
  district?: string | null
  joinDate?: string | null
  birthDate?: string | null
  memberType?: string | null
  shareRatio?: number
  shareCount?: number
  isActive?: boolean
  openingBalance?: number
  interestExempt?: boolean
  interestExemptNote?: string | null
  notes?: string | null
}

export type PartnerListResponse = {
  tenantId: string
  role: MembershipRole
  partners: PartnerListItem[]
}

export type PartnerDeletePreview = {
  dueCount: number
  paymentCount: number
  hasRecords: boolean
}
