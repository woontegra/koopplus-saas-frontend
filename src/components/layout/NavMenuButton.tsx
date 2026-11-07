import { useNavChrome } from '../../context/NavChromeContext'

/** Üst bar hamburger — 1024px altında görünür. */
export default function NavMenuButton(): JSX.Element {
  const { navOpen, toggleNav } = useNavChrome()
  return (
    <button
      type="button"
      className={`nav-menu-btn${navOpen ? ' is-open' : ''}`}
      aria-label={navOpen ? 'Menüyü kapat' : 'Menüyü aç'}
      aria-expanded={navOpen}
      aria-controls="app-sidebar"
      onClick={toggleNav}
    >
      <span className="nav-menu-btn__bars" aria-hidden>
        <span />
        <span />
        <span />
      </span>
    </button>
  )
}
