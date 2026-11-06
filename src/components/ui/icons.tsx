import type { ReactNode } from 'react'

interface IconProps {
  size?: number
  className?: string
}

export function IconUserPlus({ size = 16, className }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M6 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-5 6v-.8c0-1.4 2.2-2.2 5-2.2s5 .8 5 2.2V14H1Zm10.5-5.5V7H10V5.5h1.5V4H13v1.5h1.5V7H13v1.5h-1.5Z"
      />
    </svg>
  )
}

export function IconCalendar({ size = 16, className }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M3 2h1v1h8V2h1v1h1a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h1V2Zm0 4v7h10V6H3Z"
      />
    </svg>
  )
}

export function IconWallet({ size = 16, className }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M2 4a1 1 0 0 1 1-1h9a2 2 0 0 1 2 2v1h1a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H2V4Zm11 4V7H2v4h11Zm-8-2h2v1H5V6Z"
      />
    </svg>
  )
}

export function IconPercent({ size = 16, className }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M4.5 5.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm7 8a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM3.1 13.9 13.9 3.1l.7.7L3.8 14.6l-.7-.7Z"
      />
    </svg>
  )
}

export function IconFileText({ size = 16, className }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M4 1h6l3 3v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1Zm5 1v3h3L9 2ZM5 6h6v1H5V6Zm0 2h6v1H5V8Zm0 2h4v1H5v-1Z"
      />
    </svg>
  )
}

export function IconChart({ size = 16, className }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M2 13V8h2v5H2Zm4-3V5h2v8H6Zm4 2V2h2v10h-2Zm4-1V6h2v7h-2Z"
      />
    </svg>
  )
}

export function IconLogout({ size = 16, className }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3v1H3a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h3v1Zm7.3 3.7-1.4-1.4L15 8l-3.1 3.7 1.4 1.4L15.8 9H8V7h7.8l-2.5-3.3Z"
      />
    </svg>
  )
}

export function IconSave({ size = 16, className }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M3 1h8l3 3v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1Zm7 1v3h2L10 2ZM4 6h8v7H4V6Z"
      />
    </svg>
  )
}

export function IconSettings({ size = 16, className }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M8 1.5a1 1 0 0 1 .9.6l.3.8 1 .3a1 1 0 0 1 .6 1.3l-.3.9.6.6.9-.3a1 1 0 0 1 1.3.6l.3 1a1 1 0 0 1-.6 1.3l-.9.3.3.9a1 1 0 0 1-1.3.6l-1-.3-.6.6.3.9a1 1 0 0 1-.6 1.3l-.8.3a1 1 0 0 1-1.3-.6l-.3-.9-.6-.6-.9.3a1 1 0 0 1-1.3-.6l-.3-1a1 1 0 0 1 .6-1.3l.9-.3-.3-.9a1 1 0 0 1 1.3-.6l1 .3.6-.6-.3-.9A1 1 0 0 1 6.2 3l1-.3.3-.8A1 1 0 0 1 8 1.5Zm0 4a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z"
      />
    </svg>
  )
}

export function IconUsers({ size = 16, className }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M6 7a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM1 13v-.7c0-1.2 2-1.8 5-1.8s5 .6 5 1.8V13H1Zm7.5-6a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM9 13v-.5c0-.9.8-1.5 2.2-1.8A5.7 5.7 0 0 0 11 9.5c-1.2 0-2.2.3-3 .8.9.4 2 1 2 2.7V13H9Z"
      />
    </svg>
  )
}

export function IconAlert({ size = 16, className }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M8 1 1 14h14L8 1Zm0 4h1v4H8V5Zm0 6h1v1H8v-1Z"
      />
    </svg>
  )
}

export function IconCheck({ size = 16, className }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className} aria-hidden>
      <path fill="currentColor" d="M6.5 11.5 2.5 7.5l1-1 3 3 6-6 1 1-7 7Z" />
    </svg>
  )
}

export function IconRotateCw({ size = 16, className }: IconProps): JSX.Element {
  return (
    <StrokeIcon size={size} className={className}>
      <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
    </StrokeIcon>
  )
}

export function IconArrowUp({ size = 16, className }: IconProps): JSX.Element {
  return (
    <StrokeIcon size={size} className={className}>
      <path d="M12 19V5" />
      <path d="m6 11 6-6 6 6" />
    </StrokeIcon>
  )
}

