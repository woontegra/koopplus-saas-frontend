import { useEffect, useMemo, useState } from 'react'
import type { Partner } from '../../shared/types'
import { filterPartnersBySearch } from '../../shared/searchText'
import { entityNoLabel } from '../../utils/entityLabels'

interface InterestPolicyMemberPickerProps {
  selectedIds: number[]
  onChange: (ids: number[]) => void
  disabled?: boolean
}

export default function InterestPolicyMemberPicker({
  selectedIds,
  onChange,
  disabled = false
}: InterestPolicyMemberPickerProps): JSX.Element {
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void window.api.partners.list({}).then((res) => {
      if (cancelled) return
      setLoading(false)
      if (res.success && res.data) {
        setPartners(res.data)
        setLoadError('')
      } else {
        setLoadError(res.error ?? 'Üyeler yüklenemedi')
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])
  const filtered = useMemo(() => filterPartnersBySearch(partners, search), [partners, search])
  const activePartners = useMemo(
    () => partners.filter((p) => p.is_active === 1),
    [partners]
  )

  const toggle = (id: number): void => {
    if (disabled) return
    if (selectedSet.has(id)) onChange(selectedIds.filter((x) => x !== id))
    else onChange([...selectedIds, id])
  }

  const selectAllFiltered = (): void => {
    if (disabled) return
    const next = new Set(selectedIds)
    for (const p of filtered) next.add(p.id)
    onChange([...next])
  }

  const clearSelection = (): void => {
    if (disabled) return
    onChange([])
  }

  const selectActiveOnly = (): void => {
    if (disabled) return
    onChange(activePartners.map((p) => p.id))
  }

  return (
    <div className="interest-policy-member-picker">
      <div className="interest-policy-member-picker__toolbar">
        <input
          type="search"
          className="interest-policy-member-picker__search"
          placeholder="Üye no, ad soyad, TC/vergi no, telefon ara..."
          value={search}
          disabled={disabled || loading}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="interest-policy-member-picker__actions">
          <button type="button" className="btn btn-sm" disabled={disabled} onClick={selectAllFiltered}>
            Tümünü Seç
          </button>
          <button type="button" className="btn btn-sm" disabled={disabled} onClick={clearSelection}>
            Seçimi Temizle
          </button>
          <button type="button" className="btn btn-sm" disabled={disabled} onClick={selectActiveOnly}>
            Sadece Aktif Üyeleri Seç
          </button>
        </div>
      </div>

      <div className="interest-policy-member-picker__meta">
        Seçili: <strong>{selectedIds.length}</strong> üye
        {search.trim() ? ` · Listelenen: ${filtered.length}` : null}
      </div>

      {loadError && <div className="alert alert-error">{loadError}</div>}
      {loading ? (
        <div className="page-loading">Üyeler yükleniyor...</div>
      ) : (
        <div className="interest-policy-member-picker__list table-wrap table-wrap--compact">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 36 }} />
                <th>{entityNoLabel}</th>
                <th>Ad Soyad / Ünvan</th>
                <th>TC / Vergi No</th>
                <th>Durum</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5}>Eşleşen üye bulunamadı.</td>
                </tr>
              ) : (
                filtered.map((partner) => {
                  const checked = selectedSet.has(partner.id)
                  return (
                    <tr key={partner.id} className={checked ? 'is-selected' : undefined}>
                      <td>
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => toggle(partner.id)}
                          aria-label={`${partner.partner_no} seç`}
                        />
                      </td>
                      <td>{partner.partner_no}</td>
                      <td>{partner.full_name}</td>
                      <td>{partner.tax_id || '—'}</td>
                      <td>{partner.is_active === 1 ? 'Aktif' : 'Pasif'}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export function formatInterestPolicyScopeLabel(policy: {
  scope_type?: string
  member_count?: number
}): string {
  if (policy.scope_type === 'SELECTED_MEMBERS') {
    const count = policy.member_count ?? 0
    return `${count} üye`
  }
  return 'Tüm aktif üyeler'
}
