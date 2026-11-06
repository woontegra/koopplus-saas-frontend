/**
 * Yedekleme window.api.backup — /api/backup (+ legacy /api/debt/backup)
 * Klasör: File System Access API + IndexedDB; destek yoksa tarayıcı indirmesi.
 */
import type {
  ApiResult,
  BackupCreateResult,
  BackupInfo,
  BackupLog,
  BackupRestoreResult,
  BackupValidateResult
} from '@shared/types'
import { apiUrl } from '../api/config'
import { loadTenantId, loadToken } from '../auth/session'
import { desktopRequest } from './apiResult'
import { triggerBrowserDownload } from './downloadHelpers'
import { getProgressBridge } from '../progress/ProgressContext'
import {
  loadBackupFolderRecord,
  pickBackupDirectory,
  pruneOldBackups,
  resolveWritableBackupFolder,
  supportsDirectoryPicker,
  writeBlobToDirectory
} from './backupFolderStore'

/** Masaüstünde sıklık/saklama ayarı yok; SaaS istemci sabiti (uygulama açıkken). */
export const AUTO_BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000
export const AUTO_BACKUP_KEEP_COUNT = 10
const AUTO_BACKUP_LAST_KEY = 'koopplus.saas.lastAutoBackupAt'

const selectionStore = new Map<
  string,
  { fileName: string; contentBase64: string; fileSize: number; documentsZipBase64?: string; kind?: 'saas' | 'desktop' }
>()

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
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

function documentsStatusFromHeaders(headers: Headers): BackupCreateResult['documents_archive_status'] {
  const count = Number(headers.get('X-Backup-Documents-File-Count') || '0')
  if (count <= 0) return 'empty'
  return 'created'
}

/** Klasöre yazmak / indirmek için header’lı fetch. */
async function fetchBackupWithMeta(options: {
  password?: string
}): Promise<
  ApiResult<{
    blob: Blob
    fileName: string
    fileSize: number
    documents_archive_status: BackupCreateResult['documents_archive_status']
  }>
> {
  const token = loadToken()
  const tenantId = loadTenantId()
  if (!token || !tenantId) {
    return { success: false, error: 'Oturum veya kooperatif seçimi eksik.' }
  }

  const password = options.password?.trim() ? options.password : undefined
  const tryFetch = async (path: string, init: RequestInit): Promise<Response> =>
    fetch(apiUrl(path), init)

  let response: Response
  try {
    response = await tryFetch('/api/backup/create', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Tenant-Id': tenantId,
        Accept: '*/*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        include_documents: true,
        ...(password ? { password, encrypt: true } : {})
      })
    })
    if (!response.ok && !password) {
      response = await tryFetch('/api/debt/backup', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Tenant-Id': tenantId,
          Accept: '*/*'
        }
      })
    }
  } catch {
    return { success: false, error: 'Sunucuya bağlanılamadı.' }
  }

  if (!response.ok) {
    let message = 'Yedek oluşturulamadı'
    try {
      const payload = (await response.json()) as { error?: string }
      if (payload?.error) message = payload.error
    } catch {
      /* ignore */
    }
    if (response.status === 401) message = 'Oturum geçersiz veya süresi dolmuş. Lütfen tekrar giriş yapın.'
    if (response.status === 403) message = 'Bu işlem için yetkiniz yok.'
    return { success: false, error: message }
  }

  const blob = await response.blob()
  const disposition = response.headers.get('Content-Disposition')
  let fileName =
    password ? 'koopplus-tenant-backup.enc.json' : 'koopplus-tenant-backup.json'
  if (disposition) {
    const utf = /filename\*=UTF-8''([^;]+)/i.exec(disposition)
    const plain = /filename="?([^";]+)"?/i.exec(disposition)
    if (utf?.[1]) {
      try {
        fileName = decodeURIComponent(utf[1].trim())
      } catch {
        fileName = utf[1].trim()
      }
    } else if (plain?.[1]) {
      fileName = plain[1].trim()
    }
  }

  return {
    success: true,
    data: {
      blob,
      fileName,
      fileSize: blob.size,
      documents_archive_status: documentsStatusFromHeaders(response.headers)
    }
  }
}

