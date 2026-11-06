import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Partner } from '@shared/types'
import { filterPartnersBySearch } from '@shared/searchText'

interface PartnerSearchSelectProps {
  partners: Partner[]
  value: number | ''
  onChange: (partnerId: number | '') => void
  disabled?: boolean
  placeholder?: string
  compact?: boolean
  allowEmpty?: boolean
  emptyLabel?: string
  id?: string
}

interface DropdownCoords {
  top: number
  left: number
  width: number
}

function partnerLabel(partner: Partner): string {
  return `${partner.partner_no} — ${partner.full_name}`
}

/** Açılır listede aynı anda gösterilecek en fazla kayıt (performans için). */
const MAX_VISIBLE_OPTIONS = 50

/** Modal overlay (5000) ve nested stacking context üstünde görünmeli. */
const DROPDOWN_LAYER_Z_INDEX = 10050

export default function PartnerSearchSelect({
  partners,
  value,
  onChange,
  disabled = false,
  placeholder = 'Üye no, ad soyad veya TC ile ara...',
  compact = false,
  allowEmpty = true,
  emptyLabel = 'Seçin...',
  id
}: PartnerSearchSelectProps): JSX.Element {
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(0)
  const [coords, setCoords] = useState<DropdownCoords>({ top: 0, left: 0, width: 0 })

  const selectedPartner = useMemo(
    () => partners.find((partner) => partner.id === value) ?? null,
    [partners, value]
  )

  const filtered = useMemo(() => {
    const trimmed = query.trim()
    if (!trimmed) return partners
    return filterPartnersBySearch(partners, trimmed)
  }, [partners, query])

  const visible = useMemo(() => filtered.slice(0, MAX_VISIBLE_OPTIONS), [filtered])
  const hiddenCount = filtered.length - visible.length

  const updateCoords = (): void => {
    const input = inputRef.current
    if (!input) return
    const rect = input.getBoundingClientRect()
    setCoords({
      top: rect.bottom + 2,
      left: rect.left,
      width: rect.width
    })
  }

  useEffect(() => {
    if (!open) return
    setHighlightIndex(0)
  }, [query, open])

  useEffect(() => {
    if (disabled) setOpen(false)
  }, [disabled])

  useLayoutEffect(() => {
    if (!open || disabled) return
    updateCoords()
  }, [open, disabled, query, visible.length])

  useEffect(() => {
    if (!open || disabled) return

    const handleReposition = (): void => {
      updateCoords()
    }

    window.addEventListener('resize', handleReposition)
    // Nested scroll (workspace__content vb.) için capture
    window.addEventListener('scroll', handleReposition, true)
    return () => {
      window.removeEventListener('resize', handleReposition)
      window.removeEventListener('scroll', handleReposition, true)
    }
  }, [open, disabled])

  useEffect(() => {
    if (disabled) return
    const handlePointerDown = (event: MouseEvent): void => {
      const target = event.target as Node
      const inRoot = rootRef.current?.contains(target) ?? false
      const inList = listRef.current?.contains(target) ?? false
      if (!inRoot && !inList) {
        setOpen(false)
        if (selectedPartner) setQuery(partnerLabel(selectedPartner))
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [disabled, selectedPartner])

  useEffect(() => {
    if (selectedPartner) {
      setQuery(partnerLabel(selectedPartner))
    } else if (!open) {
      setQuery('')
    }
  }, [selectedPartner, open])

  const selectPartner = (partner: Partner | null): void => {
    if (!partner) {
      onChange('')
      setQuery('')
    } else {
      onChange(partner.id)
      setQuery(partnerLabel(partner))
    }
    setOpen(false)
  }

  const handleInputChange = (next: string): void => {
    setQuery(next)
    setOpen(true)
    if (!next.trim() && allowEmpty) {
      onChange('')
      return
    }
    if (selectedPartner && next.trim() !== partnerLabel(selectedPartner)) {
      onChange('')
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setHighlightIndex((prev) => Math.min(prev + 1, Math.max(visible.length - 1, 0)))
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
      setHighlightIndex((prev) => Math.max(prev - 1, 0))
      return
    }

    if (event.key === 'Enter' && open && visible.length > 0) {
      event.preventDefault()
      selectPartner(visible[highlightIndex] ?? visible[0])
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      setOpen(false)
      if (selectedPartner) setQuery(partnerLabel(selectedPartner))
      else setQuery('')
    }
  }

  const dropdownList =
    open && !disabled
      ? createPortal(
          <ul
            ref={listRef}
            id={listId}
            className="partner-search-select__list partner-search-select__list--portal"
            role="listbox"
            style={{
              top: coords.top,
              left: coords.left,
              width: coords.width,
              zIndex: DROPDOWN_LAYER_Z_INDEX
            }}
          >
            {allowEmpty && !query.trim() ? (
              <li>
                <button
                  type="button"
                  className="partner-search-select__option"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectPartner(null)}
                >
                  {emptyLabel}
                </button>
              </li>
            ) : null}
            {query.trim() && filtered.length === 0 ? (
              <li className="partner-search-select__empty">Üye bulunamadı.</li>
            ) : null}
            {visible.map((partner, index) => (
              <li key={partner.id}>
                <button
                  type="button"
                  className={`partner-search-select__option${
                    index === highlightIndex ? ' partner-search-select__option--active' : ''
                  }${partner.id === value ? ' partner-search-select__option--selected' : ''}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectPartner(partner)}
                >
                  {partnerLabel(partner)}
                </button>
              </li>
            ))}
            {hiddenCount > 0 ? (
              <li className="partner-search-select__empty">
                +{hiddenCount} üye daha var — aramayı daraltın.
              </li>
            ) : null}
          </ul>,
          document.body
        )
      : null

  return (
    <div
      ref={rootRef}
      className={`partner-search-select${compact ? ' partner-search-select--compact' : ''}${open ? ' partner-search-select--open' : ''}`}
    >
      <input
        ref={inputRef}
        id={id}
        type="text"
        className={`field-input partner-search-select__input${compact ? ' partner-search-select__input--compact' : ''}`}
        value={query}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onChange={(e) => handleInputChange(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      {dropdownList}
    </div>
  )
}
