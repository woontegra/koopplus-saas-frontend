import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import DataPanel from '../../components/ui/DataPanel'
import EmptyState from '../../components/ui/EmptyState'
import StatPanel from '../../components/ui/StatPanel'
import { platformApi, platformErrorMessage, type PlatformOverview } from '../../platform/platformApi'
import { formatDate, formatDateTime } from '../../utils/format'
import { Badge, DaysLeftBadge, PageHeader, TenantStatusBadge } from './platformUi'

const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']

function shortDay(iso: string): string {
  const [, m, d] = iso.split('-')
  return `${d}.${m}`
}

function shortMonth(key: string): string {
  const [y, m] = key.split('-')
  return `${MONTHS[Number(m) - 1] ?? m} ${y.slice(2)}`
}

const AXIS = { fontSize: 11, fill: '#64748b' }

export default function PlatformOverviewPage(): JSX.Element {
  const navigate = useNavigate()
  const [data, setData] = useState<PlatformOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData(await platformApi.overview())
    } catch (err) {
      setError(platformErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const goTenant = (id: string): void => navigate(`/platform/tenants/${encodeURIComponent(id)}`)

  return (
    <div className="pf-page">
      <PageHeader
        title="Genel Bakış"
        subtitle={data ? `Son güncelleme: ${formatDateTime(data.generatedAt)}` : 'Platform durumu'}
        actions={
          <button type="button" className="btn btn-sm" onClick={() => void load()} disabled={loading}>
            Yenile
          </button>
        }
      />

      {error && <div className="alert alert-error">{error}</div>}
      {loading && !data && <div className="page-loading">Yükleniyor...</div>}

      {data && (
        <>
          <div className="pf-cards">
            <StatPanel size="hero" label="Toplam Kooperatif" value={data.cards.total} variant="info" />
            <StatPanel size="hero" label="Yıllık Aktif" value={data.cards.yearlyActive} variant="credit" />
            <StatPanel size="hero" label="Demo Aktif" value={data.cards.demoActive} variant="accent" />
            <StatPanel size="hero" label="Askıda" value={data.cards.suspended} variant={data.cards.suspended > 0 ? 'danger' : 'default'} />
            <StatPanel size="hero" label="Arşiv" value={data.cards.archived} />
            <StatPanel
              size="hero"
              label="7 Gün İçinde Bitecek"
              value={data.cards.expiringSoon}
              variant={data.cards.expiringSoon > 0 ? 'danger' : 'default'}
            />
            <StatPanel size="hero" label="Süresi Dolmuş" value={data.cards.expired} variant={data.cards.expired > 0 ? 'danger' : 'default'} />
            <StatPanel size="hero" label="Toplam Üye" value={data.cards.memberTotal.toLocaleString('tr-TR')} />
            <StatPanel size="hero" label="Toplam Kullanıcı" value={data.cards.userTotal.toLocaleString('tr-TR')} />
          </div>

          <div className="pf-cards pf-cards--logins">
            <StatPanel label="Bugün Giriş (tekil)" value={data.logins.uniqueToday} />
            <StatPanel label="Son 7 Gün (tekil)" value={data.logins.uniqueLast7Days} />
            <StatPanel label="Son 30 Gün (tekil)" value={data.logins.uniqueLast30Days} />
            <StatPanel
              label="Şu An Çevrimiçi"
              value={data.logins.onlineNow}
              variant="credit"
              onClick={() => navigate('/platform/online')}
            />
          </div>

          <div className="pf-grid-2">
            <DataPanel title="Günlük Giriş" subtitle="Son 30 gün">
              <div className="pf-chart">
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={data.charts.dailyLogins} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tickFormatter={shortDay} tick={AXIS} interval={4} />
                    <YAxis allowDecimals={false} tick={AXIS} />
                    <Tooltip
                      labelFormatter={(l) => formatDate(String(l))}
                      formatter={(v) => [String(v), 'Giriş']}
                    />
                    <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </DataPanel>

            <DataPanel title="Yeni Kooperatifler" subtitle="Son 12 ay">
              <div className="pf-chart">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data.charts.monthlyTenants} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" tickFormatter={shortMonth} tick={AXIS} />
                    <YAxis allowDecimals={false} tick={AXIS} />
                    <Tooltip
                      labelFormatter={(l) => shortMonth(String(l))}
                      formatter={(v) => [String(v), 'Kooperatif']}
                    />
                    <Bar dataKey="count" fill="#0f2744" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </DataPanel>
          </div>

          <div className="pf-grid-2">
            <DataPanel title="Süresi Dolmak Üzere" subtitle="7 gün içinde" noPadding>
              {data.alerts.expiringSoon.length === 0 ? (
                <EmptyState message="Süresi yaklaşan kooperatif yok." compact />
              ) : (
                <ul className="pf-list">
                  {data.alerts.expiringSoon.map((a) => (
                    <li key={a.id}>
                      <button type="button" className="pf-list__row" onClick={() => goTenant(a.id)}>
                        <span className="pf-list__main">
                          <strong>{a.name}</strong>
                          {a.isDemo && <Badge tone="yellow">Demo</Badge>}
                        </span>
                        <span className="pf-list__side">
                          {formatDate(a.expiresAt)} <DaysLeftBadge days={a.daysLeft} />
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </DataPanel>

            <DataPanel title="Süresi Dolmuş" subtitle="Aktif/askıdaki kooperatifler" noPadding>
              {data.alerts.expired.length === 0 ? (
                <EmptyState message="Süresi dolmuş kooperatif yok." compact />
              ) : (
                <ul className="pf-list">
                  {data.alerts.expired.map((a) => (
                    <li key={a.id}>
                      <button type="button" className="pf-list__row" onClick={() => goTenant(a.id)}>
                        <span className="pf-list__main">
                          <strong>{a.name}</strong>
                          <TenantStatusBadge status={a.status} />
                        </span>
                        <span className="pf-list__side">{formatDate(a.expiresAt)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </DataPanel>
          </div>

          <div className="pf-grid-2">
            <DataPanel title="14 Gündür Giriş Yok" subtitle="Aktif kooperatifler" noPadding>
              {data.alerts.inactive14d.length === 0 ? (
                <EmptyState message="Pasif kooperatif yok." compact />
              ) : (
                <ul className="pf-list pf-list--scroll">
                  {data.alerts.inactive14d.map((a) => (
                    <li key={a.id}>
                      <button type="button" className="pf-list__row" onClick={() => goTenant(a.id)}>
                        <span className="pf-list__main">
                          <strong>{a.name}</strong>
                        </span>
                        <span className="pf-list__side platform-muted">
                          {a.lastUserLoginAt ? formatDateTime(a.lastUserLoginAt) : 'Hiç giriş yok'}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </DataPanel>

            <DataPanel title="Başarısız Giriş Uyarıları" subtitle="Son 24 saatte 5+ hata" noPadding>
              {data.alerts.failedLogins.length === 0 ? (
                <EmptyState message="Şüpheli giriş denemesi yok." compact />
              ) : (
                <ul className="pf-list pf-list--scroll">
                  {data.alerts.failedLogins.map((a) => (
                    <li key={a.email} className="pf-list__row pf-list__row--static">
                      <span className="pf-list__main cell-mono">{a.email}</span>
                      <Badge tone="red">{a.failures} hata</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </DataPanel>
          </div>

          <DataPanel title="En Aktif Kooperatifler" subtitle="Son girişe göre ilk 10" noPadding>
            {data.charts.topActive.length === 0 ? (
              <EmptyState message="Henüz giriş verisi yok." compact />
            ) : (
              <div className="table-wrap table-wrap--compact">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Kooperatif</th>
                      <th className="text-right">Üye</th>
                      <th>Son Giriş</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.charts.topActive.map((t) => (
                      <tr key={t.id}>
                        <td>{t.rank}</td>
                        <td>
                          <Link to={`/platform/tenants/${encodeURIComponent(t.id)}`} className="pf-link">
                            {t.name}
                          </Link>
                        </td>
                        <td className="text-right">{t.memberCount}</td>
                        <td>{formatDateTime(t.lastUserLoginAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </DataPanel>
        </>
      )}
    </div>
  )
}
