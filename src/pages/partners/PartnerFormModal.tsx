import { useEffect, useState } from 'react'

import type {
  Partner,
  PartnerInput,
  InterestSpecialPeriodActionType,
  MemberInterestSpecialPeriodInput,
  PartnerLinkRelationshipType,
  PartnerLinkedMemberInput
} from '@shared/types'
import { validateSpecialPeriodList } from '@shared/interestSpecialPeriods'
import { formatMoneyInputFromNumber, parseMoneyInput } from '@shared/moneyInput'
import PartnerSearchSelect from '../../components/partners/DesktopPartnerSearchSelect'
import MoneyAmountInput from '../../components/ui/MoneyAmountInput'
import { useActionToast } from '../../hooks/useActionToast'

import {

  formatShareRatioTr,

  parseShareRatioInput,

  resolveShareRatio,

  validateShareRatio

} from '@shared/shareRatio'

import { SIMPLIFIED_UI } from '@shared/appMode'

import { entityNoLabel, entitySingular } from '../../utils/entityLabels'

import { todayISO } from '../../utils/format'



interface PartnerFormModalProps {

  partner?: Partner | null

  onClose: () => void

  onSaved: () => void

}



const emptyForm: PartnerInput = {

  partner_no: '',

  full_name: '',

  tax_id: '',

  phone: '',

  email: '',

  address: '',

  city: '',

  district: '',

  join_date: todayISO(),

  is_active: 1,

  opening_balance: 0,

  notes: '',

  interest_exempt: 0,

  interest_exempt_note: '',

  share_ratio: 1

}

interface SpecialPeriodRow {
  key: string
  start_date: string
  end_date: string
  action_type: InterestSpecialPeriodActionType
  custom_interest_rate: string
  note: string
}

interface LinkedMemberRow {
  key: string
  linked_partner_id: number | ''
  relationship_type: PartnerLinkRelationshipType
  default_split_amount: string
  note: string
}

function createLinkedMemberRow(link?: {
  linked_partner_id: number
  relationship_type?: PartnerLinkRelationshipType
  default_split_amount?: number | null
  note?: string | null
}): LinkedMemberRow {
  return {
    key: `link-${Date.now()}-${Math.random()}`,
    linked_partner_id: link?.linked_partner_id ?? '',
    relationship_type: link?.relationship_type ?? 'SPOUSE',
    default_split_amount:
      link?.default_split_amount != null
        ? formatMoneyInputFromNumber(link.default_split_amount)
        : '',
    note: link?.note ?? ''
  }
}

function createSpecialPeriodRow(period?: {
  id?: number
  start_date: string
  end_date: string
  action_type?: InterestSpecialPeriodActionType
  custom_interest_rate?: number | null
  note?: string | null
}): SpecialPeriodRow {
  return {
    key: period?.id ? String(period.id) : `new-${Date.now()}-${Math.random()}`,
    start_date: period?.start_date ?? '',
    end_date: period?.end_date ?? '',
    action_type: period?.action_type ?? 'NO_INTEREST',
    custom_interest_rate:
      period?.action_type === 'CUSTOM_RATE' && period.custom_interest_rate != null
        ? String(period.custom_interest_rate)
        : '',
    note: period?.note ?? ''
  }
}

function parseCustomInterestRateInput(raw: string): number | null {
  const trimmed = raw.trim().replace(',', '.')
  if (!trimmed) return null
  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed)) return null
  return parsed
}



