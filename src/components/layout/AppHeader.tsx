import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Settings } from '@shared/types'
import type { AuthContextUser } from '../../auth/AuthContext'
import { useCooperatives } from '../../context/CooperativeContext'
import { formatMonthYear } from '../../utils/format'
import { IconBuilding } from '../ui/icons'
import NavMenuButton from './NavMenuButton'
import ProfileMenu from './ProfileMenu'

interface AppHeaderProps {
  settings: Settings | null
  pageTitle: string
  user: AuthContextUser
  onLogout: () => void
}

export default function AppHeader({ settings, pageTitle }: AppHeaderProps): JSX.Element {
  const now = new Date()
  const activeMonth = Number(settings?.active_period_month) || now.getMonth() + 1
  const activeYear = Number(settings?.active_period_year) || now.getFullYear()
  const periodLabel = formatMonthYear(activeMonth, activeYear)
  const day = now.getDate()
  const monthName = now.toLocaleDateString('tr-TR', { month: 'long' })
  const year = now.getFullYear()
  const weekday = now.toLocaleDateString('tr-TR', { weekday: 'long' })
  const infoLine = `${day} ${monthName} ${year}, ${weekday} · Aktif dönem: ${periodLabel}`

  const coopName = settings?.cooperative_name?.trim()

  return (
    <header className="app-header">
      <div className="app-header__main">
        <div className="app-header__brand">
          <NavMenuButton />
          <CooperativeSwitcher fallbackName={coopName || pageTitle} />
        </div>

        <p className="app-header__meta" title={infoLine}>
          {infoLine}
        </p>
        <ProfileMenu />
      </div>
    </header>
  )
}

function CooperativeSwitcher({ fallbackName }: { fallbackName: string }): JSX.Element {
  const navigate = useNavigate()
  const { cooperatives, currentId, openCooperative } = useCooperatives()
  const [open, setOpen] = useState(false)
  const [switching, setSwitching] = useState(false)
  const [error, setError] = useState('')
  const rootRef = useRef<HTMLDivElement | null>(null)

  const current = cooperatives.find((item) => item.id === currentId)
  const label = current?.name || fallbackName

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: MouseEvent): void => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const handleOpen = async (id: string): Promise<void> => {
    if (id === currentId) {
      setOpen(false)
      return
    }
    setSwitching(true)
    setError('')
    try {
      await openCooperative(id)
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kooperatif açılamadı')
    } finally {
      setSwitching(false)
    }
  }

  const visible = [...cooperatives].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'ACTIVE' ? -1 : 1
    return a.name.localeCompare(b.name, 'tr')
  })

  return (
    <div className="coop-switcher" ref={rootRef}>
      <button
        type="button"
        className={`coop-switcher__trigger${open ? ' is-open' : ''}`}
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Kooperatif değiştir"
      >
        <span className="app-header__brand-icon" aria-hidden>
          <IconBuilding size={22} />
        </span>
        <span className="app-header__brand-text">
          <span className="app-header__coop">{label}</span>
          <span className="app-header__program">Kooperatif değiştir</span>
        </span>
        <span className="coop-switcher__chevron" aria-hidden />
      </button>

      {open && (
        <div className="coop-switcher__menu" role="listbox">
          <div className="coop-switcher__heading">Kooperatif Değiştir</div>
          {error && <div className="coop-switcher__error">{error}</div>}
          <div className="coop-switcher__list">
            {visible.map((item) => {
              const isCurrent = item.id === currentId
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`coop-switcher__item${isCurrent ? ' is-current' : ''}${item.status === 'ARCHIVED' ? ' is-archived' : ''}`}
                  disabled={switching}
                  onClick={() => void handleOpen(item.id)}
                >
                  <span className="coop-switcher__item-name">{item.name}</span>
                  <span className="coop-switcher__item-meta">
                    {item.status === 'ARCHIVED' ? 'Arşiv' : 'Aktif'}
                    {isCurrent ? ' · Şu anda açık' : ''}
                  </span>
                  {isCurrent && <span className="coop-switcher__check">✓</span>}
                </button>
              )
            })}
          </div>
          <div className="coop-switcher__footer">
            <button
              type="button"
              className="coop-switcher__link"
              onClick={() => {
                setOpen(false)
                navigate('/kooperatifler')
              }}
            >
              Tüm Kooperatifler
            </button>
            <button
              type="button"
              className="coop-switcher__link coop-switcher__link--accent"
              onClick={() => {
                setOpen(false)
                navigate('/kooperatifler?action=new')
              }}
            >
              + Yeni Kooperatif
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
