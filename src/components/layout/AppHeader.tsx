type AppHeaderProps = {
  pageTitle: string
}

export default function AppHeader({ pageTitle }: AppHeaderProps): JSX.Element {
  const now = new Date()
  const dayNumber = String(now.getDate())
  const monthYear = now.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })
  const weekday = now.toLocaleDateString('tr-TR', { weekday: 'long' })
  const periodLabel = now.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })

  return (
    <header className="app-header">
      <div className="app-header__main">
        <div className="app-header__brand">
          <div className="app-header__brand-icon" aria-hidden>
            K+
          </div>
          <div className="app-header__brand-text">
            <div className="app-header__coop">KoopPlus SaaS</div>
            <div className="app-header__program">{pageTitle}</div>
          </div>
        </div>

        <div className="app-header__meta" title={now.toLocaleDateString('tr-TR')}>
          <div className="app-header__clock">
            <span className="app-header__day">{dayNumber}</span>
            <div className="app-header__date-block">
              <span className="app-header__date">{monthYear}</span>
              <span className="app-header__weekday">{weekday}</span>
            </div>
          </div>
          <div className="app-header__period">
            <span className="app-header__period-label">Aktif dönem</span>
            <strong>{periodLabel}</strong>
          </div>
        </div>
      </div>
    </header>
  )
}