export default function PartnerFormModal({

  partner,

  onClose,

  onSaved

}: PartnerFormModalProps): JSX.Element {

  const toast = useActionToast()
  const isEdit = !!partner

  const [form, setForm] = useState<PartnerInput>(emptyForm)

  const [shareRatioInput, setShareRatioInput] = useState('1')
  const [openingBalanceInput, setOpeningBalanceInput] = useState('0,00')

  const [error, setError] = useState('')

  const [saving, setSaving] = useState(false)

  const [specialPeriods, setSpecialPeriods] = useState<SpecialPeriodRow[]>([])
  const [linkedMembers, setLinkedMembers] = useState<LinkedMemberRow[]>([])
  const [allPartners, setAllPartners] = useState<Partner[]>([])



  useEffect(() => {
    let cancelled = false

    const applyPartner = (source: Partner): void => {
      const ratio = resolveShareRatio(source.share_ratio, source.share_count)
      setForm({
        partner_no: source.partner_no,
        full_name: source.full_name,
        tax_id: source.tax_id ?? '',
        phone: source.phone ?? '',
        email: source.email ?? '',
        address: source.address ?? '',
        city: source.city ?? '',
        district: source.district ?? '',
        join_date: source.join_date ?? todayISO(),
        is_active: source.is_active,
        opening_balance: source.opening_balance,
        notes: source.notes ?? '',
        interest_exempt: source.interest_exempt ?? 0,
        interest_exempt_note: source.interest_exempt_note ?? '',
        share_ratio: ratio
      })
      setShareRatioInput(formatShareRatioTr(ratio))
      setOpeningBalanceInput(formatMoneyInputFromNumber(source.opening_balance ?? 0))
      setSpecialPeriods(
        (source.interest_special_periods ?? []).map((period) => createSpecialPeriodRow(period))
      )
      setLinkedMembers(
        (source.linked_members ?? []).map((link) => createLinkedMemberRow(link))
      )
    }

    if (partner?.id) {
      // Liste satırında interest_special_periods olmayabilir; her düzenlemede get ile yükle
      window.api.partners.get(partner.id).then((result) => {
        if (cancelled) return
        if (result.success && result.data) applyPartner(result.data)
        else applyPartner(partner)
      })
    } else {
      setShareRatioInput('1')
      setOpeningBalanceInput('0,00')
      setSpecialPeriods([])
      setLinkedMembers([])
      window.api.partners.nextNo().then((result) => {
        if (cancelled) return
        if (result.success && result.data) {
          setForm((prev) => ({ ...prev, partner_no: result.data! }))
        }
      })
    }

    window.api.partners.list({ is_active: 1 }).then((result) => {
      if (cancelled) return
      if (result.success && result.data) setAllPartners(result.data)
    })

    return () => {
      cancelled = true
    }
  }, [partner])



  const updateField = <K extends keyof PartnerInput>(key: K, value: PartnerInput[K]): void => {

    setForm((prev) => ({ ...prev, [key]: value }))

  }



  const handleSubmit = async (): Promise<void> => {

    if (!form.partner_no.trim() || !form.full_name.trim()) {

      setError(`${entityNoLabel} ve ad soyad zorunludur.`)

      return

    }



    if (!shareRatioInput.trim()) {

      setError('Pay oranı zorunludur.')

      return

    }



    const parsedShareRatio = parseShareRatioInput(shareRatioInput)

    if (parsedShareRatio == null) {

      setError('Geçerli bir pay oranı giriniz (ör. 1, 0,5, 2).')

      return

    }



    const shareValidation = validateShareRatio(parsedShareRatio)

    if (shareValidation) {

      setError(shareValidation)

      return

    }

    const periodInputs: MemberInterestSpecialPeriodInput[] = specialPeriods
      .filter(
        (period) =>
          period.start_date.trim() ||
          period.end_date.trim() ||
          period.note.trim() ||
          period.custom_interest_rate.trim()
      )
      .map((period) => ({
        start_date: period.start_date.trim(),
        end_date: period.end_date.trim(),
        action_type: period.action_type,
        custom_interest_rate:
          period.action_type === 'CUSTOM_RATE'
            ? parseCustomInterestRateInput(period.custom_interest_rate)
            : null,
        note: period.note.trim() || null
      }))

    const periodValidation = validateSpecialPeriodList(periodInputs)
    if (periodValidation) {
      setError(periodValidation)
      return
    }

    const linkedInputs: PartnerLinkedMemberInput[] = []
    for (const row of linkedMembers) {
      if (!row.linked_partner_id) {
        if (row.default_split_amount.trim() || row.note.trim()) {
          setError('Bağlı üye satırında üye seçilmelidir.')
          return
        }
        continue
      }
      if (partner?.id && row.linked_partner_id === partner.id) {
        setError('Üye kendisine bağlanamaz.')
        return
      }
      let defaultAmount: number | null = null
      if (row.default_split_amount.trim()) {
        defaultAmount = parseMoneyInput(row.default_split_amount)
        if (defaultAmount == null || defaultAmount <= 0) {
          setError('Bağlı üye varsayılan dağıtım tutarı geçersiz.')
          return
        }
      }
      linkedInputs.push({
        linked_partner_id: Number(row.linked_partner_id),
        relationship_type: row.relationship_type,
        default_split_amount: defaultAmount,
        note: row.note.trim() || null
      })
    }

    const uniqueLinks = new Set(linkedInputs.map((item) => item.linked_partner_id))
    if (uniqueLinks.size !== linkedInputs.length) {
      setError('Aynı üye birden fazla bağlı üye olarak eklenemez.')
      return
    }

    setSaving(true)

    setError('')

    const payload: PartnerInput = {

      ...form,

      partner_no: form.partner_no.trim(),

      full_name: form.full_name.trim(),

      tax_id: form.tax_id?.trim() || null,

      phone: form.phone?.trim() || null,

      email: form.email?.trim() || null,

      address: form.address?.trim() || null,

      city: form.city?.trim() || null,

      district: form.district?.trim() || null,

      join_date: form.join_date || null,

      notes: form.notes?.trim() || null,

      interest_exempt: form.interest_exempt ? 1 : 0,

      interest_exempt_note:

        form.interest_exempt && form.interest_exempt_note?.trim()

          ? form.interest_exempt_note.trim()

          : null,

      share_ratio: parsedShareRatio,

      share_count: parsedShareRatio,

      interest_special_periods: periodInputs,

      linked_members: linkedInputs

    }



    const result = isEdit

      ? await window.api.partners.update(partner!.id, payload)

      : await window.api.partners.create(payload)



    setSaving(false)



    if (result.success) {

      onSaved()

      onClose()

    } else {
      const fallback = isEdit ? 'Üye güncellenemedi' : 'Üye kaydedilemedi'
      setError(result.error ?? 'Kayıt sırasında hata oluştu')
      toast.fail(fallback, result.error)
    }

  }



  return (

    <div className="modal-overlay">

      <div className="modal">

        <div className="modal-header">

          <h3>{isEdit ? `${entitySingular} Düzenle` : `Yeni ${entitySingular}`}</h3>

          <button type="button" className="btn btn-sm" onClick={onClose}>

            Kapat

          </button>

        </div>

        <div className="modal-body">

          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-grid">

            <div className="form-group">

              <label>{entityNoLabel} *</label>

              <input

                value={form.partner_no}

                onChange={(e) => updateField('partner_no', e.target.value)}

                disabled={isEdit && !SIMPLIFIED_UI}

              />

            </div>

            <div className="form-group">

              <label>Ad Soyad / Ünvan *</label>

              <input

                value={form.full_name}

                onChange={(e) => updateField('full_name', e.target.value)}

              />

            </div>

            <div className="form-group">

              <label>Pay Oranı *</label>

              <input

                value={shareRatioInput}

                onChange={(e) => setShareRatioInput(e.target.value)}

                inputMode="decimal"

                placeholder="1"

              />

              <p className="form-hint">

                1 tam pay, 0,5 yarım pay, 2 iki tam pay anlamına gelir.

              </p>

            </div>

            <div className="form-group">

              <label>T.C. / Vergi No</label>

              <input

                value={form.tax_id ?? ''}

                onChange={(e) => updateField('tax_id', e.target.value)}

              />

            </div>

            <div className="form-group">

              <label>Telefon</label>

              <input

                value={form.phone ?? ''}

                onChange={(e) => updateField('phone', e.target.value)}

              />

            </div>

            <div className="form-group">

              <label>E-posta</label>

              <input

                type="email"

                value={form.email ?? ''}

                onChange={(e) => updateField('email', e.target.value)}

              />

            </div>

            <div className="form-group">

              <label>Giriş Tarihi</label>

              <input

                type="date"

                value={form.join_date ?? ''}

                onChange={(e) => updateField('join_date', e.target.value)}

              />

            </div>

            <div className="form-group full-width">

              <label>Ev Adresi</label>

              <input

                value={form.address ?? ''}

                onChange={(e) => updateField('address', e.target.value)}

              />

            </div>

            <div className="form-group">

              <label>İl</label>

              <input

                value={form.city ?? ''}

                onChange={(e) => updateField('city', e.target.value)}

              />

            </div>

            <div className="form-group">

              <label>İlçe</label>

              <input

                value={form.district ?? ''}

                onChange={(e) => updateField('district', e.target.value)}

              />

            </div>

            <div className="form-group">

              <label>Devreden Bakiye</label>

              <MoneyAmountInput

                value={openingBalanceInput}

                onValueChange={(value) => {
                  setOpeningBalanceInput(value)
                  updateField('opening_balance', parseMoneyInput(value) ?? 0)
                }}

                disabled={isEdit}

              />

            </div>

            <div className="form-group">

              <label>Durum</label>

              <select

                value={form.is_active ?? 1}

                onChange={(e) => updateField('is_active', Number(e.target.value))}

              >

                <option value={1}>Aktif</option>

                <option value={0}>Pasif</option>

              </select>

            </div>

            <div className="form-group full-width">

              <label>Açıklama / Not</label>

              <textarea

                value={form.notes ?? ''}

                onChange={(e) => updateField('notes', e.target.value)}

              />

            </div>

            <div className="form-group full-width partner-interest-exempt">

              <label className="checkbox-label">

                <input

                  type="checkbox"

                  checked={form.interest_exempt === 1}

                  onChange={(e) =>

                    updateField('interest_exempt', e.target.checked ? 1 : 0)

                  }

                />

                Bu üyeye faiz işletme

              </label>

              <p className="form-hint">

                Seçilirse tüm dönemlerde aidat gecikme faizi hesaplanmaz.

              </p>

            </div>

            <div className="form-group full-width">

              <label>Faiz muafiyet açıklaması</label>

              <input

                value={form.interest_exempt_note ?? ''}

                onChange={(e) => updateField('interest_exempt_note', e.target.value)}

                placeholder="Örn. Yönetim kurulu kararı"

                disabled={form.interest_exempt !== 1}

              />

            </div>

            <div
              className={`form-group full-width partner-exemption-periods${
                form.interest_exempt === 1 ? ' partner-exemption-periods--disabled' : ''
              }`}
            >
              <div className="partner-exemption-periods__header">
                <div>
                  <h4>Faiz Özel Dönemleri</h4>
                  <p className="form-hint">
                    Belirli tarih aralıklarında üyeye hiç faiz işletmeyebilir veya özel faiz oranı
                    uygulayabilirsiniz.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-sm"
                  disabled={form.interest_exempt === 1}
                  onClick={() =>
                    setSpecialPeriods((prev) => [...prev, createSpecialPeriodRow()])
                  }
                >
                  Özel Dönem Ekle
                </button>
              </div>

              {form.interest_exempt === 1 ? (
                <p className="form-hint">
                  Tam faiz muafiyeti seçiliyken faiz özel dönemleri hesaplamada dikkate alınmaz.
                </p>
              ) : null}

              {specialPeriods.length === 0 ? (
                <p className="form-hint">Henüz faiz özel dönemi eklenmedi.</p>
              ) : (
                <div className="table-wrap partner-exemption-periods__table-wrap">
                  <table className="data-table partner-exemption-periods__table">
                    <thead>
                      <tr>
                        <th>Başlangıç Tarihi</th>
                        <th>Bitiş Tarihi</th>
                        <th>İşlem Tipi</th>
                        <th>Özel Faiz Oranı</th>
                        <th>Açıklama / Karar Notu</th>
                        <th className="text-center">İşlem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {specialPeriods.map((period) => (
                        <tr key={period.key}>
                          <td>
                            <input
                              type="date"
                              value={period.start_date}
                              disabled={form.interest_exempt === 1}
                              onChange={(e) =>
                                setSpecialPeriods((prev) =>
                                  prev.map((row) =>
                                    row.key === period.key
                                      ? { ...row, start_date: e.target.value }
                                      : row
                                  )
                                )
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="date"
                              value={period.end_date}
                              disabled={form.interest_exempt === 1}
                              onChange={(e) =>
                                setSpecialPeriods((prev) =>
                                  prev.map((row) =>
                                    row.key === period.key
                                      ? { ...row, end_date: e.target.value }
                                      : row
                                  )
                                )
                              }
                            />
                          </td>
                          <td>
                            <select
                              value={period.action_type}
                              disabled={form.interest_exempt === 1}
                              onChange={(e) =>
                                setSpecialPeriods((prev) =>
                                  prev.map((row) =>
                                    row.key === period.key
                                      ? {
                                          ...row,
                                          action_type: e.target.value as InterestSpecialPeriodActionType,
                                          custom_interest_rate:
                                            e.target.value === 'CUSTOM_RATE'
                                              ? row.custom_interest_rate
                                              : ''
                                        }
                                      : row
                                  )
                                )
                              }
                            >
                              <option value="NO_INTEREST">Faiz İşletme</option>
                              <option value="CUSTOM_RATE">Özel Oran Uygula</option>
                            </select>
                          </td>
                          <td>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={
                                period.action_type === 'NO_INTEREST'
                                  ? '0'
                                  : period.custom_interest_rate
                              }
                              disabled={
                                form.interest_exempt === 1 || period.action_type === 'NO_INTEREST'
                              }
                              placeholder="Örn. 2"
                              onChange={(e) =>
                                setSpecialPeriods((prev) =>
                                  prev.map((row) =>
                                    row.key === period.key
                                      ? { ...row, custom_interest_rate: e.target.value }
                                      : row
                                  )
                                )
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={period.note}
                              disabled={form.interest_exempt === 1}
                              placeholder="Yönetim kararı"
                              onChange={(e) =>
                                setSpecialPeriods((prev) =>
                                  prev.map((row) =>
                                    row.key === period.key ? { ...row, note: e.target.value } : row
                                  )
                                )
                              }
                            />
                          </td>
                          <td className="text-center">
                            <button
                              type="button"
                              className="btn btn-sm btn-danger"
                              disabled={form.interest_exempt === 1}
                              onClick={() =>
                                setSpecialPeriods((prev) =>
                                  prev.filter((row) => row.key !== period.key)
                                )
                              }
                            >
                              Sil
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

            </div>

            <details className="form-group full-width partner-advanced-bank-settings">
              <summary className="partner-advanced-bank-settings__summary">
                <span className="partner-advanced-bank-settings__title">
                  Gelişmiş / Banka Dağıtım Ayarları
                </span>
                <span className="partner-advanced-bank-settings__hint">
                  Bağlı üyeler yalnızca banka hareketi dağıtımında öneri için kullanılır. Otomatik
                  ödeme oluşturmaz, borç veya faiz hesabını değiştirmez.
                </span>
              </summary>

              <div className="partner-linked-members partner-advanced-bank-settings__body">
                <div className="partner-exemption-periods__header">
                  <div>
                    <h4>Bağlı Üyeler</h4>
                    <p className="form-hint">
                      Eş / varis / ortak ödeme ilişkisi. Banka dağıtımında yalnızca öneri için
                      kullanılır; otomatik ödeme oluşmaz.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => setLinkedMembers((prev) => [...prev, createLinkedMemberRow()])}
                  >
                    Bağlı Üye Ekle
                  </button>
                </div>

                {linkedMembers.length === 0 ? (
                  <p className="form-hint">Henüz bağlı üye eklenmedi.</p>
                ) : (
                  <div className="table-wrap partner-exemption-periods__table-wrap">
                    <table className="data-table partner-exemption-periods__table">
                      <thead>
                        <tr>
                          <th>Bağlı Üye</th>
                          <th>İlişki</th>
                          <th>Varsayılan Tutar</th>
                          <th>Not</th>
                          <th className="text-center">İşlem</th>
                        </tr>
                      </thead>
                      <tbody>
                        {linkedMembers.map((row) => (
                          <tr key={row.key}>
                            <td>
                              <PartnerSearchSelect
                                partners={allPartners.filter((p) => p.id !== partner?.id)}
                                value={row.linked_partner_id}
                                compact
                                onChange={(nextId) =>
                                  setLinkedMembers((prev) =>
                                    prev.map((item) =>
                                      item.key === row.key
                                        ? { ...item, linked_partner_id: nextId }
                                        : item
                                    )
                                  )
                                }
                              />
                            </td>
                            <td>
                              <select
                                value={row.relationship_type}
                                onChange={(e) =>
                                  setLinkedMembers((prev) =>
                                    prev.map((item) =>
                                      item.key === row.key
                                        ? {
                                            ...item,
                                            relationship_type: e.target
                                              .value as PartnerLinkRelationshipType
                                          }
                                        : item
                                    )
                                  )
                                }
                              >
                                <option value="SPOUSE">Eşi</option>
                                <option value="HEIR">Varis</option>
                                <option value="JOINT_PAYMENT">Ortak ödeme</option>
                                <option value="OTHER">Diğer</option>
                              </select>
                            </td>
                            <td>
                              <MoneyAmountInput
                                value={row.default_split_amount}
                                placeholder="Opsiyonel"
                                onValueChange={(value) =>
                                  setLinkedMembers((prev) =>
                                    prev.map((item) =>
                                      item.key === row.key
                                        ? { ...item, default_split_amount: value }
                                        : item
                                    )
                                  )
                                }
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                value={row.note}
                                placeholder="Opsiyonel"
                                onChange={(e) =>
                                  setLinkedMembers((prev) =>
                                    prev.map((item) =>
                                      item.key === row.key ? { ...item, note: e.target.value } : item
                                    )
                                  )
                                }
                              />
                            </td>
                            <td className="text-center">
                              <button
                                type="button"
                                className="btn btn-sm btn-danger"
                                onClick={() =>
                                  setLinkedMembers((prev) =>
                                    prev.filter((item) => item.key !== row.key)
                                  )
                                }
                              >
                                Sil
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </details>

          </div>

        </div>

        <div className="modal-footer">

          <button type="button" className="btn" onClick={onClose}>

            İptal

          </button>

          <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={saving}>

            {saving ? 'Kaydediliyor...' : 'Kaydet'}

          </button>

        </div>

      </div>

    </div>

  )

}


