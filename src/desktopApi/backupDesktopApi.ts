/**
 * Yedekleme window.api.backup — /api/backup (+ legacy /api/debt/backup)
 * Restore: job + progress (aidat/partner import ile aynı poll modeli).
 */
import type {
  ApiResult,
  BackupCreateResult,
  BackupInfo,
  BackupLog,
  BackupRestoreResult,
  BackupValidateResult
} from '@shared/types'
import { desktopRequest } from './apiResult'
import { downloadViaApi } from './downloadHelpers'
import { getProgressBridge } from '../progress/ProgressContext'

const BACKUP_FOLDER_KEY = 'koopplus.saas.backupFolderPreference'
const selectionStore = new Map<
  string,
  { fileName: string; contentBase64: string; fileSize: number; documentsZipBase64?: string; kind?: 'saas' | 'desktop' }
>()

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function readBackupFolder(): string {
  try {
    return localStorage.getItem(BACKUP_FOLDER_KEY) || ''
  } catch {
    return ''
  }
}

function writeBackupFolder(folder: string): void {
  try {
    localStorage.setItem(BACKUP_FOLDER_KEY, folder)
  } catch {
    /* ignore */
  }
}

function fileToBase64(file: File): Promise<ApiResult<{ fileName: string; contentBase64: string; fileSize: number }>> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (!(result instanceof ArrayBuffer)) {
        resolve({ success: false, error: 'Dosya okunamadı.' })
        return
      }
      const bytes = new Uint8Array(result)
      let binary = ''
      for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]!)
      resolve({
        success: true,
        data: {
          fileName: file.name,
          contentBase64: btoa(binary),
          fileSize: file.size
        }
      })
    }
    reader.onerror = () => resolve({ success: false, error: 'Dosya okunamadı.' })
    reader.readAsArrayBuffer(file)
  })
}

function pickBackupFile(): Promise<ApiResult<File>> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,.db,.enc,.koopplus,.zip,application/json,application/octet-stream'
    input.style.display = 'none'
    const cleanup = (): void => input.remove()
    input.addEventListener('change', () => {
      const file = input.files?.[0]
      cleanup()
      if (!file) {
        resolve({ success: false, error: 'Dosya seçilmedi' })
        return
      }
      resolve({ success: true, data: file })
    })
    input.addEventListener('cancel', () => {
      cleanup()
      resolve({ success: false, error: 'Dosya seçilmedi' })
    })
    document.body.appendChild(input)
    input.click()
  })
}

async function pollRestoreJob(jobId: string): Promise<ApiResult<BackupRestoreResult>> {
  const progress = getProgressBridge()
  progress?.showProgress('Geri yükleniyor', 0, 100)
  const POLL_MS = 400
  const TIMEOUT_MS = 30 * 60 * 1000
  const startedAt = Date.now()
  try {
    while (Date.now() - startedAt < TIMEOUT_MS) {
      await sleep(POLL_MS)
      const jobRes = await desktopRequest<{
        job_id: string
        status: 'queued' | 'running' | 'completed' | 'failed'
        processed: number
        total: number
        result?: BackupRestoreResult
        error?: string
      }>(`/api/backup/restore/jobs/${encodeURIComponent(jobId)}`)

      if (!jobRes.success || !jobRes.data) {
        progress?.hideProgress()
        return { success: false, error: jobRes.error ?? 'Geri yükleme durumu alınamadı.' }
      }

      const job = jobRes.data
      progress?.updateProgress(job.processed, job.total || 100)

      if (job.status === 'completed') {
        progress?.hideProgress()
        return {
          success: true,
          data: job.result ?? { requires_manual_restart: false }
        }
      }
      if (job.status === 'failed') {
        progress?.hideProgress()
        return { success: false, error: job.error ?? 'Geri yükleme başarısız.' }
      }
    }
    progress?.hideProgress()
    return { success: false, error: 'Geri yükleme zaman aşımına uğradı.' }
  } catch (error) {
    progress?.hideProgress()
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Geri yükleme sırasında hata oluştu.'
    }
  }
}

