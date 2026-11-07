import { useNavChrome } from '../../context/NavChromeContext'

export default function NavBackdrop(): JSX.Element | null {
  const { navOpen, closeNav } = useNavChrome()
  if (!navOpen) return null
  return <button type="button" className="nav-backdrop" aria-label="Menüyü kapat" onClick={closeNav} />
}
