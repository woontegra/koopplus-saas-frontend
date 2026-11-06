import { useCallback, useEffect, useMemo, useState } from 'react'
import type {
  AidatDistributionBatch,
  AidatDistributionInput,
  AidatDistributionMonthPreview,
  AidatDistributionPartnerPreview,
  AidatDistributionPreview,
  AidatDistributionSkippedPreview,
  AidatDistributionRoundingMode
} from '@shared/types'
import { formatShareRatioTr } from '@shared/shareRatio'
import { parseMoneyInput } from '@shared/moneyInput'
import { matchesSearchText } from '@shared/searchText'
import DataPanel from '../../components/ui/DataPanel'
import MoneyAmountInput from '../../components/ui/MoneyAmountInput'
import { useAuth } from '../../auth/AuthContext'
import { useActionToast } from '../../hooks/useActionToast'
import { useAskDialog } from '../../hooks/useAskDialog'

const MONTH_NAMES = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
]

const ROUNDING_OPTIONS: { value: AidatDistributionRoundingMode; label: string }[] = [
  { value: 'last_month', label: 'Farkı son aya ekle' },
  { value: 'first_month', label: 'Farkı ilk aya ekle' },
  { value: 'ignore', label: 'Kuruş farkını göster ama kaydetme' }
]

function formatMoney(value: number): string {
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}

