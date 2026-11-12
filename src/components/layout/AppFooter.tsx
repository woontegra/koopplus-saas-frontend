import { APP_VERSION, DEVELOPER_CREDIT } from '@shared/branding'
import type { Settings } from '@shared/types'
import { formatDateTime, formatMonthYear } from '../../utils/format'
import { resolveActivePeriod } from '../../utils/usage'

interface AppFooterProps {
  settings: Settings | null
}

export default function AppFooter({ settings }: AppFooterProps): JSX.Element {
  const { month: activeMonth, year: activeYear } = resolveActivePeriod()
  const periodLabel = formatMonthYear(activeMonth, activeYear)

  const lastBackup = settings?.last_backup_date
  const backupLabel =
    lastBackup && lastBackup !== 'Henüz yedek alınmadı'
      ? formatDateTime(lastBackup)
      : '—'

  return (
    <footer className="app-footer">
      <div className="app-footer__left">
        <span>Veritabanı: Bulut</span>
        <span className="app-footer__sep">·</span>
        <span>Aktif Dönem: {periodLabel}</span>
        <span className="app-footer__sep">·</span>
        <span>Sürüm: {APP_VERSION}</span>
        <span className="app-footer__sep">·</span>
        <span className="app-footer__backup">Son yedek: {backupLabel}</span>
      </div>
      <div className="app-footer__right">
        <span className="app-footer__credit">{DEVELOPER_CREDIT}</span>
      </div>
    </footer>
  )
}
