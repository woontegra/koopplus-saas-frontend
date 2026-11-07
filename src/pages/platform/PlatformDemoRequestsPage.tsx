import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DataPanel from '../../components/ui/DataPanel'
import EmptyState from '../../components/ui/EmptyState'
import {
  platformApi,
  platformErrorMessage,
  type PlatformDemoRequest
} from '../../platform/platformApi'
import { formatDateTime } from '../../utils/format'
import { PageHeader } from './platformUi'

const STATUS_TR: Record<string, string> = {
  PENDING: 'Onay bekliyor',
  CONFIRMED: 'Onaylandı',
  REJECTED: 'Reddedildi'
}

export default function PlatformDemoRequestsPage(): JSX.Element {
  const [items, setItems] = useState<PlatformDemoRequest[]>([])
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await platformApi.listDemoRequests({
        status: status || undefined,
        limit: 100
      })
      setItems(data.items)
      setTotal(data.total)
    } catch (err) {
      setError(platformErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="pf-page">
      <PageHeader
        title="Demo Talepleri"
        subtitle="Web sitesinden gelen demo istekleri (onay bekleyenler dahil)"
        actions={
          <button type="button" className="btn btn-sm" onClick={() => void load()} disabled={loading}>
            Yenile
          </button>
        }
      />
      <DataPanel
        title={`Talepler (${total})`}
        noPadding
        actions={
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Durum filtresi"
          >
            <option value="">Tümü</option>
            <option value="PENDING">Onay bekliyor</option>
            <option value="CONFIRMED">Onaylandı</option>
            <option value="REJECTED">Reddedildi</option>
          </select>
        }
      >
        {error && <div className="alert alert-error platform-inline-alert">{error}</div>}
        {loading && items.length === 0 ? (
          <div className="page-loading">Yükleniyor...</div>
        ) : items.length === 0 ? (
          <EmptyState message="Demo talebi bulunamadı." compact />
        ) : (
          <div className="table-wrap table-wrap--compact table-wrap--scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Talep</th>
                  <th>Ad</th>
                  <th>E-posta</th>
                  <th>Telefon</th>
                  <th>Kooperatif</th>
                  <th>İl / İlçe</th>
                  <th>IP</th>
                  <th>Durum</th>
                  <th>KVKK</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id}>
                    <td>{formatDateTime(row.createdAt)}</td>
                    <td>{row.fullName}</td>
                    <td>{row.email}</td>
                    <td>{row.phone || '—'}</td>
                    <td>
                      {row.tenantId ? (
                        <Link to={`/platform/tenants/${encodeURIComponent(row.tenantId)}`} className="pf-link">
                          {row.cooperativeName}
                        </Link>
                      ) : (
                        row.cooperativeName
                      )}
                    </td>
                    <td>
                      {[row.city, row.district].filter(Boolean).join(' / ') || '—'}
                    </td>
                    <td className="cell-mono">{row.clientIp || '—'}</td>
                    <td>{STATUS_TR[row.status] || row.status}</td>
                    <td title={row.kvkkConsentVersion}>
                      {formatDateTime(row.kvkkConsentAt)}
                      <div className="platform-muted" style={{ fontSize: 11 }}>
                        {row.kvkkConsentVersion}
                      </div>
                    </td>
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
