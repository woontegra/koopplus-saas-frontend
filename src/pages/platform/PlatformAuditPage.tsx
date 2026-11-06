import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DataPanel from '../../components/ui/DataPanel'
import EmptyState from '../../components/ui/EmptyState'
import { platformApi, platformErrorMessage, type PlatformAuditEntry, type PlatformPage } from '../../platform/platformApi'
import { formatDateTime } from '../../utils/format'
import { PageHeader, Pagination, detailText } from './platformUi'

const PAGE_SIZE = 50

export default function PlatformAuditPage(): JSX.Element {
  const [data, setData] = useState<PlatformPage<PlatformAuditEntry> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [action, setAction] = useState('')
  const [page, setPage] = useState(1)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData(await platformApi.auditLogs({ action: action.trim() || undefined, page, pageSize: PAGE_SIZE }))
    } catch (err) {
      setError(platformErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [action, page])

  useEffect(() => {
    const t = setTimeout(() => void load(), 250)
    return () => clearTimeout(t)
  }, [load])

  return (
    <div className="pf-page">
      <PageHeader
        title="Denetim Kaydı"
        subtitle="Platform yöneticisi işlemleri"
        actions={
          <button type="button" className="btn btn-sm" onClick={() => void load()} disabled={loading}>
            Yenile
          </button>
        }
      />
      <DataPanel
        title="Kayıtlar"
        noPadding
        actions={
          <input
            className="platform-search"
            type="search"
            placeholder="İşlem öneki (örn. tenant.)"
            value={action}
            onChange={(e) => {
              setAction(e.target.value)
              setPage(1)
            }}
          />
        }
      >
        {error && <div className="alert alert-error platform-inline-alert">{error}</div>}
        {loading && !data ? (
          <div className="page-loading">Yükleniyor...</div>
        ) : !data || data.items.length === 0 ? (
          <EmptyState message="Denetim kaydı bulunamadı." compact />
        ) : (
          <>
            <div className="table-wrap table-wrap--compact table-wrap--scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Tarih</th>
                    <th>Yönetici</th>
                    <th>İşlem</th>
                    <th>Kooperatif</th>
                    <th>Ayrıntı</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((r) => (
                    <tr key={r.id}>
                      <td>{formatDateTime(r.createdAt)}</td>
                      <td>{r.adminEmail || r.adminId || 'Sistem'}</td>
                      <td className="cell-mono">{r.action}</td>
                      <td>
                        {r.tenantId ? (
                          <Link to={`/platform/tenants/${encodeURIComponent(r.tenantId)}`} className="pf-link">
                            {r.tenantName || r.tenantId}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="cell-ellipsis" title={detailText(r.detail)}>
                        {detailText(r.detail)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />
          </>
        )}
      </DataPanel>
    </div>
  )
}
