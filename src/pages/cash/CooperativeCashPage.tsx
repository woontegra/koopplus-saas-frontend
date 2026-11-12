import { useCallback, useEffect, useMemo, useState } from 'react'
import type {
  CashEntry,
  CashEntryFilters,
  CashEntryPayload,
  CashEntryType,
  CashSummary
} from '@shared/types'
import {
  CASH_AUTO_MEMBER_PAYMENT_CATEGORY,
  CASH_CARRY_FORWARD_CATEGORY,
  CASH_CATEGORY_OTHER,
  CASH_EXPENSE_CATEGORIES,
  CASH_INCOME_CATEGORIES,
  splitCashCategoryForForm
} from '@shared/cashCategories'
import { useAuth } from '../../auth/AuthContext'
import { useActionToast } from '../../hooks/useActionToast'
import { useAskDialog } from '../../hooks/useAskDialog'
import DataPanel from '../../components/ui/DataPanel'
import StatPanel from '../../components/ui/StatPanel'
import { formatDate, formatMoney, formatPeriod, MONTH_NAMES, todayISO } from '../../utils/format'
import { resolveActivePeriod } from '../../utils/usage'
import { formatMoneyInputFromNumber, parseMoneyInput } from '@shared/moneyInput'
import MoneyAmountInput from '../../components/ui/MoneyAmountInput'

interface CashFormState {
  entry_date: string
  entry_type: CashEntryType
  category: string
  otherCategoryName: string
  amount: string
  description: string
}

const EMPTY_FORM: CashFormState = {
  entry_date: todayISO(),
  entry_type: 'INCOME',
  category: CASH_INCOME_CATEGORIES[0],
  otherCategoryName: '',
  amount: '',
  description: ''
}

const FILTER_CATEGORIES = [
  ...CASH_INCOME_CATEGORIES,
  ...CASH_EXPENSE_CATEGORIES.filter((c) => c !== CASH_CATEGORY_OTHER),
  CASH_AUTO_MEMBER_PAYMENT_CATEGORY,
  CASH_CARRY_FORWARD_CATEGORY
]

function nextPeriod(year: number, month: number): { year: number; month: number } {
  if (month >= 12) return { year: year + 1, month: 1 }
  return { year, month: month + 1 }
}

function buildYearOptions(): number[] {
  const current = new Date().getFullYear()
  const years: number[] = []
  for (let y = current - 5; y <= current + 2; y += 1) years.push(y)
  return years
}