export function IconPower({ size = 16, className }: IconProps): JSX.Element {
  return (
    <StrokeIcon size={size} className={className}>
      <path d="M12 2v10" />
      <path d="M6.4 6.4a8 8 0 1 0 11.2 0" />
    </StrokeIcon>
  )
}

function StrokeIcon({
  size,
  className,
  children
}: IconProps & { children: ReactNode }): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  )
}

export function IconHome({ size = 16, className }: IconProps): JSX.Element {
  return (
    <StrokeIcon size={size} className={className}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 10v9h14v-9" />
    </StrokeIcon>
  )
}

export function IconTable({ size = 16, className }: IconProps): JSX.Element {
  return (
    <StrokeIcon size={size} className={className}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 10h18M9 10v10M15 10v10" />
    </StrokeIcon>
  )
}

export function IconCash({ size = 16, className }: IconProps): JSX.Element {
  return (
    <StrokeIcon size={size} className={className}>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 12h.01M18 12h.01" />
    </StrokeIcon>
  )
}

export function IconBank({ size = 16, className }: IconProps): JSX.Element {
  return (
    <StrokeIcon size={size} className={className}>
      <path d="M3 10h18M5 10v8M9 10v8M15 10v8M19 10v8M3 18h18M12 4 3 10h18L12 4Z" />
    </StrokeIcon>
  )
}

export function IconDistribution({ size = 16, className }: IconProps): JSX.Element {
  return (
    <StrokeIcon size={size} className={className}>
      <circle cx="6" cy="6" r="2.2" />
      <circle cx="18" cy="6" r="2.2" />
      <circle cx="12" cy="18" r="2.2" />
      <path d="M8 7.5 10.5 16M16 7.5 13.5 16" />
    </StrokeIcon>
  )
}

export function IconSearch({ size = 16, className }: IconProps): JSX.Element {
  return (
    <StrokeIcon size={size} className={className}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 5 5" />
    </StrokeIcon>
  )
}

export function IconUpload({ size = 16, className }: IconProps): JSX.Element {
  return (
    <StrokeIcon size={size} className={className}>
      <path d="M12 16V5" />
      <path d="m8 9 4-4 4 4" />
      <path d="M5 19h14" />
    </StrokeIcon>
  )
}

export function IconImage({ size = 16, className }: IconProps): JSX.Element {
  return (
    <StrokeIcon size={size} className={className}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="m21 16-5-5-8 8" />
    </StrokeIcon>
  )
}

export function IconDots({ size = 16, className }: IconProps): JSX.Element {
  return (
    <StrokeIcon size={size} className={className}>
      <circle cx="6" cy="12" r="1.3" />
      <circle cx="12" cy="12" r="1.3" />
      <circle cx="18" cy="12" r="1.3" />
    </StrokeIcon>
  )
}

export function IconFolder({ size = 16, className }: IconProps): JSX.Element {
  return (
    <StrokeIcon size={size} className={className}>
      <path d="M3 7h6l2 2h10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
      <path d="M3 7V5a2 2 0 0 1 2-2h4l2 2" />
    </StrokeIcon>
  )
}

export function IconBuilding({ size = 16, className }: IconProps): JSX.Element {
  return (
    <StrokeIcon size={size} className={className}>
      <path d="M4 20V6l8-3 8 3v14" />
      <path d="M9 20v-6h6v6M9 9h.01M12 9h.01M15 9h.01M9 13h.01M12 13h.01M15 13h.01" />
    </StrokeIcon>
  )
}

export function IconExcel({ size = 16, className }: IconProps): JSX.Element {
  return (
    <StrokeIcon size={size} className={className}>
      <path d="M8 4h9a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H8" />
      <path d="M8 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3" />
      <path d="m10 9 4 6M14 9l-4 6" />
    </StrokeIcon>
  )
}

export function IconUser({ size = 16, className }: IconProps): JSX.Element {
  return (
    <StrokeIcon size={size} className={className}>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 19c.8-3.2 3.4-5 7-5s6.2 1.8 7 5" />
    </StrokeIcon>
  )
}

export function IconLock({ size = 16, className }: IconProps): JSX.Element {
  return (
    <StrokeIcon size={size} className={className}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </StrokeIcon>
  )
}

