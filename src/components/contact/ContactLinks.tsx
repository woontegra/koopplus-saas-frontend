import type { PlatformContact } from '../../api/types'

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '')
}

function telHref(phone: string): string {
  const d = digitsOnly(phone)
  return d ? `tel:+${d.startsWith('0') ? '90' + d.slice(1) : d}` : `tel:${phone.trim()}`
}

function waHref(whatsapp: string): string {
  let d = digitsOnly(whatsapp)
  if (d.startsWith('0') && d.length === 11) d = `90${d.slice(1)}`
  return `https://wa.me/${d}`
}

/** Telefon / e-posta / WhatsApp bağlantıları — şerit ve engel ekranı. */
export function ContactLinks({
  contact,
  className = ''
}: {
  contact: PlatformContact | null | undefined
  className?: string
}): JSX.Element | null {
  if (!contact) return null
  const phone = contact.phone?.trim()
  const email = contact.email?.trim()
  const whatsapp = contact.whatsapp?.trim()
  if (!phone && !email && !whatsapp) return null

  return (
    <span className={`contact-links ${className}`.trim()}>
      {phone ? (
        <a className="contact-links__item" href={telHref(phone)}>
          {phone}
        </a>
      ) : null}
      {email ? (
        <a className="contact-links__item" href={`mailto:${email}`}>
          {email}
        </a>
      ) : null}
      {whatsapp ? (
        <a
          className="contact-links__item"
          href={waHref(whatsapp)}
          target="_blank"
          rel="noopener noreferrer"
        >
          WhatsApp
        </a>
      ) : null}
    </span>
  )
}
