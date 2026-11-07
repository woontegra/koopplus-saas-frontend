export type MembershipRole = 'ADMIN' | 'STAFF' | 'VIEWER'

export type AuthUser = {
  id: string
  email: string
  fullName: string
  isActive: boolean
  has_security_question?: boolean
  /** Platform tarafından verilen geçici şifre — uygulamaya girmeden değiştirilmeli. */
  mustChangePassword?: boolean
  /** Platform süper admin (User.isPlatformAdmin) — kooperatif ADMIN'den bağımsız. */
  isPlatformAdmin?: boolean
}

export type AuthMembership = {
  id: string
  tenantId: string
  role: MembershipRole
  tenant: {
    id: string
    name: string
    status: string
    isDemo?: boolean
    /** ISO tarih — kullanım süresi sonu (yoksa sınırsız). */
    usageExpiresAt?: string | null
    demoExpiresAt?: string | null
    licenseActivatedAt?: string | null
    licensePending?: boolean
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

export type PlatformContact = {
  phone: string
  email: string
  whatsapp: string | null
}

export type AccessBlock = {
  reason: string
  title: string
  message: string
  tenantName: string
  suspensionReason?: string | null
  contact: PlatformContact
}

export type LoginResponse = {
  token: string
  /** Uzun ömürlü yenileme jetonu — httpOnly cookie yok (cross-origin); localStorage. */
  refreshToken?: string | null
  user: AuthUser
  memberships: AuthMembership[]
  accessBlock?: AccessBlock | null
}

export type RefreshResponse = {
  token: string
  refreshToken: string
}

export type MeResponse = {
  user: AuthUser
  memberships: AuthMembership[]
  accessBlock?: AccessBlock | null
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
