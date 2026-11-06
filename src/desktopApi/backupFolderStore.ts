/**
 * Yedekleme klasörü — File System Access API + IndexedDB (Directory Handle).
 * Chrome/Edge: showDirectoryPicker. Firefox/Safari: destek yok → tarayıcı indirmesi.
 */

const DB_NAME = 'koopplus.saas.backupFolder'
const DB_VERSION = 1
const STORE = 'handles'
const RECORD_KEY = 'default'

export type BackupFolderRecord = {
  name: string
  handle: FileSystemDirectoryHandle
  updatedAt: string
}

export function supportsDirectoryPicker(): boolean {
  return typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function'
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error ?? new Error('IndexedDB açılamadı'))
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
  })
}

export async function loadBackupFolderRecord(): Promise<BackupFolderRecord | null> {
  if (typeof indexedDB === 'undefined') return null
  const db = await openDb()
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).get(RECORD_KEY)
      req.onerror = () => reject(req.error ?? new Error('Klasör kaydı okunamadı'))
      req.onsuccess = () => {
        const row = req.result as BackupFolderRecord | undefined
        if (!row?.handle || !row.name) {
          resolve(null)
          return
        }
        resolve(row)
      }
    })
  } finally {
    db.close()
  }
}

export async function saveBackupFolderRecord(
  handle: FileSystemDirectoryHandle,
  name?: string
): Promise<BackupFolderRecord> {
  const record: BackupFolderRecord = {
    name: (name || handle.name || 'Yedek klasörü').trim() || 'Yedek klasörü',
    handle,
    updatedAt: new Date().toISOString()
  }
  const db = await openDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error ?? new Error('Klasör kaydı yazılamadı'))
      tx.objectStore(STORE).put(record, RECORD_KEY)
    })
  } finally {
    db.close()
  }
  return record
}

export async function clearBackupFolderRecord(): Promise<void> {
  if (typeof indexedDB === 'undefined') return
  const db = await openDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error ?? new Error('Klasör kaydı silinemedi'))
      tx.objectStore(STORE).delete(RECORD_KEY)
    })
  } finally {
    db.close()
  }
}

export async function ensureDirectoryPermission(
  handle: FileSystemDirectoryHandle,
  mode: 'read' | 'readwrite' = 'readwrite'
): Promise<PermissionState> {
  const opts = { mode } as FileSystemHandlePermissionDescriptor
  const anyHandle = handle as FileSystemDirectoryHandle & {
    queryPermission?: (d: FileSystemHandlePermissionDescriptor) => Promise<PermissionState>
    requestPermission?: (d: FileSystemHandlePermissionDescriptor) => Promise<PermissionState>
  }
  if (typeof anyHandle.queryPermission === 'function') {
    const current = await anyHandle.queryPermission(opts)
    if (current === 'granted') return current
  }
  if (typeof anyHandle.requestPermission === 'function') {
    return anyHandle.requestPermission(opts)
  }
  return 'granted'
}

export async function pickBackupDirectory(): Promise<BackupFolderRecord> {
  if (!supportsDirectoryPicker()) {
    throw new Error(
      'Klasör seçimi için Chrome veya Edge kullanın; bu tarayıcıda yedekler İndirilenler klasörüne iner.'
    )
  }
  const picker = window.showDirectoryPicker
  if (!picker) {
    throw new Error(
      'Klasör seçimi için Chrome veya Edge kullanın; bu tarayıcıda yedekler İndirilenler klasörüne iner.'
    )
  }
  const handle = await picker.call(window, {
    id: 'koopplus-backup-folder',
    mode: 'readwrite',
    startIn: 'documents'
  })
  const perm = await ensureDirectoryPermission(handle, 'readwrite')
  if (perm !== 'granted') {
    throw new Error('Yedekleme klasörüne yazma izni verilmedi.')
  }
  return saveBackupFolderRecord(handle)
}

/** Kayıtlı klasörü getir; izin yoksa bir kez izin iste (klasör seçimi açılmaz). */
export async function resolveWritableBackupFolder(): Promise<BackupFolderRecord | null> {
  const record = await loadBackupFolderRecord()
  if (!record) return null
  const perm = await ensureDirectoryPermission(record.handle, 'readwrite')
  if (perm !== 'granted') {
    throw new Error('Yedekleme klasörüne yazma izni verilmedi. Ayarlar’dan klasörü yeniden seçin.')
  }
  return record
}

export async function writeBlobToDirectory(
  dir: FileSystemDirectoryHandle,
  fileName: string,
  blob: Blob
): Promise<{ fileName: string; fileSize: number }> {
  const safeName = fileName.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').trim() || 'koopplus-backup.bin'
  const fileHandle = await dir.getFileHandle(safeName, { create: true })
  const writable = await fileHandle.createWritable()
  try {
    await writable.write(blob)
  } finally {
    await writable.close()
  }
  return { fileName: safeName, fileSize: blob.size }
}

/**
 * Masaüstüyle aynı: saklama limiti yokken prune yok.
 * keepCount verilirse `koopplus-` önekli dosyalardan en eskileri siler.
 */
export async function pruneOldBackups(
  dir: FileSystemDirectoryHandle,
  keepCount: number
): Promise<number> {
  if (!Number.isFinite(keepCount) || keepCount <= 0) return 0
  const entries: Array<{ name: string; lastModified: number }> = []
  const dirAny = dir as FileSystemDirectoryHandle & {
    entries?: () => AsyncIterableIterator<[string, FileSystemHandle]>
    values?: () => AsyncIterableIterator<FileSystemHandle>
  }
  if (typeof dirAny.entries === 'function') {
    for await (const [name, handle] of dirAny.entries()) {
      if (handle.kind !== 'file') continue
      if (!/^koopplus-/i.test(name)) continue
      if (!/\.(json|db|enc\.json)$/i.test(name) && !/\.enc$/i.test(name)) continue
      try {
        const file = await (handle as FileSystemFileHandle).getFile()
        entries.push({ name, lastModified: file.lastModified })
      } catch {
        entries.push({ name, lastModified: 0 })
      }
    }
  }
  entries.sort((a, b) => b.lastModified - a.lastModified)
  const toRemove = entries.slice(keepCount)
  let removed = 0
  for (const item of toRemove) {
    try {
      await dir.removeEntry(item.name)
      removed += 1
    } catch {
      /* ignore */
    }
  }
  return removed
}

declare global {
  interface Window {
    showDirectoryPicker?: (options?: {
      id?: string
      mode?: 'read' | 'readwrite'
      startIn?: string
    }) => Promise<FileSystemDirectoryHandle>
  }

  interface FileSystemHandlePermissionDescriptor {
    mode?: 'read' | 'readwrite'
  }
}
