import { FormEvent, useEffect, useId, useState } from 'react'
import { ApiError } from '../../api/client'
import { createPartner, getNextPartnerNumber, updatePartner } from '../../api/partners'
import type { Partner, PartnerWriteInput } from '../../api/types'
import { useAuth } from '../../auth/AuthContext'
import {
  formatMoneyInputFromNumber,
  formatShareRatioTr,
  parseMoneyInput,
  parseShareRatioInput,
  todayISO
} from '../../utils/format'

type MemberFormModalProps = {
  partner: Partner | null
  onClose: () => void
  onSaved: (partner: Partner) => void
}

type FormState = {
  partnerNo: string
  fullName: string
  taxId: string
  phone: string
  email: string
  address: string
  city: string
  district: string
  joinDate: string
  shareRatioInput: string
  openingBalanceInput: string
  isActive: boolean
  notes: string
  interestExempt: boolean
  interestExemptNote: string
}

function emptyForm(): FormState {
  return {
    partnerNo: '',
    fullName: '',
    taxId: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    district: '',
    joinDate: todayISO(),
    shareRatioInput: '1',
    openingBalanceInput: '0,00',
    isActive: true,
    notes: '',
    interestExempt: false,
    interestExemptNote: ''
  }
}

function fromPartner(partner: Partner): FormState {
  return {
    partnerNo: partner.partnerNo,
    fullName: partner.fullName,
    taxId: partner.taxId ?? '',
    phone: partner.phone ?? '',
    email: partner.email ?? '',
    address: partner.address ?? '',
    city: partner.city ?? '',
    district: partner.district ?? '',
    joinDate: partner.joinDate ?? todayISO(),
    shareRatioInput: formatShareRatioTr(partner.shareRatio ?? 1),
    openingBalanceInput: formatMoneyInputFromNumber(partner.openingBalance ?? 0),
    isActive: partner.isActive,
    notes: partner.notes ?? '',
    interestExempt: partner.interestExempt,
    interestExemptNote: partner.interestExemptNote ?? ''
  }
}

