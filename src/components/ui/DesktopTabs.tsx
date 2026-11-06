interface DesktopTabsProps<T extends string> {
  tabs: Array<{ key: T; label: string }>
  active: T
  onChange: (key: T) => void
}

export default function DesktopTabs<T extends string>({
  tabs,
  active,
  onChange
}: DesktopTabsProps<T>): JSX.Element {
  return (
    <div className="desktop-tabs" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={active === tab.key}
          className={`desktop-tabs__tab${active === tab.key ? ' desktop-tabs__tab--active' : ''}`}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
