import type { CashEntryType } from './types'

export const CASH_CATEGORY_OTHER = 'Diğer'

/** Manuel ofis kasası gelir kategorileri */
export const CASH_INCOME_CATEGORIES = [
  'Nakit Giriş',
  'Banka Girişi',
  'Devir Geliri',
  CASH_CATEGORY_OTHER
] as const

/** Manuel ofis kasası gider kategorileri */
export const CASH_EXPENSE_CATEGORIES = [
  'Kırtasiye',
  'Noter',
  'Avukat',
  'Muhasebe',
  'Banka Masrafı',
  'Bakım / Onarım',
  'Temizlik',
  'Personel',
  'Ulaşım',
  'Fatura / Abonelik',
  CASH_CATEGORY_OTHER
] as const

/** Üye ödemesinden otomatik oluşan kasa kayıtları için (manuel formda gösterilmez) */
export const CASH_AUTO_MEMBER_PAYMENT_CATEGORY = 'Üye Tahsilatı'

/** Hesap kesimi ile oluşan devreden bakiye kaydı */
export const CASH_CARRY_FORWARD_CATEGORY = 'Devreden Bakiye'

export const MEMBER_EXTRA_DEBT_TYPE_LABELS: Record<string, string> = {
  NOTARY_NOTICE: 'Noter Tebligat Gideri',
  SEREFIYE: 'Şerefiye Payı',
  OTHER: 'Diğer Masraf / Borç'
}

export function resolveCashCategory(selected: string, customName?: string | null): string {
  if (selected === CASH_CATEGORY_OTHER) {
    const custom = customName?.trim()
    if (!custom) throw new Error('Diğer kategori adı zorunludur')
    return custom
  }
  if (!selected?.trim()) throw new Error('Kategori zorunludur')
  return selected.trim()
}

export function isPresetCashCategory(category: string, entryType: CashEntryType): boolean {
  const presets = entryType === 'INCOME' ? CASH_INCOME_CATEGORIES : CASH_EXPENSE_CATEGORIES
  return (presets as readonly string[]).includes(category)
}

export function splitCashCategoryForForm(
  category: string,
  entryType: CashEntryType
): { category: string; otherCategoryName: string } {
  if (isPresetCashCategory(category, entryType)) {
    return { category, otherCategoryName: '' }
  }
  return { category: CASH_CATEGORY_OTHER, otherCategoryName: category }
}