export default function MemberFormModal({
  partner,
  onClose,
  onSaved
}: MemberFormModalProps): JSX.Element {
  const { token, tenantId } = useAuth()
  const titleId = useId()
  const isEdit = !!partner
  const [form, setForm] = useState<FormState>(() => (partner ? fromPartner(partner) : emptyForm()))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [loadingNext, setLoadingNext] = useState(!isEdit)

  useEffect(() => {
    setForm(partner ? fromPartner(partner) : emptyForm())
    setError('')
  }, [partner])

  useEffect(() => {
    if (isEdit || !token || !tenantId) {
      setLoadingNext(false)
      return
    }
    let cancelled = false
    setLoadingNext(true)
    void getNextPartnerNumber({ token, tenantId })
      .then((data) => {
        if (cancelled) return
        setForm((prev) => ({ ...prev, partnerNo: data.nextNumber }))
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof ApiError ? err.message : 'Sonraki üye numarası alınamadı')
      })
      .finally(() => {
        if (!cancelled) setLoadingNext(false)
      })
    return () => {
      cancelled = true
    }
  }, [isEdit, token, tenantId])

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && !saving) onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose, saving])

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]): void => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const onSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault()
    if (!token || !tenantId || saving || loadingNext) return

    const partnerNo = form.partnerNo.trim()
    const fullName = form.fullName.trim()
    if (!partnerNo) {
      setError('Ortak numarası zorunludur')
      return
    }
    if (!fullName) {
      setError('Ad soyad zorunludur')
      return
    }
    const shareRatio = parseShareRatioInput(form.shareRatioInput)
    if (shareRatio == null) {
      setError('Pay oranı sıfırdan büyük olmalıdır.')
      return
    }
    const openingBalance = parseMoneyInput(form.openingBalanceInput)
    if (openingBalance == null) {
      setError('Devreden bakiye geçerli bir tutar olmalıdır')
      return
    }

    const body: PartnerWriteInput = {
      partnerNo,
      fullName,
      taxId: form.taxId.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      address: form.address.trim() || null,
      city: form.city.trim() || null,
      district: form.district.trim() || null,
      joinDate: form.joinDate || null,
      shareRatio,
      isActive: form.isActive,
      openingBalance,
      interestExempt: form.interestExempt,
      interestExemptNote: form.interestExempt ? form.interestExemptNote.trim() || null : null,
      notes: form.notes.trim() || null
    }

    setSaving(true)
    setError('')
    try {
      const result = isEdit
        ? await updatePartner(partner.id, body, { token, tenantId })
        : await createPartner(body, { token, tenantId })
      onSaved(result.partner)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Kayıt başarısız')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="member-modal" role="presentation">
      <button type="button" className="member-modal__backdrop" aria-label="Kapat" onClick={onClose} />
      <div
        className="member-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="member-modal__header">
          <h2 id={titleId} className="member-modal__title">
            {isEdit ? 'Üye Düzenle' : 'Yeni Üye'}
          </h2>
          <button type="button" className="member-modal__close" onClick={onClose} aria-label="Kapat">
            ×
          </button>
        </div>

        <form className="member-modal__form" onSubmit={onSubmit}>
          {error ? <div className="alert alert-error">{error}</div> : null}

          <div className="member-form-grid">
            <label className="member-field">
              <span>Üye No *</span>
              <input
                value={form.partnerNo}
                onChange={(e) => setField('partnerNo', e.target.value)}
                disabled={loadingNext || saving}
                required
                autoComplete="off"
              />
            </label>
            <label className="member-field member-field--wide">
              <span>Ad Soyad / Ünvan *</span>
              <input
                value={form.fullName}
                onChange={(e) => setField('fullName', e.target.value)}
                disabled={saving}
                required
              />
            </label>
            <label className="member-field">
              <span>Pay Oranı *</span>
              <input
                value={form.shareRatioInput}
                onChange={(e) => setField('shareRatioInput', e.target.value)}
                disabled={saving}
                required
              />
            </label>
            <label className="member-field">
              <span>T.C. / Vergi No</span>
              <input
                value={form.taxId}
                onChange={(e) => setField('taxId', e.target.value)}
                disabled={saving}
              />
            </label>
            <label className="member-field">
              <span>Telefon</span>
              <input
                value={form.phone}
                onChange={(e) => setField('phone', e.target.value)}
                disabled={saving}
              />
            </label>
            <label className="member-field">
              <span>E-posta</span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
                disabled={saving}
              />
            </label>
            <label className="member-field">
              <span>Giriş Tarihi</span>
              <input
                type="date"
                value={form.joinDate}
                onChange={(e) => setField('joinDate', e.target.value)}
                disabled={saving}
              />
            </label>
            <label className="member-field">
              <span>Devreden Bakiye</span>
              <input
                value={form.openingBalanceInput}
                onChange={(e) => setField('openingBalanceInput', e.target.value)}
                disabled={saving || isEdit}
                title={isEdit ? 'Düzenlemede devreden bakiye değiştirilemez' : undefined}
              />
            </label>
            <label className="member-field">
              <span>Durum</span>
              <select
                value={form.isActive ? '1' : '0'}
                onChange={(e) => setField('isActive', e.target.value === '1')}
                disabled={saving}
              >
                <option value="1">Aktif</option>
                <option value="0">Pasif</option>
              </select>
            </label>
            <label className="member-field">
              <span>İl</span>
              <input
                value={form.city}
                onChange={(e) => setField('city', e.target.value)}
                disabled={saving}
              />
            </label>
            <label className="member-field">
              <span>İlçe</span>
              <input
                value={form.district}
                onChange={(e) => setField('district', e.target.value)}
                disabled={saving}
              />
            </label>
            <label className="member-field member-field--wide">
              <span>Ev Adresi</span>
              <input
                value={form.address}
                onChange={(e) => setField('address', e.target.value)}
                disabled={saving}
              />
            </label>
            <label className="member-field member-field--wide">
              <span>Açıklama / Not</span>
              <textarea
                value={form.notes}
                onChange={(e) => setField('notes', e.target.value)}
                disabled={saving}
                rows={2}
              />
            </label>
            <label className="member-field member-field--wide member-field--check">
              <input
                type="checkbox"
                checked={form.interestExempt}
                onChange={(e) => setField('interestExempt', e.target.checked)}
                disabled={saving}
              />
              <span>Bu üyeye faiz işletme</span>
            </label>
            {form.interestExempt ? (
              <label className="member-field member-field--wide">
                <span>Faiz muafiyet açıklaması</span>
                <input
                  value={form.interestExemptNote}
                  onChange={(e) => setField('interestExemptNote', e.target.value)}
                  disabled={saving}
                />
              </label>
            ) : null}
          </div>

          <div className="member-modal__actions">
            <button type="button" className="btn btn--ghost" onClick={onClose} disabled={saving}>
              İptal
            </button>
            <button type="submit" className="btn btn--primary" disabled={saving || loadingNext}>
              {saving ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
