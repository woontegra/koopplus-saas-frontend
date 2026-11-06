import koopPlusLogo from '../../assets/brand/KoopPlusLogo.png'

interface BrandLogoProps {
  className?: string
}

export default function BrandLogo({ className }: BrandLogoProps): JSX.Element {
  return (
    <img src={koopPlusLogo} alt="KoopPlus" className={className} draggable={false} />
  )
}
