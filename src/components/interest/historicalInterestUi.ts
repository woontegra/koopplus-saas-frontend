import type { InterestPreviewStatus } from '../../shared/types'

export function interestStatusClass(status: InterestPreviewStatus | string): string {
  if (status === 'Faiz hesaplanacak' || status === 'Faiz uygulanacak') return 'interest-status--apply'
  if (status === 'Daha önce işlenmiş') return 'interest-status--done'
  if (status === 'Son ödeme tarihi geçmemiş' || status === 'Vadesi geçmemiş') {
    return 'interest-status--pending'
  }
  if (status === 'Bu ay için faiz kararı tanımlı değil' || status === 'Bu aralıkta faiz yok') {
    return 'interest-status--nopolicy'
  }
  return 'interest-status--paid'
}

export function isApplicableInterestStatus(status: InterestPreviewStatus | string): boolean {
  return status === 'Faiz hesaplanacak' || status === 'Faiz uygulanacak'
}
