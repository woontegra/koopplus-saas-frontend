import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DataPanel from '../../components/ui/DataPanel'
import EmptyState from '../../components/ui/EmptyState'
import { useActionToast } from '../../hooks/useActionToast'
import { useAskDialog } from '../../hooks/useAskDialog'
import {
  platformApi,
  platformErrorMessage,
  type PlatformGlobalUser,
  type PlatformPage
} from '../../platform/platformApi'
import { formatDateTime } from '../../utils/format'
import { Badge, PageHeader, Pagination, RoleBadge } from './platformUi'

const PAGE_SIZE = 50

export function useRevokeSessions(onDone?: () => void): (u: { id: string; email: string }) => Promise<void> {
  const toast = useActionToast()
  const ask = useAskDialog()
  return async (u) => {
    const ok = await ask.confirm(
      `“${u.email}” kullanıcısının tüm açık oturumları sonlandırılacak. Kullanıcı yeniden giriş yapmak zorunda kalır.`,
      { title: 'Oturumları Sonlandır', confirmLabel: 'Sonlandır', variant: 'warning' }
    )
    if (!ok) return
    try {
      await platformApi.revokeSessions(u.id)
      toast.success('Oturumlar sonlandırıldı', u.email)
      onDone?.()
    } catch (err) {
      toast.fail('Oturumlar sonlandırılamadı', platformErrorMessage(err))
    }
  }
}

export default function PlatformUsersPage(): JSX.Element {
  const [data, setData] = useState<PlatformPage<PlatformGlobalUser> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const revoke = useRevokeSessions(() => void load())

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData(await platformApi.listAllUsers({ q, page, pageSize: PAGE_SIZE }))
    } catch (err) {
      setError(platformErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [q, page])

  useEffect(() => {
    const t = setTimeout(() => void load(), 250)
    return () => clearTimeout(t)
  }, [load])

  return (
    <div className="pf-page">
      <PageHeader
        title="Kullanıcılar"
        subtitle={data ? `${data.total} kullanıcı (tüm kooperatifler)` : 'Tüm kooperatif kullanıcıları'}
        actions={
          <button type="button" className="btn btn-sm" onClick={() => void load()} disabled={loading}>
            Yenile
          </button>
        }
      />
      <DataPanel
        title="Tüm Kullanıcılar"
        noPadding
        actions={
          <input
            className="platform-search"
            type="search"
            placeholder="Ad veya e-posta ara..."
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setPage(1)
            }}
          />
        }
      >
        {error && <div className="alert alert-error platform-inline-alert">{error}</div>}
        {loading && !data ? (
          <div className="page-loading">Yükleniyor...</div>
        ) : !data || data.items.length === 0 ? (
          <EmptyState message="Kullanıcı bulunamadı." compact />
        ) : (
          <>
            <div className="table-wrap table-wrap--compact table-wrap--scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Kullanıcı</th>
                    <th>Kooperatifler</th>
                    <th>Durum</th>
                    <th>Son Giriş</th>
                    <th>Son Görülme</th>
                    <th className="text-right">Giriş Sayısı</th>
                    <th>İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <strong>{u.fullName}</strong>
                        <div className="cell-mono platform-muted">{u.email}</div>
                      </td>
                      <td>
                        <div className="pf-chip-list">
                          {u.memberships.length === 0 && <span className="platform-muted">—</span>}
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
                      <td>
                        <Badge tone={u.isActive ? 'green' : 'gray'}>{u.isActive ? 'Aktif' : 'Pasif'}</Badge>
                      </td>
                      <td>{formatDateTime(u.lastLoginAt)}</td>
                      <td>{formatDateTime(u.lastSeenAt)}</td>
                      <td className="text-right">{u.loginCount}</td>
                      <td>
                        <button type="button" className="btn btn-sm" onClick={() => void revoke(u)}>
                          Oturumları Kapat
                        </button>
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