async function persistBackupBlob(
  blob: Blob,
  fileName: string,
  options: { allowPickIfMissing: boolean; pruneKeep?: number }
): Promise<ApiResult<{ file_path: string; file_size: number; savedToFolder: boolean }>> {
  if (!supportsDirectoryPicker()) {
    triggerBrowserDownload(blob, fileName)
    return {
      success: true,
      data: { file_path: fileName, file_size: blob.size, savedToFolder: false }
    }
  }

  try {
    let folder = await resolveWritableBackupFolder()
    if (!folder) {
      if (!options.allowPickIfMissing) {
        return { success: false, error: 'Yedekleme klasörü seçilmedi' }
      }
      folder = await pickBackupDirectory()
    }
    const written = await writeBlobToDirectory(folder.handle, fileName, blob)
    if (options.pruneKeep && options.pruneKeep > 0) {
      await pruneOldBackups(folder.handle, options.pruneKeep).catch(() => 0)
    }
    return {
      success: true,
      data: {
        file_path: `${folder.name}/${written.fileName}`,
        file_size: written.fileSize,
        savedToFolder: true
      }
    }
  } catch (err) {
    const name = err instanceof Error ? err.name : ''
    if (name === 'AbortError') {
      return { success: false, error: 'Klasör seçilmedi' }
    }
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Yedek klasöre yazılamadı'
    }
  }
}

export function getLastAutoBackupAt(): number | null {
  try {
    const raw = localStorage.getItem(AUTO_BACKUP_LAST_KEY)
    if (!raw) return null
    const n = Number(raw)
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

export function setLastAutoBackupAt(ts: number = Date.now()): void {
  try {
    localStorage.setItem(AUTO_BACKUP_LAST_KEY, String(ts))
  } catch {
    /* ignore */
  }
}

export const backupDesktopApi = {
  supportsDirectoryPicker,

  async getInfo(): Promise<ApiResult<BackupInfo>> {
    const res = await desktopRequest<BackupInfo>('/api/backup/info')
    if (!res.success || !res.data) {
      return { success: false, error: res.error ?? 'Yedekleme bilgisi alınamadı' }
    }
    const record = await loadBackupFolderRecord().catch(() => null)
    let backupFolder = record?.name || ''
    if (!backupFolder) {
      backupFolder = supportsDirectoryPicker()
        ? 'Henüz seçilmedi'
        : 'Klasör seçimi için Chrome veya Edge kullanın; bu tarayıcıda yedekler İndirilenler klasörüne iner'
    }
    return {
      success: true,
      data: {
        ...res.data,
        backup_folder: backupFolder,
        user_data_path: res.data.user_data_path || 'Bulut',
        database_path: res.data.database_path || 'Bulut (PostgreSQL)'
      }
    }
  },

  /**
   * Yedek oluştur → seçili klasöre yaz (veya ilk seferde klasör seç).
   * password verilirse şifreli yedek.
   */
  async createBackup(options: { password?: string; auto?: boolean } = {}): Promise<ApiResult<BackupCreateResult>> {
    const fetched = await fetchBackupWithMeta({ password: options.password })
    if (!fetched.success || !fetched.data) return { success: false, error: fetched.error }

    const saved = await persistBackupBlob(fetched.data.blob, fetched.data.fileName, {
      allowPickIfMissing: !options.auto,
      pruneKeep: options.auto ? AUTO_BACKUP_KEEP_COUNT : AUTO_BACKUP_KEEP_COUNT
    })
    if (!saved.success || !saved.data) return { success: false, error: saved.error }

    if (options.auto) setLastAutoBackupAt()

    return {
      success: true,
      data: {
        file_path: saved.data.file_path,
        file_size: saved.data.file_size,
        documents_archive_status: fetched.data.documents_archive_status
      }
    }
  },

  async selectBackupFolder(): Promise<ApiResult<{ folder: string }>> {
    if (!supportsDirectoryPicker()) {
      return {
        success: false,
        error:
          'Klasör seçimi için Chrome veya Edge kullanın; bu tarayıcıda yedekler İndirilenler klasörüne iner.'
      }
    }
    try {
      const record = await pickBackupDirectory()
      return { success: true, data: { folder: record.name } }
    } catch (err) {
      const name = err instanceof Error ? err.name : ''
      if (name === 'AbortError') return { success: false, error: 'Klasör seçilmedi' }
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Yedekleme klasörü seçilemedi'
      }
    }
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

    if (!validate.success || !validate.data) {
      return {
        success: false,
        error: validate.error ?? 'Yedek dosyası doğrulanamadı'
      }
    }

    const token = crypto.randomUUID()
    selectionStore.set(token, encoded.data)

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
  },

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
    return { success: false, error: res.error ?? 'Yedek geçmişi alınamadı' }
  }
}
