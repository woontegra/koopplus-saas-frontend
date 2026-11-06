import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Partner, PartnerDebtScheduleFilters, PartnerDebtScheduleReport } from '@shared/types'
import type { PartnerOpenDebtItem } from '@shared/partnerStatementModels'
import DataPanel from '../ui/DataPanel'
import PartnerSearchSelect from '../partners/PartnerSearchSelect'
import EmptyState from '../ui/EmptyState'
import StatPanel from '../ui/StatPanel'
import { formatDate, formatMoney } from '../../utils/format'

interface PartnerDebtSchedulePanelProps {
  partnerId?: number
  /** @deprecated partnerId kullanın */
  initialPartnerId?: number
  lockPartner?: boolean
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function buildDefaultFilters(partnerId: number): PartnerDebtScheduleFilters {
  return {
    partner_id: partnerId,
    report_date: todayISO(),
    show_closed: false,
    include_interest_detail_in_report: true,
    all_periods: true,
    include_calculated_interest_preview: true,
    only_recorded_interest: false,
    include_technical_matrix: true
  }
}

function DebtRowsTable({
  rows,
  emptyMessage
}: {
  rows: PartnerOpenDebtItem[]
  emptyMessage: string
}): JSX.Element {
  if (rows.length === 0) {
    return <EmptyState message={emptyMessage} />
  }

  return (
    <div className="table-wrap">
      <table className="data-table debt-schedule-open-table">
        <thead>
          <tr>
            <th>Borç Dönemi</th>
            <th className="num">Aidat Tutarı</th>
            <th className="num">Ana Paraya Mahsup</th>
            <th className="num">Kalan Ana Para</th>
            <th className="num">Bu Borçtan Kalan Faiz</th>
            <th className="num">Toplam Açık Borç</th>
            <th>Son Ödeme Tarihi</th>
            <th>Durum</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.ledger_entry_id}>
              <td>{row.due_period}</td>
              <td className="num nowrap">{formatMoney(row.due_amount)}</td>
              <td className="num nowrap">{formatMoney(row.paid_principal)}</td>
              <td className="num nowrap">{formatMoney(row.remaining_principal)}</td>
              <td className="num nowrap">{formatMoney(row.remaining_interest)}</td>
              <td className="num nowrap">{formatMoney(row.total_open_amount)}</td>
              <td className="nowrap">
                {row.last_payment_date ? formatDate(row.last_payment_date) : '—'}
              </td>
              <td>{row.status_label}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function PartnerDebtSchedulePanel({
  partnerId: partnerIdProp,
  initialPartnerId,
  lockPartner = false
}: PartnerDebtSchedulePanelProps): JSX.Element {
  const contextPartnerId = partnerIdProp ?? initialPartnerId ?? 0

  const [partners, setPartners] = useState<Partner[]>([])
  const [partnersLoading, setPartnersLoading] = useState(true)
  const [filters, setFilters] = useState<PartnerDebtScheduleFilters>(() =>
    buildDefaultFilters(contextPartnerId)
  )
  const [report, setReport] = useState<PartnerDebtScheduleReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [exportingExcel, setExportingExcel] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [printing, setPrinting] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [showInterestDetail, setShowInterestDetail] = useState(false)

  const resolvedPartnerId = lockPartner
    ? contextPartnerId
    : filters.partner_id || contextPartnerId

  const selectedPartner = useMemo(() => {
    if (resolvedPartnerId <= 0) return null
    return partners.find((partner) => partner.id === resolvedPartnerId) ?? null
  }, [partners, resolvedPartnerId])

  const activeFilters = useMemo(
    (): PartnerDebtScheduleFilters => ({
      ...filters,
      partner_id: resolvedPartnerId
    }),
    [filters, resolvedPartnerId]
  )

  useEffect(() => {
    let cancelled = false
    setPartnersLoading(true)

    const loadPartners = window.api.partners.list().then((res) => {
      if (!cancelled && res.success && res.data) {
        setPartners(res.data)
      }
    })

    const loadContextPartner =
      contextPartnerId > 0
        ? window.api.partners.get(contextPartnerId).then((res) => {
            if (!cancelled && res.success && res.data) {
              setPartners((current) => {
                if (current.some((partner) => partner.id === res.data!.id)) return current
                return [...current, res.data!]
              })
            }
          })
        : Promise.resolve()

    Promise.all([loadPartners, loadContextPartner]).finally(() => {
      if (!cancelled) setPartnersLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [contextPartnerId])

  useEffect(() => {
    if (contextPartnerId <= 0) return
    setFilters((current) => ({
      ...current,
      partner_id: contextPartnerId
    }))
    setReport(null)
    setError('')
  }, [contextPartnerId])

  const validateFilters = useCallback((): string | null => {
    if (partnersLoading && contextPartnerId > 0 && lockPartner) return null
    if (!resolvedPartnerId) return 'Lütfen bir üye seçin.'
    if (!filters.report_date) return 'Rapor tarihi zorunludur.'
    return null
  }, [partnersLoading, contextPartnerId, lockPartner, resolvedPartnerId, filters.report_date])

  const loadPreview = useCallback(async (): Promise<PartnerDebtScheduleReport | null> => {
    const validationError = validateFilters()
    if (validationError) {
      setError(validationError)
      setReport(null)
      return null
    }

    if (partnersLoading && lockPartner && contextPartnerId > 0) return null

    setLoading(true)
    setError('')
    setMessage('')
    const res = await window.api.reports.partnerDebtSchedule(activeFilters)
    setLoading(false)

    if (res.success && res.data) {
      setReport(res.data)
      return res.data
    }

    setReport(null)
    setError(res.error ?? 'Borç cetveli yüklenemedi')
    return null
  }, [activeFilters, validateFilters, partnersLoading, lockPartner, contextPartnerId])

  const handlePreview = async (): Promise<void> => {
    await loadPreview()
  }

  const handlePrint = async (): Promise<void> => {
    const validationError = validateFilters()
    if (validationError) {
      setError(validationError)
      return
    }
    setPrinting(true)
    setError('')
    setMessage('')
    try {
      const res = await window.api.documents.printPartnerDebtSchedule(activeFilters)
      if (res.success) {
        setMessage('Yazdırma önizlemesi tarayıcıda açıldı.')
      } else {
        setError(res.error ?? 'Yazdırma başlatılamadı. Lütfen tekrar deneyin.')
      }
    } catch {
      setError('Yazdırma başlatılamadı. Lütfen tekrar deneyin.')
    } finally {
      setPrinting(false)
    }
  }

  const handleExportPdf = async (): Promise<void> => {
    const validationError = validateFilters()
    if (validationError) {
      setError(validationError)
      return
    }
    setExportingPdf(true)
    setError('')
    setMessage('')
    try {
      const res = await window.api.documents.savePartnerDebtSchedulePdf(activeFilters)
      if (res.success && res.data) {
        setMessage(`PDF kaydedildi: ${res.data.file_path}`)
      } else if (res.error !== 'Kayıt iptal edildi') {
        setError(res.error ?? 'PDF oluşturulamadı. Lütfen tekrar deneyin.')
      }
    } catch {
      setError('PDF oluşturulamadı. Lütfen tekrar deneyin.')
    } finally {
      setExportingPdf(false)
    }
  }

  const handleExportExcel = async (): Promise<void> => {
    const validationError = validateFilters()
    if (validationError) {
      setError(validationError)
      return
    }
    setExportingExcel(true)
    setError('')
    setMessage('')
    try {
      const res = await window.api.reports.exportPartnerDebtScheduleExcel(activeFilters)
      if (res.success && res.data) {
        setMessage(`Excel dosyası kaydedildi: ${res.data.file_path}`)
      } else if (res.error !== 'Kayıt konumu seçilmedi') {
        setError(res.error ?? 'Excel aktarımı başarısız')
      }
    } catch {
      setError('Excel aktarımı başarısız. Lütfen tekrar deneyin.')
    } finally {
      setExportingExcel(false)
    }
  }

  const partnerInfoLabel = selectedPartner
    ? `Üye: ${selectedPartner.partner_no} — ${selectedPartner.full_name}`
    : partnersLoading && contextPartnerId > 0
      ? 'Üye bilgisi yükleniyor...'
      : null

  const actionsDisabled =
    loading || (partnersLoading && lockPartner && contextPartnerId > 0 && !selectedPartner)

  const statement = report?.open_debt_statement ?? null

  return (
    <div className="debt-schedule-panel">
      <DataPanel
        title="Üye Borç Cetveli"
        subtitle="Seçilen rapor tarihinde açık olan borçlar ve bugün ödenmesi gereken tutar"
        noPadding
      >
        <div className="debt-schedule-toolbar">
          <div className="debt-schedule-toolbar__filters">
            {lockPartner ? (
              partnerInfoLabel && (
                <div className="debt-schedule-toolbar__partner-info">{partnerInfoLabel}</div>
              )
            ) : (
              <div className="debt-schedule-toolbar__partner">
                <PartnerSearchSelect
                  partners={partners}
                  value={resolvedPartnerId > 0 ? resolvedPartnerId : ''}
                  placeholder="Üye no, ad, TC, telefon..."
                  onChange={(nextId) => {
                    setFilters({
                      ...filters,
                      partner_id: nextId ? nextId : 0
                    })
                    setReport(null)
                    setError('')
                  }}
                />
              </div>
            )}

            <label className="field">
              <span>Rapor Tarihi</span>
              <input
                type="date"
                className="field-input"
                value={filters.report_date ?? todayISO()}
                onChange={(e) => {
                  setFilters({ ...filters, report_date: e.target.value })
                  setReport(null)
                  setError('')
                }}
              />
            </label>

            <label className="field-checkbox">
              <input
                type="checkbox"
                checked={Boolean(filters.show_closed)}
                onChange={(e) => {
                  setFilters({ ...filters, show_closed: e.target.checked })
                  setReport(null)
                  setError('')
                }}
              />
              Kapalı Borçları da Göster
            </label>

            <label className="field-checkbox">
              <input
                type="checkbox"
                checked={filters.include_interest_detail_in_report !== false}
                onChange={(e) => {
                  setFilters({
                    ...filters,
                    include_interest_detail_in_report: e.target.checked
                  })
                }}
              />
              Faiz Hesap Ayrıntısını Rapora Ekle
            </label>
          </div>

          <div className="debt-schedule-toolbar__actions">
            <button
              type="button"
              className="btn btn-primary"
              disabled={actionsDisabled}
              onClick={() => void handlePreview()}
            >
              {loading ? 'Yükleniyor...' : 'Göster'}
            </button>
            <button
              type="button"
              className="btn"
              disabled={actionsDisabled || !statement}
              onClick={() => void handlePrint()}
            >
              {printing ? 'Açılıyor...' : 'Yazdır'}
            </button>
            <button
              type="button"
              className="btn"
              disabled={actionsDisabled || !statement}
              onClick={() => void handleExportPdf()}
            >
              {exportingPdf ? 'PDF...' : 'PDF'}
            </button>
            <button
              type="button"
              className="btn"
              disabled={actionsDisabled || !statement}
              onClick={() => void handleExportExcel()}
            >
              {exportingExcel ? 'Excel...' : 'Excel'}
            </button>
          </div>
        </div>

        {error ? <div className="form-error">{error}</div> : null}
        {message ? <div className="form-success">{message}</div> : null}

        {!statement ? (
          <EmptyState message="Borç cetveli için üye seçip Göster’e basın." />
        ) : (
          <div className="debt-schedule-statement">
            <div className="reports-summary partner-ledger-summary-cards--compact">
              <StatPanel
                label="Vadesi Geçmiş Kalan Aidat"
                value={formatMoney(statement.summary.overdue_remaining_principal)}
                variant="debit"
              />
              <StatPanel
                label="Kalan Gecikme Faizi"
                value={formatMoney(statement.summary.remaining_interest)}
                variant={statement.summary.remaining_interest > 0 ? 'debit' : undefined}
              />
              <StatPanel
                label="Bugün Ödenmesi Gereken"
                value={formatMoney(statement.summary.amount_due_today)}
                variant={statement.summary.amount_due_today > 0 ? 'debit' : undefined}
              />
              <StatPanel
                label="Vadesi Gelmeyen Aidat"
                value={formatMoney(statement.summary.not_yet_due_principal)}
              />
              <StatPanel
                label="Tüm Dönemler Genel Toplam"
                value={formatMoney(statement.summary.all_periods_total_debt)}
                variant={statement.summary.all_periods_total_debt > 0 ? 'debit' : undefined}
              />
              <StatPanel
                label="Son Ödeme Tarihi"
                value={
                  statement.summary.last_payment_date
                    ? formatDate(statement.summary.last_payment_date)
                    : '—'
                }
              />
              <StatPanel
                label="Son Gerçek Ödeme Tutarı"
                value={
                  statement.summary.last_payment_amount != null
                    ? formatMoney(statement.summary.last_payment_amount)
                    : '—'
                }
                variant="credit"
              />
            </div>

            <div className="debt-schedule-equation">
              <strong>Kalan Aidat + Kalan Gecikme Faizi = Bugün Ödenmesi Gereken</strong>
              <div className="debt-schedule-equation__values">{statement.summary.equation_label}</div>
            </div>

            <p className="muted debt-schedule-interest-note">{statement.interest_explanation}</p>

            <div className="debt-schedule-section">
              <h3>Açık Borçlar</h3>
              <DebtRowsTable
                rows={statement.overdue_debts}
                emptyMessage="Seçilen rapor tarihinde açık geçmiş borç bulunmuyor."
              />
            </div>

            {statement.not_yet_due_debts.length > 0 ? (
              <div className="debt-schedule-section">
                <h3>Vadesi Gelmeyen Aidatlar</h3>
                <DebtRowsTable
                  rows={statement.not_yet_due_debts}
                  emptyMessage="Vadesi gelmeyen aidat yok."
                />
              </div>
            ) : null}

            {statement.show_closed ? (
              <div className="debt-schedule-section">
                <h3>Kapanmış Borçlar</h3>
                <DebtRowsTable
                  rows={statement.closed_debts}
                  emptyMessage="Kapanmış borç bulunmuyor."
                />
              </div>
            ) : null}

            <div className="debt-schedule-section">
              <button
                type="button"
                className="btn"
                onClick={() => setShowInterestDetail((v) => !v)}
              >
                {showInterestDetail ? 'Faiz Hesap Ayrıntısını Gizle' : 'Faiz Hesap Ayrıntısı'}
              </button>
              {showInterestDetail ? (
                <div className="table-wrap" style={{ marginTop: 12 }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Faiz Ayı</th>
                        <th>Kaynak Borç Dönemi</th>
                        <th className="num">Açık Ana Para</th>
                        <th className="num">Faiz Oranı</th>
                        <th className="num">İşleyen Faiz</th>
                        <th className="num">Ödenen Faiz</th>
                        <th className="num">Kalan Faiz</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statement.interest_details.map((detail, index) => (
                        <tr key={`${detail.interest_month}-${detail.source_due_period}-${index}`}>
                          <td>{detail.interest_month}</td>
                          <td>{detail.source_due_period}</td>
                          <td className="num nowrap">{formatMoney(detail.open_principal)}</td>
                          <td className="num nowrap">%{detail.interest_rate}</td>
                          <td className="num nowrap">{formatMoney(detail.accrued_interest)}</td>
                          <td className="num nowrap">{formatMoney(detail.paid_interest)}</td>
                          <td className="num nowrap">{formatMoney(detail.remaining_interest)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </DataPanel>
    </div>
  )
}
