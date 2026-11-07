import koopPlusLogo from '../../assets/brand/KoopPlusLogo.png'
import koopPlusLogoOnDark from '../../assets/brand/KoopPlusLogo-onDark.png'

interface BrandLogoProps {
  className?: string
  /** Koyu zemin (sidebar, mobil çekmece, login sol panel). */
  variant?: 'default' | 'onDark'
}

export default function BrandLogo({ className, variant = 'default' }: BrandLogoProps): JSX.Element {
  const src = variant === 'onDark' ? koopPlusLogoOnDark : koopPlusLogo
  const classes = [className, variant === 'onDark' ? 'brand-logo--on-dark' : null]
    .filter(Boolean)
    .join(' ')
  return <img src={src} alt="KoopPlus" className={classes} draggable={false} />
}
