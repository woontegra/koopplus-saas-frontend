/**
 * Tam UI dashboard yardımcısı — SaaS’ta SimpleDashboardPage getSummary kullanır.
 * Bu dosya eski full-dashboard bileşenleri için güvenli stub sağlar.
 */
import type { DashboardStats, Partner } from '@shared/types'

export interface DashboardTaskItem {
  id: string
  level: 'warning' | 'info' | 'ok'
  title: string
  detail: string
}

export interface RecentLedgerRow {
  id: number
  entry_date: string
  partner_no: string
  partner_name: string
  description: string | null
  debit: number
  credit: number
}

export interface DashboardData {
  stats: DashboardStats
  topDebtors: Partner[]
  recentEntries: RecentLedgerRow[]
  tasks: DashboardTaskItem[]
}

export async function loadDashboardData(): Promise<DashboardData> {
  const [statsResult, partnersResult] = await Promise.all([
    window.api.dashboard.stats(),
    window.api.partners.list({ is_active: 1 })
  ])

  const stats =
    statsResult.success && statsResult.data
      ? statsResult.data
      : {
          total_partners: 0,
          active_partners: 0,
          total_receivable: 0,
          total_collected_this_month: 0,
          overdue_count: 0
        }

  const partners = partnersResult.success && partnersResult.data ? partnersResult.data : []
  const topDebtors = [...partners]
    .filter((p) => (p.balance ?? 0) > 0)
    .sort((a, b) => (b.balance ?? 0) - (a.balance ?? 0))
    .slice(0, 8)

  const tasks: DashboardTaskItem[] = []
  if (partners.length === 0) {
    tasks.push({
      id: 'no-partners',
      level: 'warning',
      title: 'Aktif üye kaydı yok',
      detail: 'Aidat takibine başlamak için önce üye kartı oluşturun.'
    })
  }

  return {
    stats,
    topDebtors,
    recentEntries: [],
    tasks
  }
}
