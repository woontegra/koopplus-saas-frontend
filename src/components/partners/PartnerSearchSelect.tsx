import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { PartnerListItem } from '../../api/types'

type Props = {
  partners: PartnerListItem[]
  value: string
  onChange: (partnerId: string) => void
  disabled?: boolean
  placeholder?: string
}

function partnerLabel(partner: PartnerListItem): string {
  return `${partner.partnerNo} — ${partner.fullName}`
}

function matches(partner: PartnerListItem, query: string): boolean {
  const q = query.trim().toLocaleLowerCase('tr-TR')
  if (!q) return true
  return (
    partner.partnerNo.toLocaleLowerCase('tr-TR').includes(q) ||
    partner.fullName.toLocaleLowerCase('tr-TR').includes(q)
  )
}

const MAX_VISIBLE = 50
const DROPDOWN_Z = 10050

export default function PartnerSearchSelect({
  partners,
  value,
  onChange,
  disabled = false,
  placeholder = 'Üye no, ad soyad ile ara...'
}: Props): JSX.Element {
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 })

  const selected = useMemo(
    () => partners.find((p) => p.id === value) ?? null,
    [partners, value]
  )

  const filtered = useMemo(() => partners.filter((p) => matches(p, query)), [partners, query])
  const visible = useMemo(() => filtered.slice(0, MAX_VISIBLE), [filtered])

  useEffect(() => {
    if (selected && !open) setQuery(partnerLabel(selected))
    if (!selected && !open) setQuery('')
  }, [selected, open])

  const updateCoords = (): void => {
    const el = inputRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setCoords({ top: rect.bottom + 2, left: rect.left, width: rect.width })
  }

  useLayoutEffect(() => {
    if (!open || disabled) return
    updateCoords()
  }, [open, disabled, query, visible.length])

  useEffect(() => {
    if (!open || disabled) return
    const reposition = (): void => updateCoords()
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)
    return () => {
      window.removeEventListener('resize', reposition)
      window.removeEventListener('scroll', reposition, true)
    }
  }, [open, disabled])

  useEffect(() => {
    if (disabled) return
    const onDown = (event: MouseEvent): void => {
      const target = event.target as Node
      if (!rootRef.current?.contains(target) && !listRef.current?.contains(target)) {
        setOpen(false)
        if (selected) setQuery(partnerLabel(selected))
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [disabled, selected])

  const pick = (id: string): void => {
    onChange(id)
    setOpen(false)
    const partner = partners.find((p) => p.id === id)
    if (partner) setQuery(partnerLabel(partner))
  }

  const clear = (): void => {
    onChange('')
    setQuery('')
    setOpen(false)
  }

  return (
    <div
      ref={rootRef}
      className={open ? 'partner-search partner-search--open' : 'partner-search'}
    >
      <input
        ref={inputRef}
        id={listId}
        className="partner-search__input"
        type="search"
        role="combobox"
        aria-expanded={open}
        aria-controls={`${listId}-list`}
        aria-autocomplete="list"
        disabled={disabled}
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          setHighlight(0)
        }}
        onFocus={() => {
          if (!disabled) {
            setOpen(true)
            updateCoords()
          }
        }}
        onKeyDown={(e) => {
          if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
            setOpen(true)
            return
          }
          if (e.key === 'Escape') {
            setOpen(false)
            if (selected) setQuery(partnerLabel(selected))
            return
          }
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setHighlight((i) => Math.min(i + 1, visible.length - 1))
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault()
            setHighlight((i) => Math.max(i - 1, 0))
          }
          if (e.key === 'Enter' && open && visible[highlight]) {
            e.preventDefault()
            pick(visible[highlight].id)
          }
          if (e.key === 'Backspace' && !query && value) clear()
        }}
      />
      {open && !disabled
        ? createPortal(
            <ul
              ref={listRef}
              id={`${listId}-list`}
              className="partner-search__list"
              role="listbox"
              style={{
                position: 'fixed',
                top: coords.top,
                left: coords.left,
                width: coords.width,
                zIndex: DROPDOWN_Z
              }}
            >
              <li>
                <button type="button" className="partner-search__option" onClick={clear}>
                  Seçin...
                </button>
              </li>
              {visible.length === 0 ? (
                <li className="partner-search__empty">Üye bulunamadı</li>
              ) : (
                visible.map((partner, index) => (
                  <li key={partner.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={partner.id === value}
                      className={
                        index === highlight
                          ? 'partner-search__option partner-search__option--active'
                          : 'partner-search__option'
                      }
                      onMouseEnter={() => setHighlight(index)}
                      onClick={() => pick(partner.id)}
                    >
                      {partnerLabel(partner)}
                      {!partner.isActive ? ' (Pasif)' : ''}
                    </button>
                  </li>
                ))
              )}
              {filtered.length > MAX_VISIBLE ? (
                <li className="partner-search__empty">
                  +{filtered.length - MAX_VISIBLE} sonuç daha — aramayı daraltın
                </li>
              ) : null}
            </ul>,
            document.body
          )
        : null}
    </div>
  )
}
