import { useEffect, useState } from 'react'
import type { DashboardMonthDetail } from '@shared/types'
import EmptyState from '../ui/EmptyState'
import { formatDate, formatMoney } from '../../utils/format'

interface DashboardMonthDetailModalProps {
  year: number
  month: number
  label: string
  onClose: () => void
}

export default function DashboardMonthDetailModal({
  year,
  month,
  label,
  onClose
}: DashboardMonthDetailModalProps): JSX.Element {
  const [detail, setDetail] = useState<DashboardMonthDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const loadDetail = async (): Promise<void> => {
      setLoading(true)
      setError('')
      const res = await window.api.dashboard.getMonthDetail(year, month)
      if (cancelled) return

      setLoading(false)
      if (res.success && res.data) {
        setDetail(res.data)
      } else {
        setDetail(null)
        setError(res.error ?? 'Ay detayı yüklenemedi')
      }
    }

    void loadDetail()
    return () => {
      cancelled = true
    }
  }, [year, month])

  return (
    <div className="modal-overlay">
      <div className="modal modal--wide">
        <div className="modal-header">
          <h3>{label} Aidat / Tahsilat Detayı</h3>
          <button type="button" className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body dashboard-month-detail">
          {loading && <div className="page-loading">Detay yükleniyor...</div>}
          {!loading && error && <div className="alert alert-error">{error}</div>}
          {!loading && detail && (
            <>
              <section className="dashboard-month-detail__section">
                <h4>Aidat Hareketleri</h4>
                {detail.dueMovements.length === 0 ? (
                  <EmptyState message="Bu ay için aidat kaydı bulunmuyor." compact />
                ) : (
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Üye No</th>
                          <th>Ad Soyad / Ünvan</th>
                          <th className="text-right">Girilen Aidat</th>
                          <th>Açıklama / Dönem</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.dueMovements.map((row, index) => (
                          <tr key={`${row.partnerNo}-${index}`}>
                            <td>{row.partnerNo}</td>
                            <td>{row.partnerName}</td>
                            <td className="money text-right">{formatMoney(row.amount)}</td>
                            <td>
                              {row.description?.trim() ? row.description : row.periodLabel}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section className="dashboard-month-detail__section">
                <h4>Tahsilat Hareketleri</h4>
                {detail.paymentMovements.length === 0 ? (
                  <EmptyState message="Bu ay için tahsilat kaydı bulunmuyor." compact />
                ) : (
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Üye No</th>
                          <th>Ad Soyad / Ünvan</th>
                          <th>Ödeme Tarihi</th>
                          <th className="text-right">Ödenen Tutar</th>
                          <th>Kaynak</th>
                          <th>Açıklama</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.paymentMovements.map((row, index) => (
                          <tr key={`${row.partnerNo}-${row.paymentDate}-${index}`}>
                            <td>{row.partnerNo}</td>
                            <td>{row.partnerName}</td>
                            <td>{formatDate(row.paymentDate)}</td>
                            <td className="money credit text-right">{formatMoney(row.amount)}</td>
                            <td>{row.sourceLabel}</td>
                            <td>{row.description?.trim() || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
