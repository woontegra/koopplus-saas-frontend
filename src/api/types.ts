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