export default function AidatDistributionPage(): JSX.Element {
  const { canWrite } = useAuth()
  const toast = useActionToast()
  const ask = useAskDialog()
  const currentYear = new Date().getFullYear()

  const [year, setYear] = useState(currentYear)
  const [startMonth, setStartMonth] = useState(1)
  const [monthCount, setMonthCount] = useState(12)
  const [totalAmount, setTotalAmount] = useState('')
  const [lastPaymentDay, setLastPaymentDay] = useState(0)
  const [description, setDescription] = useState('')
  const [roundingMode, setRoundingMode] = useState<AidatDistributionRoundingMode>('last_month')

  const [preview, setPreview] = useState<AidatDistributionPreview | null>(null)
  const [previewError, setPreviewError] = useState('')
  const [loading, setLoading] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [resultMessage, setResultMessage] = useState('')
  const [resultError, setResultError] = useState('')
  const [previewPartnerSearch, setPreviewPartnerSearch] = useState('')

  const [batches, setBatches] = useState<AidatDistributionBatch[]>([])
  const [batchesLoading, setBatchesLoading] = useState(false)

  const loadBatches = useCallback(async () => {
    setBatchesLoading(true)
    try {
      const res = await window.api.aidatDistribution.listBatches()
      if (res.success && res.data) setBatches(res.data)
    } finally {
      setBatchesLoading(false)
    }
  }, [])

  useEffect(() => {
    loadBatches()
  }, [loadBatches])

  const parsedAmount = useMemo(() => parseMoneyInput(totalAmount) ?? 0, [totalAmount])

  const filteredPreviewPartners = useMemo(() => {
    if (!preview) return []
    const q = previewPartnerSearch.trim()
    if (!q) return preview.partners
    return preview.partners.filter(
      (row) =>
        matchesSearchText(row.partner_no, q) || matchesSearchText(row.full_name, q)
    )
  }, [preview, previewPartnerSearch])

  const filteredSkippedPartners = useMemo(() => {
    if (!preview) return []
    const q = previewPartnerSearch.trim()
    if (!q) return preview.skipped
    return preview.skipped.filter(
      (row) =>
        matchesSearchText(row.partner_no, q) || matchesSearchText(row.full_name, q)
    )
  }, [preview, previewPartnerSearch])

  const buildInput = useCallback((): AidatDistributionInput => ({
    year,
    start_month: startMonth,
    month_count: monthCount,
    total_amount: parsedAmount,
    last_payment_day: lastPaymentDay,
    description,
    rounding_mode: roundingMode
  }), [year, startMonth, monthCount, parsedAmount, lastPaymentDay, description, roundingMode])

  const handlePreview = useCallback(async () => {
    if (parsedAmount <= 0) {
      setPreviewError('Lütfen geçerli bir yıllık toplam tutar giriniz.')
      return
    }
    setLoading(true)
    setPreviewError('')
    setPreview(null)
    setResultMessage('')
    setResultError('')
    try {
      const res = await window.api.aidatDistribution.preview(buildInput())
      if (res.success && res.data) {
        setPreview(res.data)
      } else {
        setPreviewError(res.error || 'Önizleme alınamadı.')
      }
    } catch (err: unknown) {
      setPreviewError(err instanceof Error ? err.message : 'Bilinmeyen hata')
    } finally {
      setLoading(false)
    }
  }, [parsedAmount, buildInput])

  const handleExecute = useCallback(async () => {
    if (!preview) return

    const confirmed = await ask.confirm(
      `${preview.totalRecords} aidat kaydı oluşturulacak. Devam etmek istiyor musunuz?`
    )
    if (!confirmed) return

    setExecuting(true)
    setResultMessage('')
    setResultError('')
    try {
      const res = await window.api.aidatDistribution.execute(buildInput())
      if (res.success && res.data) {
        setResultMessage(res.data.message)
        setPreview(null)
        loadBatches()
        const skipped = res.data.skipped_due_count ?? 0
        if (skipped > 0) {
          toast.warn(
            'Aidat dağıtımı tamamlandı',
            res.data.message || `${skipped} kayıt atlandı.`
          )
        } else {
          toast.success(
            'Aidat dağıtımı tamamlandı',
            res.data.message || 'Aidatlar başarıyla oluşturuldu.'
          )
        }
      } else {
        setResultError(res.error || 'Aidatlar oluşturulamadı.')
        toast.fail('Aidat dağıtımı tamamlanamadı', res.error)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Bilinmeyen hata'
      setResultError(message)
      toast.fail('Aidat dağıtımı tamamlanamadı', message)
    } finally {
      setExecuting(false)
    }
  }, [preview, buildInput, loadBatches, ask, toast])

  const handleClear = useCallback(() => {
    setYear(currentYear)
    setStartMonth(1)
    setMonthCount(12)
    setTotalAmount('')
    setLastPaymentDay(0)
    setDescription('')
    setRoundingMode('last_month')
    setPreview(null)
    setPreviewError('')
    setResultMessage('')
    setResultError('')
  }, [currentYear])

  return (
    <div className="page-content">
      <DataPanel title="Yıllık Aidat Dağıtım Sihirbazı">
        <div className="aidat-dist-form">
          <div className="aidat-dist-form-row">
            <label className="form-label">
              Dağıtım Yılı
              <input
                type="number"
                className="form-input"
                value={year}
                onChange={(e) => { setYear(Number(e.target.value)); setPreview(null) }}
                min={2020}
                max={2050}
              />
            </label>

            <label className="form-label">
              Başlangıç Ayı
              <select
                className="form-input"
                value={startMonth}
                onChange={(e) => { setStartMonth(Number(e.target.value)); setPreview(null) }}
              >
                {MONTH_NAMES.map((name, i) => (
                  <option key={i + 1} value={i + 1}>{name}</option>
                ))}
              </select>
            </label>

            <label className="form-label">
              Ay Sayısı
              <input
                type="number"
                className="form-input"
                value={monthCount}
                onChange={(e) => { setMonthCount(Number(e.target.value)); setPreview(null) }}
                min={1}
                max={24}
              />
            </label>

            <label className="form-label">
              Yıllık Toplam Tutar (₺)
              <MoneyAmountInput
                className="form-input"
                value={totalAmount}
                onValueChange={(value) => { setTotalAmount(value); setPreview(null) }}
                placeholder="3.774.400,00"
              />
            </label>

            <label className="form-label">
              Son Ödeme Günü
              <select
                className="form-input"
                value={lastPaymentDay}
                onChange={(e) => setLastPaymentDay(Number(e.target.value))}
              >
                <option value={0}>Ayarlardan (varsayılan)</option>
                {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
                <option value={-1}>Ayın son günü</option>
              </select>
            </label>
          </div>

          <div className="aidat-dist-form-row">
            <label className="form-label form-label--wide">
              Açıklama
              <input
                type="text"
                className="form-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="2026 yılı genel kurul kararı yıllık aidat dağıtımı"
              />
            </label>

            <label className="form-label">
              Küsurat Farkı Uygulaması
              <select
                className="form-input"
                value={roundingMode}
                onChange={(e) => { setRoundingMode(e.target.value as AidatDistributionRoundingMode); setPreview(null) }}
              >
                {ROUNDING_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="aidat-dist-actions">
            <button
              className="btn btn-primary"
              onClick={handlePreview}
              disabled={loading || parsedAmount <= 0}
            >
              {loading ? 'Hesaplanıyor...' : 'Hesapla / Önizle'}
            </button>
            <button className="btn btn-secondary" onClick={handleClear}>
              Temizle
            </button>
          </div>
        </div>
      </DataPanel>

      {previewError && (
        <div className="alert alert-error">{previewError}</div>
      )}

      {resultMessage && (
        <div className="alert alert-success">{resultMessage}</div>
      )}

      {resultError && (
        <div className="alert alert-error">{resultError}</div>
      )}

      {preview && (
        <>
          <div className="aidat-dist-summary-cards">
            <SummaryCard label="Aktif Üye" value={String(preview.activeMemberCount)} />
            <SummaryCard label="Toplam Pay Oranı" value={formatShareRatioTr(preview.totalShareRatio)} />
            <SummaryCard label="1 Pay Yıllık Aidat" value={`${formatMoney(preview.yearlyPerMember)} ₺`} />
            <SummaryCard label="1 Pay Aylık Aidat" value={`${formatMoney(preview.monthlyPerMember)} ₺`} />
            <SummaryCard label="Oluşturulacak Kayıt" value={String(preview.totalRecords)} />
            <SummaryCard label="Oluşturulacak Toplam Aidat" value={`${formatMoney(preview.totalAmount)} ₺`} />
            {preview.roundingDifference !== 0 && (
              <SummaryCard
                label="Küsurat Farkı"
                value={`${formatMoney(preview.roundingDifference)} ₺`}
                warn
              />
            )}
          </div>

          {preview.skippedTotal > 0 && (
            <div className="alert alert-warning">
              Seçilen dönemlerde {preview.skippedTotal} mevcut aidat kaydı bulundu. Bu kayıtlar atlanacak, sadece eksik olanlar oluşturulacak.
            </div>
          )}

          <DataPanel title="Üye Bazlı Aylık Dağıtım Önizlemesi">
            <div className="aidat-dist-preview-search">
              <input
                type="search"
                className="field-input field-input--search"
                placeholder="Üye no, ad, TC, telefon..."
                value={previewPartnerSearch}
                onChange={(e) => setPreviewPartnerSearch(e.target.value)}
              />
            </div>
            <div className="table-wrap aidat-dist-partner-preview">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Üye No</th>
                    <th>Ad Soyad / Ünvan</th>
                    <th style={{ textAlign: 'right' }}>Pay Oranı</th>
                    <th style={{ textAlign: 'right' }}>Aylık Aidat</th>
                    <th style={{ textAlign: 'right' }}>Yıllık Aidat</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPreviewPartners.map((row: AidatDistributionPartnerPreview) => (
                    <tr key={row.partner_id}>
                      <td>{row.partner_no}</td>
                      <td>{row.full_name}</td>
                      <td style={{ textAlign: 'right' }}>{formatShareRatioTr(row.share_ratio)}</td>
                      <td style={{ textAlign: 'right' }}>{formatMoney(row.monthly_amount)} ₺</td>
                      <td style={{ textAlign: 'right' }}>{formatMoney(row.yearly_amount)} ₺</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DataPanel>

          {preview.skippedTotal > 0 && (
            <DataPanel title="Mevcut Aidat Kaydı Olanlar">
              <div className="table-wrap aidat-dist-partner-preview">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Üye No</th>
                      <th>Ad Soyad / Ünvan</th>
                      <th>Dönem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSkippedPartners.map((row: AidatDistributionSkippedPreview) => (
                      <tr key={`${row.partner_id}-${row.year}-${row.month}`}>
                        <td>{row.partner_no}</td>
                        <td>{row.full_name}</td>
                        <td>{row.label}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DataPanel>
          )}

          <DataPanel title="Aylık Dağıtım Önizlemesi">
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Dönem</th>
                    <th style={{ textAlign: 'right' }}>Oluşturulacak Kayıt</th>
                    <th style={{ textAlign: 'right' }}>1 Pay Aylık (ref.)</th>
                    <th style={{ textAlign: 'right' }}>Dönem Toplamı</th>
                    {preview.skippedTotal > 0 && <th style={{ textAlign: 'right' }}>Atlanan</th>}
                  </tr>
                </thead>
                <tbody>
                  {preview.months.map((m: AidatDistributionMonthPreview) => (
                    <tr key={`${m.year}-${m.month}`}>
                      <td>{m.label}</td>
                      <td style={{ textAlign: 'right' }}>{m.memberCount}</td>
                      <td style={{ textAlign: 'right' }}>{formatMoney(m.amountPerMember)} ₺</td>
                      <td style={{ textAlign: 'right' }}>{formatMoney(m.monthTotal)} ₺</td>
                      {preview.skippedTotal > 0 && (
                        <td style={{ textAlign: 'right' }}>{m.skippedCount > 0 ? m.skippedCount : '—'}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td><strong>Toplam</strong></td>
                    <td style={{ textAlign: 'right' }}><strong>{preview.totalRecords}</strong></td>
                    <td></td>
                    <td style={{ textAlign: 'right' }}><strong>{formatMoney(preview.totalAmount)} ₺</strong></td>
                    {preview.skippedTotal > 0 && (
                      <td style={{ textAlign: 'right' }}><strong>{preview.skippedTotal}</strong></td>
                    )}
                  </tr>
                </tfoot>
              </table>
            </div>

            {canWrite && (
              <div className="aidat-dist-actions" style={{ marginTop: '1rem' }}>
                <button
                  className="btn btn-success"
                  onClick={handleExecute}
                  disabled={executing || preview.totalRecords === 0}
                >
                  {executing ? 'Oluşturuluyor...' : 'Aidatları Oluştur'}
                </button>
              </div>
            )}

            {!canWrite && (
              <div className="alert alert-info" style={{ marginTop: '1rem' }}>
                Aidat kayıtlarını oluşturmak için yazma yetkiniz gereklidir.
              </div>
            )}
          </DataPanel>
        </>
      )}

      <DataPanel title="Dağıtım Geçmişi">
        {batchesLoading ? (
          <p>Yükleniyor...</p>
        ) : batches.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', padding: '1rem 0' }}>Henüz toplu dağıtım yapılmamış.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>Yıl</th>
                  <th>Dönem</th>
                  <th style={{ textAlign: 'right' }}>Üye</th>
                  <th style={{ textAlign: 'right' }}>Aylık</th>
                  <th style={{ textAlign: 'right' }}>Toplam</th>
                  <th style={{ textAlign: 'right' }}>Oluşturulan</th>
                  <th style={{ textAlign: 'right' }}>Atlanan</th>
                  <th>Açıklama</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.id}>
                    <td>{new Date(b.created_at).toLocaleDateString('tr-TR')}</td>
                    <td>{b.year}</td>
                    <td>{MONTH_NAMES[b.start_month - 1]} — {MONTH_NAMES[((b.start_month - 1 + b.month_count - 1) % 12)]} ({b.month_count} ay)</td>
                    <td style={{ textAlign: 'right' }}>{b.active_member_count}</td>
                    <td style={{ textAlign: 'right' }}>{formatMoney(b.monthly_amount)} ₺</td>
                    <td style={{ textAlign: 'right' }}>{formatMoney(b.total_amount)} ₺</td>
                    <td style={{ textAlign: 'right' }}>{b.created_due_count}</td>
                    <td style={{ textAlign: 'right' }}>{b.skipped_due_count}</td>
                    <td>{b.description || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DataPanel>
    </div>
  )
}

function SummaryCard({ label, value, warn }: { label: string; value: string; warn?: boolean }): JSX.Element {
  return (
    <div className={`aidat-dist-card${warn ? ' aidat-dist-card--warn' : ''}`}>
      <div className="aidat-dist-card__label">{label}</div>
      <div className="aidat-dist-card__value">{value}</div>
    </div>
  )
}
