import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react'
import { useLocation } from 'react-router-dom'

type NavChromeValue = {
  navOpen: boolean
  openNav: () => void
  closeNav: () => void
  toggleNav: () => void
}

const NavChromeContext = createContext<NavChromeValue | null>(null)

/** Sol menü çekmecesi — 1024px altında hamburger ile. */
export function NavChromeProvider({ children }: { children: ReactNode }): JSX.Element {
  const [navOpen, setNavOpen] = useState(false)
  const location = useLocation()

  const closeNav = useCallback(() => setNavOpen(false), [])
  const openNav = useCallback(() => setNavOpen(true), [])
  const toggleNav = useCallback(() => setNavOpen((v) => !v), [])

  // Rota değişince menüyü kapat
  useEffect(() => {
    setNavOpen(false)
  }, [location.pathname])

  // Masaüstüne geçince kapat; Escape ile kapat
  useEffect(() => {
    const onResize = (): void => {
      if (window.matchMedia('(min-width: 1025px)').matches) setNavOpen(false)
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setNavOpen(false)
    }
    window.addEventListener('resize', onResize)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  useEffect(() => {
    if (!navOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [navOpen])

  const value = useMemo(
    () => ({ navOpen, openNav, closeNav, toggleNav }),
    [navOpen, openNav, closeNav, toggleNav]
  )

  return <NavChromeContext.Provider value={value}>{children}</NavChromeContext.Provider>
}

export function useNavChrome(): NavChromeValue {
  const ctx = useContext(NavChromeContext)
  if (!ctx) {
    return {
      navOpen: false,
      openNav: () => undefined,
      closeNav: () => undefined,
      toggleNav: () => undefined
    }
  }
  return ctx
}