export const backupDesktopApi = {
  async getInfo(): Promise<ApiResult<BackupInfo>> {
    const res = await desktopRequest<BackupInfo>('/api/backup/info')
    if (res.success && res.data) {
      const folder = readBackupFolder()
      return {
        success: true,
        data: {
          ...res.data,
          backup_folder: folder || res.data.backup_folder || 'Tarayıcı indirme klasörü',
          user_data_path: res.data.user_data_path || 'Bulut',
          database_path: res.data.database_path || 'Bulut (PostgreSQL)'
        }
      }
    }
    // Geçici fallback — backend hazır değilse
    return {
      success: true,
      data: {
        database_path: 'Bulut (PostgreSQL)',
        database_size: 0,
        database_size_label: '—',
        backup_folder: readBackupFolder() || 'Tarayıcı indirme klasörü',
        last_backup_date: '',
        last_backup_file: '',
        user_data_path: 'Bulut',
        partner_count: 0,
        ledger_entry_count: 0,
        document_file_count: 0
      }
    }
  },

  /**
   * Yedek indir. password verilirse backend yedeği şifreler (encryption_password/password).
   * Şifreli istekte legacy düz yedeğe ASLA düşülmez.
   */
  async createBackup(options: { password?: string } = {}): Promise<ApiResult<BackupCreateResult>> {
    const password = options.password?.trim() ? options.password : undefined
    let res = await downloadViaApi('/api/backup/create', {
      method: 'POST',
      body: {
        include_documents: true,
        ...(password ? { password, encrypt: true } : {})
      },
      fallbackName: password ? 'koopplus-tenant-backup.enc.json' : 'koopplus-tenant-backup.json'
    })
    if (!res.success && !password) {
      res = await downloadViaApi('/api/debt/backup', {
        method: 'GET',
        fallbackName: 'koopplus-tenant-backup.json'
      })
    }
    if (!res.success || !res.data) return { success: false, error: res.error }
    return {
      success: true,
      data: {
        file_path: res.data.file_path,
        file_size: 0,
        documents_archive_status: 'created'
      }
    }
  },

  async selectBackupFolder(): Promise<ApiResult<{ folder: string }>> {
    // Tarayıcıda klasör seçimi kısıtlı — istemci tercihi
    const folder = 'Tarayıcı indirme klasörü'
    writeBackupFolder(folder)
    return { success: true, data: { folder } }
  },

  async validateBackupFile(): Promise<ApiResult<BackupValidateResult>> {
    return backupDesktopApi.selectBackupFile()
  },

  async selectBackupFile(): Promise<ApiResult<BackupValidateResult>> {
    const picked = await pickBackupFile()
    if (!picked.success || !picked.data) return { success: false, error: picked.error }
    const encoded = await fileToBase64(picked.data)
    if (!encoded.success || !encoded.data) return { success: false, error: encoded.error }

    const validate = await desktopRequest<BackupValidateResult & { details?: { encrypted?: boolean } }>(
      '/api/backup/validate',
      {
        method: 'POST',
        body: {
          fileName: encoded.data.fileName,
          contentBase64: encoded.data.contentBase64
        }
      }
    )

    const token = crypto.randomUUID()
    selectionStore.set(token, encoded.data)

    if (validate.success && validate.data) {
      // Şifreli yedek: backend `encrypted: true` döner (veya ad uzantısından anlaşılır).
      const encrypted =
        validate.data.encrypted === true ||
        validate.data.details?.encrypted === true ||
        /\.enc(\.json)?$|encrypted/i.test(encoded.data.fileName)
      return {
        success: true,
        data: {
          ...validate.data,
          encrypted,
          selection_token: validate.data.selection_token || token,
          file_path: validate.data.file_path || encoded.data.fileName,
          file_size: validate.data.file_size || encoded.data.fileSize
        }
      }
    }

    // Backend validate yoksa yine de seçimi tut
    return {
      success: true,
      data: {
        valid: true,
        encrypted: /\.enc(\.json)?$|encrypted/i.test(encoded.data.fileName),
        file_path: encoded.data.fileName,
        file_size: encoded.data.fileSize,
        selection_token: token
      }
    }
  },

  /** Şifreli yedek için `password` gerekir (backend: password / backupPassword). */
  async restoreBackup(
    selectionToken: string,
    options: { password?: string } = {}
  ): Promise<ApiResult<BackupRestoreResult>> {
    const selection = selectionStore.get(selectionToken)
    if (!selection) {
      return { success: false, error: 'Yedek seçimi doğrulanamadı. Lütfen dosyayı yeniden seçin.' }
    }

    const started = await desktopRequest<{ job_id: string; total?: number }>(
      '/api/backup/restore/jobs',
      {
        method: 'POST',
        body: {
          fileName: selection.fileName,
          contentBase64: selection.contentBase64,
          selection_token: selectionToken,
          ...(options.password ? { password: options.password } : {})
        }
      }
    )
    if (!started.success || !started.data?.job_id) {
      return { success: false, error: started.error ?? 'Geri yükleme işi başlatılamadı.' }
    }
    const result = await pollRestoreJob(started.data.job_id)
    if (result.success) selectionStore.delete(selectionToken)
    return result
  },

  /**
   * Masaüstü KoopPlus yedeği: .db (+ opsiyonel .documents.zip) →
   * POST /api/backup/restore/jobs { desktopDbBase64, documentsZipBase64? }.
   */
  async restoreDesktopBackup(
    dbFile: File,
    documentsZip?: File | null
  ): Promise<ApiResult<BackupRestoreResult>> {
    if (!/\.db$/i.test(dbFile.name)) {
      return { success: false, error: 'Masaüstü yedeği .db uzantılı olmalıdır.' }
    }
    if (documentsZip && !/\.zip$/i.test(documentsZip.name)) {
      return { success: false, error: 'Doküman arşivi .zip uzantılı olmalıdır.' }
    }
    const db = await fileToBase64(dbFile)
    if (!db.success || !db.data) return { success: false, error: db.error }
    let docsBase64: string | undefined
    if (documentsZip) {
      const docs = await fileToBase64(documentsZip)
      if (!docs.success || !docs.data) return { success: false, error: docs.error }
      docsBase64 = docs.data.contentBase64
    }

    const started = await desktopRequest<{ job_id: string }>('/api/backup/restore/jobs', {
      method: 'POST',
      body: {
        fileName: dbFile.name,
        desktopDbBase64: db.data.contentBase64,
        ...(docsBase64 ? { documentsZipBase64: docsBase64 } : {})
      }
    })
    if (!started.success || !started.data?.job_id) {
      return { success: false, error: started.error ?? 'Geri yükleme işi başlatılamadı.' }
    }
    return pollRestoreJob(started.data.job_id)
  },
  async listLogs(): Promise<ApiResult<BackupLog[]>> {
    const res = await desktopRequest<BackupLog[]>('/api/backup/logs')
    if (res.success && res.data) return res
    return { success: true, data: [] }
  }
}
