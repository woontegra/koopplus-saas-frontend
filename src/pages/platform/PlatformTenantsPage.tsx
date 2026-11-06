import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import DataPanel from '../../components/ui/DataPanel'
import EmptyState from '../../components/ui/EmptyState'
import { platformApi, platformErrorMessage, type PlatformTenant } from '../../platform/platformApi'
import { formatDate, formatDateTime } from '../../utils/format'
import {
  BackupModal,
  CreateTenantModal,
  DeleteTenantModal,
  ExtendModal,
  RestoreModal,
  StatusModal
} from './TenantModals'
import {
  DaysLeftBadge,
  PageHeader,
  TenantStatusBadge,
  TypeBadge,
  effectiveExpiry,
  tenantDaysLeft,
  useEnterSupport
} from './platformUi'

type StatusFilter = 'ALL' | 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED'
type TypeFilter = 'ALL' | 'DEMO' | 'YEARLY'

type Dialog =
  | { kind: 'create' }
  | { kind: 'extend'; tenant: PlatformTenant }
  | { kind: 'status'; tenant: PlatformTenant }
  | { kind: 'delete'; tenant: PlatformTenant }
  | { kind: 'backup'; tenant: PlatformTenant }
  | { kind: 'restore'; tenant: PlatformTenant }
  | null

export default function PlatformTenantsPage(): JSX.Element {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { busyId, enterSupport } = useEnterSupport()
  const [tenants, setTenants] = useState<PlatformTenant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL')
  const [dialog, setDialog] = useState<Dialog>(null)

  useEffect(() => {
    if (searchParams.get('create') !== '1') return
    setDialog({ kind: 'create' })
    setSearchParams({}, { replace: true })
  }, [searchParams, setSearchParams])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setTenants(await platformApi.listTenants())
    } catch (err) {
      setError(platformErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('tr-TR')
    return tenants.filter((t) => {
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false
      if (typeFilter === 'DEMO' && !t.isDemo) return false
      if (typeFilter === 'YEARLY' && t.isDemo) return false
      if (q && !t.name.toLocaleLowerCase('tr-TR').includes(q)) return false
      return true
    })
  }, [tenants, search, statusFilter, typeFilter])

  return (
    <div className="pf-page">
      <PageHeader
        title="Kooperatifler"
        subtitle={`${filtered.length} / ${tenants.length} kooperatif`}
        actions={
          <>
            <button type="button" className="btn btn-sm" onClick={() => void load()} disabled={loading}>
              Yenile
            </button>
            <button type="button" className="btn btn-sm btn-primary" onClick={() => setDialog({ kind: 'create' })}>
              Yeni Kooperatif / Demo
            </button>
          </>
        }
      />

      <DataPanel
        title="Tüm Kiracılar"
        noPadding
        actions={
          <>
            <input
              className="platform-search"
              type="search"
              placeholder="Kooperatif ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="platform-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            >
              <option value="ALL">Tüm durumlar</option>
              <option value="ACTIVE">Aktif</option>
              <option value="SUSPENDED">Askıda</option>
              <option value="ARCHIVED">Arşiv</option>
            </select>
            <select
              className="platform-filter"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
            >
              <option value="ALL">Tüm türler</option>
              <option value="YEARLY">Yıllık</option>
              <option value="DEMO">Demo</option>
            </select>
          </>
        }
      >
        {error && <div className="alert alert-error platform-inline-alert">{error}</div>}
        {loading && tenants.length === 0 ? (
          <div className="page-loading">Kooperatifler yükleniyor...</div>
        ) : filtered.length === 0 ? (
          <EmptyState message="Kriterlere uyan kooperatif bulunamadı." compact />
        ) : (
          <div className="table-wrap table-wrap--compact table-wrap--scroll">
            <table className="data-table data-table--selectable">
              <thead>
                <tr>
                  <th>Kooperatif</th>
                  <th>Tür</th>
                  <th>Durum</th>
                  <th>Bitiş</th>
                  <th>Kalan</th>
                  <th className="text-right">Üye</th>
                  <th className="text-right">Kullanıcı</th>
                  <th>Son Giriş</th>
                  <th>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => {
                  const expiry = effectiveExpiry(t)
                  return (
                    <tr key={t.id} className="clickable" onClick={() => navigate(`/platform/tenants/${encodeURIComponent(t.id)}`)}>
                      <td>
                        <Link
                          to={`/platform/tenants/${encodeURIComponent(t.id)}`}
                          className="pf-link"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {t.name}
                        </Link>
                      </td>
                      <td>
                        <TypeBadge isDemo={t.isDemo} />
                      </td>
                      <td>
                        <TenantStatusBadge status={t.status} />
                      </td>
                      <td>{expiry ? formatDate(expiry) : '—'}</td>
                      <td>
                        <DaysLeftBadge days={tenantDaysLeft(t)} />
                      </td>
                      <td className="text-right">{t.memberCount}</td>
                      <td className="text-right">{t.userCount}</td>
                      <td>{formatDateTime(t.lastUserLoginAt)}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="settings-row-actions platform-row-actions">
                          <button
                            type="button"
                            className="btn btn-sm btn-accent"
                            disabled={busyId === t.id || t.status !== 'ACTIVE'}
                            title={t.status !== 'ACTIVE' ? 'Yalnız aktif kooperatiflere girilebilir' : 'Destek modunda gir'}
                            onClick={() => void enterSupport(t)}
                          >
                            Destek
                          </button>
                          <button type="button" className="btn btn-sm" onClick={() => setDialog({ kind: 'extend', tenant: t })}>
                            Süre
                          </button>
                          <button type="button" className="btn btn-sm" onClick={() => setDialog({ kind: 'status', tenant: t })}>
                            Durum
                          </button>
                          <button type="button" className="btn btn-sm" onClick={() => setDialog({ kind: 'backup', tenant: t })}>
                            Yedek
                          </button>
                          <button type="button" className="btn btn-sm" onClick={() => setDialog({ kind: 'restore', tenant: t })}>
                            Geri Yükle
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            disabled={t.status !== 'ARCHIVED'}
                            title={t.status !== 'ARCHIVED' ? 'Yalnızca arşivlenmiş kooperatifler silinebilir' : 'Kalıcı sil'}
                            onClick={() => setDialog({ kind: 'delete', tenant: t })}
                          >
                            Sil
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </DataPanel>

      {dialog?.kind === 'create' && <CreateTenantModal onClose={() => setDialog(null)} onCreated={() => void load()} />}
      {dialog?.kind === 'extend' && (
        <ExtendModal tenant={dialog.tenant} onClose={() => setDialog(null)} onSaved={() => void load()} />
      )}
      {dialog?.kind === 'status' && (
        <StatusModal tenant={dialog.tenant} onClose={() => setDialog(null)} onSaved={() => void load()} />
      )}
      {dialog?.kind === 'delete' && (
        <DeleteTenantModal tenant={dialog.tenant} onClose={() => setDialog(null)} onDeleted={() => void load()} />
      )}
      {dialog?.kind === 'backup' && <BackupModal tenant={dialog.tenant} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'restore' && (
        <RestoreModal tenant={dialog.tenant} onClose={() => setDialog(null)} onDone={() => void load()} />
      )}
    </div>
  )
}
