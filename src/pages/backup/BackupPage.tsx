import { useCallback, useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import type { BackupInfo, BackupLog } from '@shared/types'
import type { AppLayoutContext } from '../../components/layout/AppLayout'
import { entitySingular } from '../../utils/entityLabels'
import DataPanel from '../../components/ui/DataPanel'
import EmptyState from '../../components/ui/EmptyState'
import StatPanel from '../../components/ui/StatPanel'
import { formatDateTime, formatFileSize } from '../../utils/format'
import { describeBackupCreateResult } from '../../utils/backupResult'
import { useActionToast } from '../../hooks/useActionToast'
import { useAskDialog } from '../../hooks/useAskDialog'

function fileNameFromPath(filePath: string): string {
  if (!filePath || filePath === '—') return '—'
  const parts = filePath.split(/[/\\]/)
  return parts[parts.length - 1] || filePath
}

function logTypeLabel(type: BackupLog['type']): string {
  return type === 'BACKUP' ? 'Yedekleme' : 'Geri Yükleme'
}

export default function BackupPage(): JSX.Element {
  const toast = useActionToast()
  const ask = useAskDialog()
  const { reloadSettings } = useOutletContext<AppLayoutContext>()
  const [info, setInfo] = useState<BackupInfo | null>(null)
  const [logs, setLogs] = useState<BackupLog[]>([])
  const [loading, setLoading] = useState(true)
  const [backingUp, setBackingUp] = useState(false)
  const [changingFolder, setChangingFolder] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    const [infoRes, logsRes] = await Promise.all([
      window.api.backup.getInfo(),
      window.api.backup.listLogs()
    ])
    if (infoRes.success && infoRes.data) setInfo(infoRes.data)
    if (logsRes.success && logsRes.data) setLogs(logsRes.data)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleCreateBackup = async (): Promise<void> => {
    setBackingUp(true)
    setError('')
    setMessage('')
    const res = await window.api.backup.createBackup()
    setBackingUp(false)

    if (res.success && res.data) {
      const described = describeBackupCreateResult(res.data)
      const archiveLine =
        res.data.documents_archive_path != null
          ? `\nDoküman arşivi: ${fileNameFromPath(res.data.documents_archive_path)}`
          : ''
      setMessage(`${described.message}${archiveLine}`)
      if (described.kind === 'partial') {
        setError(described.message)
        toast.warn(described.title, described.message)
      } else {
        toast.success(described.title, described.message)
      }
      reloadSettings()
      loadData()
    } else if (res.error !== 'Klasör seçilmedi') {
      setError(res.error ?? 'Yedekleme başarısız')
      toast.fail('Yedekleme tamamlanamadı', res.error)
    }
  }

  const handleChangeBackupFolder = async (): Promise<void> => {
    setChangingFolder(true)
    setError('')
    setMessage('')
    const res = await window.api.backup.selectBackupFolder()
    setChangingFolder(false)

    if (res.success && res.data) {
      setMessage('Yedekleme klasörü güncellendi.')
      toast.success('Ayarlar kaydedildi', 'Yedekleme klasörü güncellendi.')
      reloadSettings()
      loadData()
    } else if (res.error !== 'Klasör seçilmedi') {
      setError(res.error ?? 'Yedekleme klasörü seçilemedi')
      toast.fail('Ayarlar kaydedilemedi', res.error)
    }
  }

  const handleRestore = async (): Promise<void> => {
    setError('')
    setMessage('')

    const selectRes = await window.api.backup.selectBackupFile()
    if (!selectRes.success || !selectRes.data) {
      if (selectRes.error !== 'Dosya seçilmedi') {
        setError(selectRes.error ?? 'Yedek dosyası seçilemedi')
        toast.fail('Yedek geri yüklenemedi', selectRes.error)
      }
      return
    }

    const filePath = selectRes.data.file_path
    const selectionToken = selectRes.data.selection_token
    if (!selectionToken) {
      setError('Yedek seçimi doğrulanamadı. Lütfen dosyayı yeniden seçin.')
      toast.fail('Yedek geri yüklenemedi', 'Yedek seçimi doğrulanamadı.')
      return
    }
    const confirmMsg = [
      'Mevcut veriler yedek dosyasındaki verilerle değiştirilecektir.',
      'Devam etmeden önce mevcut veritabanının güvenlik yedeği alınacaktır.',
      '',
      `Seçilen dosya: ${fileNameFromPath(filePath)}`,
      '',
      'Geri yüklemeye devam edilsin mi?'
    ].join('\n')

    if (!(await ask.confirm(confirmMsg))) return

    setRestoring(true)
    const restoreRes = await window.api.backup.restoreBackup(selectionToken)
    setRestoring(false)

    if (restoreRes.success) {
      if (restoreRes.data?.requires_manual_restart) {
        setMessage(
          'Geri yükleme tamamlandı. Geliştirme modunda uygulamayı kapatıp yeniden başlatın.'
        )
        toast.warn(
          'Yedek geri yüklendi',
          'Geliştirme modunda uygulama otomatik yeniden başlamayabilir. Lütfen uygulamayı kapatıp yeniden açın.'
        )
        await ask.alert(
          'Geri yükleme tamamlandı.\n\nGeliştirme modunda uygulama otomatik yeniden başlamayabilir.\nLütfen uygulamayı kapatıp yeniden açın.'
        )
      } else {
        setMessage('Geri yükleme tamamlandı. Uygulama yeniden başlatılıyor...')
        toast.success('Yedek geri yüklendi', 'Uygulama yeniden başlatılıyor.')
      }
      reloadSettings()
      loadData()
    } else {
      setError(restoreRes.error ?? 'Geri yükleme başarısız')
      toast.fail('Yedek geri yüklenemedi', restoreRes.error)
    }
  }

  if (loading || !info) {
    return <div className="page-loading">Yedekleme bilgileri yükleniyor...</div>
  }

  return (
    <div className="backup-page">
      <div className="backup-page__notice">
        Bu program verileri bilgisayarınızda yerel SQLite veritabanında saklar. Yedekleme, şu anda
        açık olan kooperatifin veritabanını ve Dokümanlar arşivini kapsar. Dokümanlar,
        <span className="cell-mono"> .documents.zip </span>
        olarak yedek dosyasının yanına yazılır. Başka bir kooperatifin yedeği bu dosyanın üzerine
        yüklenmez. Düzenli yedek almanız önerilir.
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      <div className="backup-page__grid">
        <DataPanel title="Veri Durumu" subtitle="Mevcut veritabanı özeti">
          <div className="stat-stack stat-stack--compact">
            <StatPanel label={`Toplam ${entitySingular}`} value={info.partner_count} />
            <StatPanel label="Cari Hareket" value={info.ledger_entry_count} />
            <StatPanel label="Veritabanı Boyutu" value={info.database_size_label} />
            <StatPanel label="Doküman" value={info.document_file_count ?? 0} />
          </div>
          <div className="detail-grid detail-grid--single backup-info-grid">
            <div className="detail-field detail-field--wide">
              <span className="detail-field__label">Açık Kooperatif</span>
              <span className="detail-field__value">{info.cooperative_name || '—'}</span>
            </div>
            <div className="detail-field detail-field--wide">
              <span className="detail-field__label">Veritabanı Konumu</span>
              <span className="detail-field__value cell-mono">{info.database_path}</span>
            </div>
            <div className="detail-field detail-field--wide">
              <span className="detail-field__label">Program Veri Klasörü</span>
              <span className="detail-field__value cell-mono">{info.user_data_path}</span>
            </div>
            <div className="detail-field detail-field--wide">
              <span className="detail-field__label">Yedekleme Klasörü</span>
              <span className="detail-field__value cell-mono">
                {info.backup_folder && info.backup_folder !== '—'
                  ? info.backup_folder
                  : 'Henüz seçilmedi'}
              </span>
            </div>
            <div className="detail-field">
              <span className="detail-field__label">Son Yedekleme Tarihi</span>
              <span className="detail-field__value">{formatDateTime(info.last_backup_date)}</span>
            </div>
            <div className="detail-field detail-field--wide">
              <span className="detail-field__label">Son Yedekleme Dosyası</span>
              <span className="detail-field__value cell-mono">{info.last_backup_file}</span>
            </div>
          </div>
        </DataPanel>

        <DataPanel title="Manuel Yedek Al" subtitle="Veritabanı ve dokümanları kayıtlı klasöre kopyalayın">
          <p className="settings-hint">
            Yedek, açık kooperatifin veritabanını ve Dokümanlar arşivini içerir. Dosya yanında
            <span className="cell-mono"> .koopplus.json </span>
            kimlik bilgisi ve
            <span className="cell-mono"> .documents.zip </span>
            evrak arşivi yazılır. İlk yedeklemede klasör seçilir; sonraki yedeklemeler aynı klasöre
            alınır.
          </p>
          <div className="settings-form__actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleCreateBackup}
              disabled={backingUp || changingFolder || restoring}
            >
              {backingUp ? 'Yedekleniyor...' : 'Yedek Al'}
            </button>
            <button
              type="button"
              className="btn"
              onClick={handleChangeBackupFolder}
              disabled={backingUp || changingFolder || restoring}
            >
              {changingFolder ? 'Klasör Seçiliyor...' : 'Yedekleme Klasörünü Değiştir'}
            </button>
          </div>
        </DataPanel>

        <DataPanel title="Geri Yükleme" subtitle="Seçilen yedek dosyasından veritabanını geri yükle">
          <div className="backup-restore-warning">
            Mevcut veriler yedek dosyasındaki verilerle değiştirilecektir. Yanında
            <span className="cell-mono"> .documents.zip </span>
            varsa dokümanlar da geri yüklenir. Eski yalnız-veritabanı yedeklerinde mevcut doküman
            klasörü silinmez. Devam etmeden önce güvenlik yedeği alınacaktır.
          </div>
          <div className="settings-form__actions">
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleRestore}
              disabled={backingUp || restoring}
            >
              {restoring ? 'Geri Yükleniyor...' : 'Yedekten Geri Yükle'}
            </button>
          </div>
        </DataPanel>
      </div>

      <DataPanel title="Yedek Geçmişi" subtitle="Son yedekleme ve geri yükleme işlemleri" noPadding>
        {logs.length === 0 ? (
          <EmptyState message="Henüz kayıtlı yedekleme veya geri yükleme işlemi bulunmuyor." compact />
        ) : (
          <div className="table-wrap table-wrap--compact">
            <table className="data-table">
              <thead>
                <tr>
                  <th>İşlem Türü</th>
                  <th>Tarih</th>
                  <th>Dosya Adı</th>
                  <th className="text-right">Dosya Boyutu</th>
                  <th>Açıklama</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <span
                        className={`backup-log-type backup-log-type--${log.type === 'BACKUP' ? 'backup' : 'restore'}`}
                      >
                        {logTypeLabel(log.type)}
                      </span>
                    </td>
                    <td>{formatDateTime(log.created_at)}</td>
                    <td className="cell-ellipsis" title={log.file_path}>
                      {fileNameFromPath(log.file_path)}
                    </td>
                    <td className="text-right">{formatFileSize(log.file_size)}</td>
                    <td className="cell-ellipsis">{log.note || '—'}</td>
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