export function IconEye({ size = 16, className }: IconProps): JSX.Element {
  return (
    <StrokeIcon size={size} className={className}>
      <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12Z" />
      <circle cx="12" cy="12" r="2.4" />
    </StrokeIcon>
  )
}

export function IconEyeOff({ size = 16, className }: IconProps): JSX.Element {
  return (
    <StrokeIcon size={size} className={className}>
      <path d="M3 5.5 21 19.5" />
      <path d="M9.9 8.2A4.8 4.8 0 0 1 12 8c6.4 0 10 6 10 6a17 17 0 0 1-3.6 3.6" />
      <path d="M6.1 10.4A16 16 0 0 0 2 14s3.6 6 10 6c1.3 0 2.5-.2 3.6-.6" />
    </StrokeIcon>
  )
}

export function IconShield({ size = 16, className }: IconProps): JSX.Element {
  return (
    <StrokeIcon size={size} className={className}>
      <path d="M12 3 5 6v6c0 4.2 2.8 7.2 7 8.5 4.2-1.3 7-4.3 7-8.5V6l-7-3Z" />
    </StrokeIcon>
  )
}

export function IconBell({ size = 16, className }: IconProps): JSX.Element {
  return (
    <StrokeIcon size={size} className={className}>
      <path d="M6 9a6 6 0 1 1 12 0c0 7 2 8 2 8H4s2-1 2-8" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </StrokeIcon>
  )
}

export function IconExpand({ size = 16, className }: IconProps): JSX.Element {
  return (
    <StrokeIcon size={size} className={className}>
      <path d="M9 4H4v5" />
      <path d="M15 4h5v5" />
      <path d="M20 15v5h-5" />
      <path d="M4 15v5h5" />
    </StrokeIcon>
  )
}

export function IconCollapse({ size = 16, className }: IconProps): JSX.Element {
  return (
    <StrokeIcon size={size} className={className}>
      <path d="M9 4v5H4" />
      <path d="M15 4v5h5" />
      <path d="M20 15h-5v5" />
      <path d="M4 15h5v5" />
    </StrokeIcon>
  )
}

export function IconExternal({ size = 16, className }: IconProps): JSX.Element {
  return (
    <StrokeIcon size={size} className={className}>
      <path d="M14 5h5v5" />
      <path d="M19 5l-9 9" />
      <path d="M11 5H6a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5" />
    </StrokeIcon>
  )
}

export function IconClose({ size = 16, className }: IconProps): JSX.Element {
  return (
    <StrokeIcon size={size} className={className}>
      <path d="M6 6l12 12M18 6 6 18" />
    </StrokeIcon>
  )
}

export function IconInfo({ size = 16, className }: IconProps): JSX.Element {
  return (
    <StrokeIcon size={size} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10v6" />
      <path d="M12 7h.01" />
    </StrokeIcon>
  )
}

const ribbonIconMap = {
  'user-plus': IconUserPlus,
  calendar: IconCalendar,
  wallet: IconWallet,
  percent: IconPercent,
  'file-text': IconFileText,
  chart: IconChart,
  save: IconSave,
  settings: IconSettings,
  'file-excel': IconExcel,
  home: IconHome,
  table: IconTable,
  users: IconUsers,
  cash: IconCash,
  bank: IconBank,
  distribution: IconDistribution
} as const

export function RibbonIcon({
  name,
  size = 20
}: {
  name: keyof typeof ribbonIconMap
  size?: number
}): JSX.Element {
  const Icon = ribbonIconMap[name] ?? IconUserPlus
  return <Icon size={size} />
}

const navIconMap = {
  home: IconHome,
  table: IconTable,
  users: IconUsers,
  percent: IconPercent,
  cash: IconCash,
  bank: IconBank,
  distribution: IconDistribution,
  chart: IconChart,
  settings: IconSettings,
  save: IconSave,
  'file-text': IconFileText,
  calendar: IconCalendar,
  wallet: IconWallet,
  building: IconBuilding,
  folder: IconFolder
} as const

export function NavIcon({
  name,
  size = 18
}: {
  name?: keyof typeof navIconMap
  size?: number
}): JSX.Element {
  const Icon = (name && navIconMap[name]) || IconHome
  return <Icon size={size} />
}
