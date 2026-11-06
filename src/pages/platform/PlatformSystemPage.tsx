import { useCallback, useEffect, useState } from 'react'
import DataPanel from '../../components/ui/DataPanel'
import StatPanel from '../../components/ui/StatPanel'
import { useActionToast } from '../../hooks/useActionToast'
import {
  platformApi,
  platformErrorMessage,
  type PlatformPdfProbe,
  type PlatformSystemHealth
} from '../../platform/platformApi'
import { formatDateTime } from '../../utils/format'
import { Badge, PageHeader, formatBytes, formatUptime } from './platformUi'

function OkBadge({ ok }: { ok: boolean }): JSX.Element {
  return <Badge tone={ok ? 'green' : 'red'}>{ok ? 'Çalışıyor' : 'Hata'}</Badge>
}

export default function PlatformSystemPage(): JSX.Element {
  const toast = useActionToast()
  const [health, setHealth] = useState<PlatformSystemHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pdfBusy, setPdfBusy] = useState(false)
  const [pdf, setPdf] = useState<PlatformPdfProbe | null>(null)
  const [testTo, setTestTo] = useState('')
  const [mailBusy, setMailBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setHealth(await platformApi.systemHealth())
    } catch (err) {
      setError(platformErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const testPdf = async (): Promise<void> => {
    setPdfBusy(true)
    try {
      const res = await platformApi.pdfHealth()
      setPdf(res)
      if (res.pdfOk) toast.success('PDF motoru', 'PDF üretimi çalışıyor.')
      else toast.fail('PDF motoru', res.error ?? 'PDF motoru çalışmıyor.')
    } catch (err) {
      toast.fail('PDF testi başarısız', platformErrorMessage(err))
    } finally {
      setPdfBusy(false)
    }
  }

  const sendTestMail = async (): Promise<void> => {
    if (!testTo.trim() || !testTo.includes('@')) {
      toast.fail('Alıcı gerekli', 'Geçerli bir e-posta yazın.')
      return
    }
    setMailBusy(true)
    try {
      const res = await platformApi.sendTestEmail(testTo.trim())
      if (res.ok) toast.success('Test e-postası', `${testTo} adresine gönderildi.`)
      else toast.fail('SMTP hatası', res.error || 'Gönderilemedi')
      await load()
    } catch (err) {
      toast.fail('Test e-postası başarısız', platformErrorMessage(err))
    } finally {
      setMailBusy(false)
    }
  }

  const vol = health?.volume
  const used =
    vol && vol.totalBytes != null && vol.freeBytes != null ? Math.max(0, vol.totalBytes - vol.freeBytes) : null
  const usedPct = used != null && vol?.totalBytes ? Math.round((used / vol.totalBytes) * 100) : null

  return (
    <div className="pf-page">
      <PageHeader
        title="Sistem Durumu"
        subtitle={health ? `Son kontrol: ${formatDateTime(health.generatedAt)}` : 'Sunucu, veritabanı ve PDF motoru'}
        actions={
          <>
            <button type="button" className="btn btn-sm" disabled={pdfBusy} onClick={() => void testPdf()}>
              {pdfBusy ? 'Test ediliyor...' : 'PDF Testi'}
            </button>
            <button type="button" className="btn btn-sm" onClick={() => void load()} disabled={loading}>
              Yenile
            </button>
          </>
        }
      />
      {error && <div className="alert alert-error">{error}</div>}
      {loading && !health && <div className="page-loading">Yükleniyor...</div>}

      {health && (
        <>
          <div className="pf-cards">
            <div className="stat-panel stat-panel--hero">
              <div className="stat-panel__head">
                <span className="stat-panel__label">Sunucu</span>
              </div>
              <div className="pf-stat-badges">
                <OkBadge ok={health.server.ok} />
              </div>
            </div>
            <div className="stat-panel stat-panel--hero">
              <div className="stat-panel__head">
                <span className="stat-panel__label">Veritabanı</span>
              </div>
              <div className="pf-stat-badges">
                <OkBadge ok={health.database.ok} />
              </div>
            </div>
            <div className="stat-panel stat-panel--hero">
              <div className="stat-panel__head">
                <span className="stat-panel__label">PDF Motoru</span>
              </div>
              <div className="pf-stat-badges">
                <OkBadge ok={health.pdf.ok} />
              </div>
            </div>
            <div className="stat-panel stat-panel--hero">
              <div className="stat-panel__head">
                <span className="stat-panel__label">SMTP</span>
              </div>
              <div className="pf-stat-badges">
                <OkBadge ok={Boolean(health.smtp?.ok)} />
              </div>
            </div>
            <StatPanel size="hero" label="Çalışma Süresi" value={formatUptime(health.server.uptimeSec)} />
            <StatPanel size="hero" label="Veritabanı Boyutu" value={formatBytes(health.database.sizeBytes)} />
            <StatPanel
              size="hero"
              label="Disk Boş Alan"
              value={formatBytes(vol?.freeBytes)}
              hint={usedPct != null ? `%${usedPct} dolu` : undefined}
              variant={usedPct != null && usedPct >= 90 ? 'danger' : 'default'}
            />
          </div>

          <div className="pf-grid-2">
            <DataPanel title="Sunucu">
              <dl className="profile-info">
                <dt>Servis</dt>
                <dd>{health.version.service}</dd>
                <dt>Sürüm (commit)</dt>
                <dd className="cell-mono">{health.version.commit ?? '—'}</dd>
                <dt>Node</dt>
                <dd>{health.server.node}</dd>
                <dt>Platform</dt>
                <dd>{health.server.platform}</dd>
                <dt>Yük (1/5/15 dk)</dt>
                <dd>{health.server.loadAvg.map((n) => n.toFixed(2)).join(' / ')}</dd>
                <dt>Disk yolu</dt>
                <dd className="cell-mono">{health.volume.path}</dd>
                <dt>Disk toplam</dt>
                <dd>{formatBytes(health.volume.totalBytes)}</dd>
              </dl>
            </DataPanel>

            <DataPanel title="PDF Motoru">
              <dl className="profile-info">
                <dt>Durum</dt>
                <dd>
                  <OkBadge ok={pdf ? pdf.pdfOk : health.pdf.ok} />
                </dd>
                <dt>Çalıştırılabilir</dt>
                <dd className="cell-mono">{(pdf ? pdf.executablePath : health.pdf.executablePath) ?? '—'}</dd>
                <dt>Hata</dt>
                <dd>{(pdf ? pdf.error : health.pdf.error) || '—'}</dd>
              </dl>
            </DataPanel>
          </div>

          <DataPanel title="SMTP durumu">
            <dl className="profile-info">
              <dt>Yapılandırma</dt>
              <dd>{health.smtp?.configured ? 'Tanımlı' : 'Eksik'}</dd>
              <dt>Durum</dt>
              <dd>
                <OkBadge ok={Boolean(health.smtp?.ok)} />
              </dd>
              <dt>Host</dt>
              <dd className="cell-mono">{health.smtp?.host ?? '—'}</dd>
              <dt>Port / Secure</dt>
              <dd>
                {health.smtp?.port ?? '—'} / {health.smtp?.secure ? 'evet' : 'hayır'}
              </dd>
              <dt>From</dt>
              <dd>{health.smtp?.from ?? '—'}</dd>
              <dt>Hata</dt>
              <dd>{health.smtp?.error || '—'}</dd>
            </dl>
            <div className="form-grid" style={{ marginTop: 12, alignItems: 'end' }}>
              <div className="form-group">
                <label>Test e-postası alıcısı</label>
                <input
                  type="email"
                  value={testTo}
                  onChange={(e) => setTestTo(e.target.value)}
                  placeholder="ornek@firma.com"
                />
              </div>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                disabled={mailBusy}
                onClick={() => void sendTestMail()}
              >
                {mailBusy ? 'Gönderiliyor...' : 'Test e-postası gönder'}
              </button>
            </div>
          </DataPanel>
        </>
      )}
    </div>
  )
}
