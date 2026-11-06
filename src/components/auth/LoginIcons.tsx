type IconProps = {
  size?: number
  className?: string
}

export function IconUser({ size = 18, className }: IconProps): JSX.Element {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function IconLock({ size = 18, className }: IconProps): JSX.Element {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M17 9h-1V7a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2Zm-7-2a2 2 0 1 1 4 0v2h-4V7Zm7 12H7v-8h10v8Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function IconEye({ size = 18, className }: IconProps): JSX.Element {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 5c-5 0-9.3 3.1-11 7 1.7 3.9 6 7 11 7s9.3-3.1 11-7c-1.7-3.9-6-7-11-7Zm0 12a5 5 0 1 1 5-5 5 5 0 0 1-5 5Zm0-8a3 3 0 1 0 3 3 3 3 0 0 0-3-3Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function IconEyeOff({ size = 18, className }: IconProps): JSX.Element {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="m3.3 2.2-1.1 1.1 3.2 3.2C3.2 8.2 1.4 10.3.9 12c1.7 3.9 6 7 11.1 7a12 12 0 0 0 5.2-1.2l3.5 3.5 1.1-1.1ZM12 17c-3.7 0-6.9-2.1-8.5-5a10.5 10.5 0 0 1 3.5-3.7l1.6 1.6A5 5 0 0 0 12 17Zm0-10c3.7 0 6.9 2.1 8.5 5a10.6 10.6 0 0 1-2.1 2.6l-1.5-1.5A5 5 0 0 0 12 7Zm0 2a3 3 0 0 1 3 3 2.9 2.9 0 0 1-.2 1.1l-3.9-3.9A2.9 2.9 0 0 1 12 9Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function IconShield({ size = 14, className }: IconProps): JSX.Element {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2 4 5v6c0 5.2 3.4 10 8 11 4.6-1 8-5.8 8-11V5l-8-3Zm0 17.9c-3.2-.9-6-4.6-6-8.9V6.6l6-2.2 6 2.2V11c0 4.3-2.8 8-6 8.9Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function IconUsers({ size = 15, className }: IconProps): JSX.Element {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M16 11a3 3 0 1 0-3-3 3 3 0 0 0 3 3ZM8 11a3 3 0 1 0-3-3 3 3 0 0 0 3 3Zm0 2c-2.7 0-8 1.3-8 4v2h10v-2c0-1.5.8-2.7 2.1-3.5C10.8 13.2 9.3 13 8 13Zm8 0c-.4 0-.8 0-1.2.1 1.7.9 2.2 2.2 2.2 3.4v2h9v-2c0-2.7-5.3-4-10-4Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function IconPercent({ size = 15, className }: IconProps): JSX.Element {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7.5 10.5a2.5 2.5 0 1 0-2.5-2.5 2.5 2.5 0 0 0 2.5 2.5Zm9 6a2.5 2.5 0 1 0-2.5-2.5 2.5 2.5 0 0 0 2.5 2.5ZM6.2 18.8 17.8 5.2l1 1.1L7.2 19.9Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function IconCash({ size = 15, className }: IconProps): JSX.Element {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 6h18v12H3Zm2 2v8h14V8Zm7 1.5A2.5 2.5 0 1 1 9.5 12 2.5 2.5 0 0 1 12 9.5Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function IconChart({ size = 15, className }: IconProps): JSX.Element {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 19h16v2H2V3h2Zm4-2H6V10h2Zm4 0H10V6h2Zm4 0h-2V8h2Zm4 0h-2V4h2Z" fill="currentColor" />
    </svg>
  )
}
