import type { MembershipRole } from '../api/types'

export function roleLabel(role: MembershipRole): string {
  switch (role) {
    case 'ADMIN':
      return 'Yönetici'
    case 'STAFF':
      return 'Personel'
    case 'VIEWER':
      return 'İzleyici'
    default:
      return role
  }
}

/** Masaüstü adminOnly menü öğeleri — yalnızca ADMIN. */
export function canSeeAdminOnly(role: MembershipRole | null | undefined): boolean {
  return role === 'ADMIN'
}

/** Backend WRITE seviyesi: ADMIN | STAFF. VIEWER yalnız okur. */
export function canWriteMembers(role: MembershipRole | null | undefined): boolean {
  return role === 'ADMIN' || role === 'STAFF'
}