export default function CooperativeCashPage(): JSX.Element {
  const { canWrite } = useAuth()
  const toast = useActionToast()
  const ask = useAskDialog()
  const [filters, setFilters] = useState<CashEntryFilters>({})
  const [summary, setSummary] = useState<CashSummary | null>(null)
  const [entries, setEntries] = useState<CashEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [editing, setEditing] = useState<CashEntry | null>(null)
  const [form, setForm] = useState<CashFormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [closingPeriod, setClosingPeriod] = useState(false)

  const yearOptions = useMemo(() => buildYearOptions(), [])
  const periodYear = filters.period_year ?? resolveActivePeriod().year
  const periodMonth = filters.period_month ?? resolveActivePeriod().month
  const periodLabel = formatPeriod(periodYear, periodMonth)
  const next = nextPeriod(periodYear, periodMonth)
  const nextPeriodLabel = formatPeriod(next.year, next.month)

  const categoryOptions = useMemo(
    () => (form.entry_type === 'INCOME' ? CASH_INCOME_CATEGORIES : CASH_EXPENSE_CATEGORIES),
    [form.entry_type]
  )

  const isOtherCategory = form.category === CASH_CATEGORY_OTHER

  const load = useCallback(async (nextFilters: CashEntryFilters) => {
    setLoading(true)
    setError('')
    const [summaryRes, listRes] = await Promise.all([
      window.api.cash.getSummary(nextFilters),
      window.api.cash.list(nextFilters)
    ])
    setLoading(false)
    if (summaryRes.success && summaryRes.data) setSummary(summaryRes.data)
    else setError(summaryRes.error ?? 'Kasa özeti yüklenemedi')
    if (listRes.success && listRes.data) setEntries(listRes.data)
    else setError(listRes.error ?? 'Kasa hareketleri yüklenemedi')
  }, [])

  useEffect(() => {
    window.api.cash.getDefaultFilters().then((res) => {
      const initial = res.success && res.data ? res.data : {}
      setFilters(initial)
      load(initial)
    })
  }, [load])

  const applyPeriod = (year: number, month: number): void => {
    const nextFilters: CashEntryFilters = {
      ...filters,
      period_year: year,
      period_month: month,
      date_from: undefined,
      date_to: undefined
    }
    setFilters(nextFilters)
    load(nextFilters)
  }

  const openCreate = (type: CashEntryType): void => {
    setModalMode('create')
    setEditing(null)
    setError('')
    setForm({
      ...EMPTY_FORM,
      entry_type: type,
      category: type === 'INCOME' ? CASH_INCOME_CATEGORIES[0] : CASH_EXPENSE_CATEGORIES[0],
      otherCategoryName: ''
    })
    setShowModal(true)
  }

  const openEdit = (entry: CashEntry): void => {
    if (!entry.can_edit) {
      if (entry.source_type === 'CARRY_FORWARD') {
        toast.info(
          'Kasa kaydı düzenlenemez',
          'Devreden bakiye kaydı düzenlenemez. Güncellemek için Hesap Kes işlemini kullanın.'
        )
      } else {
        toast.info(
          'Kasa kaydı düzenlenemez',
          'Bu kayıt üye ödemesinden otomatik oluşmuştur. Değişiklik için ilgili ödeme kaydını düzenleyin.'
        )
      }
      return
    }
    const split = splitCashCategoryForForm(entry.category, entry.entry_type)
    setModalMode('edit')
    setEditing(entry)
    setError('')
    setForm({
      entry_date: entry.entry_date,
      entry_type: entry.entry_type,
      category: split.category,
      otherCategoryName: split.otherCategoryName,
      amount: formatMoneyInputFromNumber(entry.amount),
      description: entry.description ?? ''
    })
    setShowModal(true)
  }

  const checkClosedPeriodBeforeSave = async (): Promise<boolean> => {
    const check = await window.api.cash.checkPeriodClosed(form.entry_date)
    if (!check.success || !check.data?.is_closed) return true

    const confirmed = await ask.confirm(
      `Bu dönem için hesap kesimi yapılmış. Yeni hareket eklerseniz sonraki aya devreden bakiye değişebilir. Devam etmek istiyor musunuz?`
    )
    return confirmed
  }

  const handleSave = async (): Promise<void> => {
    const parsedAmount = parseMoneyInput(form.amount)
    if (parsedAmount == null || parsedAmount <= 0) {
      setError('Tarih, kategori ve tutar zorunludur')
      return
    }
    if (isOtherCategory && !form.otherCategoryName.trim()) {
      setError('Diğer kategori adı zorunludur')
      return
    }

    if (modalMode === 'create') {
      const canProceed = await checkClosedPeriodBeforeSave()
      if (!canProceed) return
    }

    setSaving(true)
    setError('')
    const payload: CashEntryPayload = {
      entry_date: form.entry_date,
      entry_type: form.entry_type,
      category: form.category,
      category_custom: isOtherCategory ? form.otherCategoryName.trim() : null,
      amount: parsedAmount,
      description: form.description.trim() || null
    }

    const res =
      modalMode === 'edit' && editing
        ? await window.api.cash.update(editing.id, payload)
        : await window.api.cash.create(payload)

    setSaving(false)
    if (res.success) {
      setShowModal(false)
      if (modalMode === 'create') {
        const check = await window.api.cash.checkPeriodClosed(form.entry_date)
        if (check.success && check.data?.is_closed) {
          setSuccess(
            'Kasa kaydı eklendi. Devreden bakiyeyi güncellemek için Hesap Kes işlemini tekrar çalıştırın.'
          )
          toast.warn(
            'Kasa hareketi kaydedildi',
            'Devreden bakiyeyi güncellemek için Hesap Kes işlemini tekrar çalıştırın.'
          )
        } else {
          setSuccess('Kasa kaydı eklendi.')
          toast.success('Kasa hareketi kaydedildi', 'Kasa kaydı başarıyla eklendi.')
        }
      } else {
        setSuccess('Kasa kaydı güncellendi.')
        toast.success('Kasa hareketi güncellendi', 'Kasa kaydı başarıyla güncellendi.')
      }
      load(filters)
    } else {
      setError(res.error ?? 'Kayıt başarısız')
      toast.fail('Kasa hareketi kaydedilemedi', res.error)
    }
  }

  const handleDelete = async (entry: CashEntry): Promise<void> => {
    if (!entry.can_delete) {
      if (entry.source_type === 'CARRY_FORWARD') {
        toast.info(
          'Kasa kaydı silinemedi',
          'Devreden bakiye kaydı silinemez. Güncellemek için Hesap Kes işlemini kullanın.'
        )
      } else {
        toast.info(
          'Kasa kaydı silinemedi',
          'Bu kayıt üye ödemesinden otomatik oluşmuştur. Değişiklik için ilgili ödeme kaydını düzenleyin.'
        )
      }
      return
    }
    if (!(await ask.confirm('Bu kasa kaydı silinecek. Devam etmek istiyor musunuz?'))) return

    const res = await window.api.cash.delete(entry.id)
    if (res.success) {
      setSuccess('Kasa kaydı silindi.')
      toast.success('Kasa hareketi silindi', 'Kasa kaydı başarıyla silindi.')
      load(filters)
    } else {
      toast.fail('Kasa hareketi silinemedi', res.error)
    }
  }

  const runClosePeriod = async (update = false): Promise<void> => {
    setClosingPeriod(true)
    const res = await window.api.cash.closePeriod(periodYear, periodMonth, { update })
    setClosingPeriod(false)

    if (!res.success) {
      toast.fail('Hesap kesimi tamamlanamadı', res.error)
      return
    }

    if (res.data?.status === 'already_closed') {
      const shouldUpdate = await ask.confirm(res.data.message)
      if (shouldUpdate) await runClosePeriod(true)
      return
    }

    if (res.data?.message) {
      setSuccess(res.data.message)
      toast.success('Hesap kesimi tamamlandı', res.data.message)
    }
    load(filters)
  }

  const handleClosePeriod = async (): Promise<void> => {
    const balance = summary?.period?.period_end_balance ?? summary?.balance ?? 0
    const balanceText = formatMoney(balance)
    const confirmed = await ask.confirm(
      `${periodLabel} kasa hesabı kapatılacak ve kalan bakiye ${nextPeriodLabel} dönemine devredilecek.\n\nDevredilecek tutar: ${balanceText}\n\nDevam etmek istiyor musunuz?`
    )
    if (confirmed) await runClosePeriod(false)
  }

  const applyFilters = (): void => {
    load(filters)
  }

  const resetToActivePeriod = async (): Promise<void> => {
    const res = await window.api.cash.getDefaultFilters()
    const next = res.success && res.data ? res.data : {}
    setFilters(next)
    load(next)
  }

  const periodSummary = summary?.period

  return (
    <div className="cooperative-cash-page">
      {success && (
        <div className="alert alert-success" onAnimationEnd={() => setSuccess('')}>
          {success}
        </div>
      )}
      {error && !showModal && <div className="alert alert-error">{error}</div>}

      {periodSummary && (
        <div className="cooperative-cash-stats">
          <StatPanel label="Devreden Bakiye" value={formatMoney(periodSummary.opening_balance)} />
          <StatPanel label="Aylık Gelir" value={formatMoney(periodSummary.period_income)} variant="info" />
          <StatPanel label="Aylık Gider" value={formatMoney(periodSummary.period_expense)} variant="accent" />
          <StatPanel label="Kasa Bakiyesi" value={formatMoney(periodSummary.period_end_balance)} />
        </div>
      )}

      <DataPanel
        title="Kooperatif Kasası"
        subtitle={`${periodLabel} dönemi — ofis kasası gelir ve gider takibi`}
        actions={
          <div className="member-debt-toolbar__actions">
            {canWrite && (
              <>
                <button type="button" className="btn btn-sm btn-primary" onClick={() => openCreate('INCOME')}>
                  Gelir Ekle
                </button>
                <button type="button" className="btn btn-sm btn-accent" onClick={() => openCreate('EXPENSE')}>
                  Gider Ekle
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  disabled={closingPeriod}
                  onClick={() => void handleClosePeriod()}
                >
                  {closingPeriod ? 'Kesiliyor...' : 'Hesap Kes'}
                </button>
              </>
            )}
            <button
              type="button"
              className="btn btn-sm"
              onClick={async () => {
                const res = await window.api.cash.print(filters)
                if (res.success) {
                  setSuccess('Yazdırma başlatıldı.')
                  toast.success('Yazdırma başlatıldı', 'Kasa dökümü yazdırma önizlemesi açıldı.')
                } else {
                  toast.fail('Yazdırma başlatılamadı', res.error)
                }
              }}
            >
              Yazdır
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={async () => {
                const res = await window.api.cash.savePdf(filters)
                if (res.success) {
                  setSuccess('PDF dosyası oluşturuldu.')
                  toast.success('PDF oluşturuldu', 'Kasa dökümü PDF dosyası kaydedildi.')
                } else if (res.error !== 'Kayıt iptal edildi') {
                  toast.fail('PDF oluşturulamadı', res.error)
                }
              }}
            >
              PDF Al
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={async () => {
                const res = await window.api.cash.exportExcel(filters)
                if (res.success) {
                  setSuccess('Excel dosyası oluşturuldu.')
                  toast.success('Excel oluşturuldu', 'Kasa dökümü Excel dosyası kaydedildi.')
                } else if (res.error !== 'Kayıt iptal edildi') {
                  toast.fail('Excel oluşturulamadı', res.error)
                }
              }}
            >
              Excel&apos;e Aktar
            </button>
          </div>
        }
        noPadding
      >
        <div className="cooperative-cash-filters">
          <select
            className="field-select"
            value={periodMonth}
            onChange={(e) => applyPeriod(periodYear, Number(e.target.value))}
          >
            {MONTH_NAMES.map((name, index) => (
              <option key={name} value={index + 1}>
                {name}
              </option>
            ))}
          </select>
          <select
            className="field-select"
            value={periodYear}
            onChange={(e) => applyPeriod(Number(e.target.value), periodMonth)}
          >
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <select
            className="field-select"
            value={filters.entry_type ?? ''}
            onChange={(e) =>
              setFilters({
                ...filters,
                entry_type: (e.target.value as CashEntryType | '') || undefined
              })
            }
          >
            <option value="">Tümü</option>
            <option value="INCOME">Gelir</option>
            <option value="EXPENSE">Gider</option>
          </select>
          <select
            className="field-select"
            value={filters.category ?? ''}
            onChange={(e) => setFilters({ ...filters, category: e.target.value || undefined })}
          >
            <option value="">Tüm Kategoriler</option>
            {FILTER_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <button type="button" className="btn btn-sm btn-primary" onClick={applyFilters}>
            Filtrele
          </button>
          <button type="button" className="btn btn-sm" onClick={resetToActivePeriod}>
            Aktif Dönem
          </button>
          {periodSummary?.is_closed && (
            <span className="cooperative-cash-closed-badge">Hesap kesildi</span>
          )}
        </div>

        {loading ? (
          <div className="page-loading">Kasa hareketleri yükleniyor...</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table cooperative-cash-table">
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>İşlem Türü</th>
                  <th>Kategori</th>
                  <th>Açıklama</th>
                  <th className="text-right">Gelir</th>
                  <th className="text-right">Gider</th>
                  <th className="text-right">Bakiye</th>
                  <th>Kaynak</th>
                  {canWrite && <th className="text-center">İşlem</th>}
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan={canWrite ? 9 : 8}>Kayıt bulunamadı.</td>
                  </tr>
                ) : (
                  entries.map((entry) => (
                    <tr
                      key={entry.id}
                      className={entry.source_type === 'CARRY_FORWARD' ? 'cooperative-cash-row--carry' : ''}
                    >
                      <td>{formatDate(entry.entry_date)}</td>
                      <td>{entry.transaction_type}</td>
                      <td>{entry.category}</td>
                      <td>{entry.description || '—'}</td>
                      <td className="money credit text-right">
                        {entry.entry_type === 'INCOME' ? formatMoney(entry.amount) : '—'}
                      </td>
                      <td className="money debit text-right">
                        {entry.entry_type === 'EXPENSE' ? formatMoney(entry.amount) : '—'}
                      </td>
                      <td className="money text-right">{formatMoney(entry.running_balance)}</td>
                      <td>{entry.source_label}</td>
                      {canWrite && (
                        <td className="text-center">
                          {entry.can_edit || entry.can_delete ? (
                            <div className="row-actions">
                              {entry.can_edit && (
                                <button type="button" className="btn btn-xs" onClick={() => openEdit(entry)}>
                                  Düzenle
                                </button>
                              )}
                              {entry.can_delete && (
                                <button
                                  type="button"
                                  className="btn btn-xs btn-danger"
                                  onClick={() => handleDelete(entry)}
                                >
                                  Sil
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </DataPanel>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal modal--narrow">
            <div className="modal-header">
              <h3>
                {modalMode === 'edit'
                  ? 'Kasa Kaydı Düzenle'
                  : form.entry_type === 'INCOME'
                    ? 'Gelir Ekle'
                    : 'Gider Ekle'}
              </h3>
              <button type="button" className="btn btn-sm" onClick={() => setShowModal(false)}>
                Kapat
              </button>
            </div>
            <div className="modal-body">
              {error && <div className="alert alert-error">{error}</div>}
              <div className="form-grid form-grid--2">
                <div className="form-group">
                  <label>Tarih</label>
                  <input
                    type="date"
                    value={form.entry_date}
                    onChange={(e) => setForm({ ...form, entry_date: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Kategori</label>
                  <select
                    value={form.category}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        category: e.target.value,
                        otherCategoryName:
                          e.target.value === CASH_CATEGORY_OTHER ? form.otherCategoryName : ''
                      })
                    }
                  >
                    {categoryOptions.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
                {isOtherCategory && (
                  <div className="form-group form-group--wide">
                    <label>Diğer Kategori Adı *</label>
                    <input
                      value={form.otherCategoryName}
                      onChange={(e) => setForm({ ...form, otherCategoryName: e.target.value })}
                      placeholder="Örn: Asansör Tamiri"
                      autoFocus
                    />
                  </div>
                )}
                <div className="form-group">
                  <label>Tutar</label>
                  <MoneyAmountInput
                    value={form.amount}
                    onValueChange={(value) => setForm({ ...form, amount: value })}
                  />
                </div>
                <div className="form-group form-group--wide">
                  <label>Açıklama</label>
                  <input
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-sm" onClick={() => setShowModal(false)}>
                İptal
              </button>
              <button type="button" className="btn btn-sm btn-primary" disabled={saving} onClick={handleSave}>
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
