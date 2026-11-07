import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DataPanel from '../../components/ui/DataPanel'
import EmptyState from '../../components/ui/EmptyState'
import {
  platformApi,
  platformErrorMessage,
  type PlatformIntegrationEvent
} from '../../platform/platformApi'
import { useActionToast } from '../../hooks/useActionToast'
import { formatDateTime } from '../../utils/format'
import { PageHeader } from './platformUi'

export default function PlatformIntegrationPage(): JSX.Element {
  const toast = useActionToast()
  const [items, setItems] = useState<PlatformIntegrationEvent[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retryingId, setRetryingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await platformApi.listIntegrationEvents({ limit: 100 })
      setItems(data.items)
      setTotal(data.total)
    } catch (err) {
      setError(platformErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const retry = async (id: string): Promise<void> => {
    setRetryingId(id)
    try {
      await platformApi.retryIntegrationEvent(id)
      toast.success('Yeniden denendi', 'Sipariş isteği tekrar işlendi.')
      await load()
    } catch (err) {
      toast.fail('Yeniden deneme başarısız', platformErrorMessage(err))
    } finally {
      setRetryingId(null)
    }
  }

  return (
    <div className="pf-page">
      <PageHeader
        title="Entegrasyon"
        subtitle="Web sitesi sipariş ve demo istekleri"
        actions={
          <button type="button" className="btn btn-sm" onClick={() => void load()} disabled={loading}>
            Yenile
          </button>
        }
      />
      <DataPanel title={`Olaylar (${total})`} noPadding>
        {error && <div className="alert alert-error platform-inline-alert">{error}</div>}
        {loading && items.length === 0 ? (
          <div className="page-loading">Yükleniyor...</div>
        ) : items.length === 0 ? (
          <EmptyState message="Henüz entegrasyon olayı yok." compact />
        ) : (
          <div className="table-wrap table-wrap--compact table-wrap--scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>Tür</th>
                  <th>Sipariş</th>
                  <th>E-posta</th>
                  <th>Sonuç</th>
                  <th>Hata</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id}>
                    <td>{formatDateTime(row.createdAt)}</td>
                    <td className="cell-mono">{row.kind}</td>
                    <td className="cell-mono">{row.orderId || '—'}</td>
                    <td>{row.email || '—'}</td>
                    <td>
                      <span className={row.result === 'SUCCESS' ? 'text-success' : 'text-danger'}>
                        {row.result}
                        {row.resultAction ? ` · ${row.resultAction}` : ''}
                      </span>
                      {row.tenantId ? (
                        <>
                          {' '}
                          <Link to={`/platform/tenants/${encodeURIComponent(row.tenantId)}`} className="pf-link">
                            kooperatif
                          </Link>
                        </>
                      ) : null}
                    </td>
                    <td className="cell-ellipsis" title={row.error || ''}>
                      {row.error || '—'}
                    </td>
                    <td>
                      {row.result === 'ERROR' &&
                        (row.kind === 'ORDER' || row.kind === 'ORDER_RETRY') && (
                          <button
                            type="button"
                            className="btn btn-xs"
                            disabled={retryingId === row.id}
                            onClick={() => void retry(row.id)}
                          >
                            {retryingId === row.id ? '…' : 'Tekrar dene'}
                          </button>
                        )}
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
