import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DataPanel from '../../components/ui/DataPanel'
import EmptyState from '../../components/ui/EmptyState'
import { platformApi, platformErrorMessage, type PlatformOnlineUser } from '../../platform/platformApi'
import { formatDateTime } from '../../utils/format'
import { useRevokeSessions } from './PlatformUsersPage'
import { PageHeader, RoleBadge } from './platformUi'

const REFRESH_MS = 30_000

function secondsAgo(iso: string | null): string {
  if (!iso) return '—'
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000))
  if (s < 60) return `${s} sn önce`
  return `${Math.floor(s / 60)} dk önce`
}

export default function PlatformOnlinePage(): JSX.Element {
  const [rows, setRows] = useState<PlatformOnlineUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [auto, setAuto] = useState(true)
  const revoke = useRevokeSessions(() => void load())

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setRows(await platformApi.listOnline())
    } catch (err) {
      setError(platformErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!auto) return
    const t = setInterval(() => void load(), REFRESH_MS)
    return () => clearInterval(t)
  }, [auto, load])

  return (
    <div className="pf-page">
      <PageHeader
        title="Çevrimiçi Kullanıcılar"
        subtitle="Son 5 dakikada aktif olan kullanıcılar"
        actions={
          <>
            <label className="platform-check" style={{ margin: 0 }}>
              <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
              Otomatik yenile (30 sn)
            </label>
            <button type="button" className="btn btn-sm" onClick={() => void load()} disabled={loading}>
              Yenile
            </button>
          </>
        }
      />
      <DataPanel title={`Çevrimiçi (${rows.length})`} noPadding>
        {error && <div className="alert alert-error platform-inline-alert">{error}</div>}
        {loading && rows.length === 0 ? (
          <div className="page-loading">Yükleniyor...</div>
        ) : rows.length === 0 ? (
          <EmptyState message="Şu an çevrimiçi kullanıcı yok." compact />
        ) : (
          <div className="table-wrap table-wrap--compact table-wrap--scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Kullanıcı</th>
                  <th>Kooperatif</th>
                  <th>Son Görülme</th>
                  <th>IP</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <span className="pf-online-dot" aria-hidden />
                      <strong>{u.fullName}</strong>
                      <div className="cell-mono platform-muted">{u.email}</div>
                    </td>
                    <td>
                      <div className="pf-chip-list">
                        {u.memberships.map((m) => (
                          <span key={m.tenantId} className="pf-chip">
                            <Link to={`/platform/tenants/${encodeURIComponent(m.tenantId)}`} className="pf-link">
                              {m.tenantName}
                            </Link>
                            <RoleBadge role={m.role} />
                          </span>
                        ))}
                      </div>
                    </td>
                    <td title={formatDateTime(u.lastSeenAt)}>{secondsAgo(u.lastSeenAt)}</td>
                    <td className="cell-mono">{u.lastSeenIp || '—'}</td>
                    <td>
                      <button type="button" className="btn btn-sm btn-danger" onClick={() => void revoke(u)}>
                        Oturumu Kapat
                      </button>
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
