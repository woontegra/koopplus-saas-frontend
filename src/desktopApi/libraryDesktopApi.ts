/**
 * Dokümanlar window.api.library — /api/library
 * Tarayıcı: file pick/drag (blob token), preview base64, export download.
 */
import type {
  ApiResult,
  LibraryExportResult,
  LibraryFile,
  LibraryFolder,
  LibraryFolderContents,
  LibraryFolderDeletePreview,
  LibraryFolderNode,
  LibraryImportResult,
  LibraryPreviewResult,
  LibrarySearchResult
} from '@shared/types'
import { desktopRequest, requireAuthContext } from './apiResult'
import { toCuid, toNumericId } from './idMap'
import { desktopFetchBlob, downloadViaApi } from './downloadHelpers'

type SaasFolder = Omit<LibraryFolder, 'id' | 'parent_id'> & {
  id: string
  parent_id: string | null
}
type SaasFile = Omit<LibraryFile, 'id' | 'folder_id'> & {
  id: string
  folder_id: string
}

const DROP_PREFIX = 'saas-drop:'
const dropStore = new Map<string, File>()

function authTenant(): ApiResult<{ tenantId: string }> {
  const auth = requireAuthContext()
  if (!auth.success || !auth.data) return { success: false, error: auth.error }
  return { success: true, data: { tenantId: auth.data.tenantId } }
}

function mapFolder(tenantId: string, folder: SaasFolder): LibraryFolder {
  return {
    ...folder,
    id: toNumericId(tenantId, `libf:${folder.id}`),
    parent_id: folder.parent_id ? toNumericId(tenantId, `libf:${folder.parent_id}`) : null
  }
}

function mapFile(tenantId: string, file: SaasFile): LibraryFile {
  return {
    ...file,
    id: toNumericId(tenantId, `libx:${file.id}`),
    folder_id: toNumericId(tenantId, `libf:${file.folder_id}`)
  }
}

function mapFolderNode(tenantId: string, node: SaasFolder & { children: SaasFolder[] }): LibraryFolderNode {
  const mapped = mapFolder(tenantId, node) as LibraryFolderNode
  mapped.children = (node.children ?? []).map((child) =>
    mapFolderNode(tenantId, child as SaasFolder & { children: SaasFolder[] })
  )
  return mapped
}

function resolveFolderCuid(tenantId: string, numericId: number | null): ApiResult<string | null> {
  if (numericId == null) return { success: true, data: null }
  const cuid = toCuid(tenantId, numericId)
  if (!cuid) return { success: false, error: 'Klasör kimliği eşlemesi bulunamadı.' }
  const bare = cuid.startsWith('libf:') ? cuid.slice(5) : cuid
  return { success: true, data: bare }
}

function resolveFileCuid(tenantId: string, numericId: number): ApiResult<string> {
  const cuid = toCuid(tenantId, numericId)
  if (!cuid) return { success: false, error: 'Dosya kimliği eşlemesi bulunamadı.' }
  return { success: true, data: cuid.startsWith('libx:') ? cuid.slice(5) : cuid }
}

function mapContents(tenantId: string, data: {
  folder: SaasFolder | null
  breadcrumb: SaasFolder[]
  folders: SaasFolder[]
  files: SaasFile[]
}): LibraryFolderContents {
  return {
    folder: data.folder ? mapFolder(tenantId, data.folder) : null,
    breadcrumb: (data.breadcrumb ?? []).map((f) => mapFolder(tenantId, f)),
    folders: (data.folders ?? []).map((f) => mapFolder(tenantId, f)),
    files: (data.files ?? []).map((f) => mapFile(tenantId, f))
  }
}

function mapImport(tenantId: string, data: {
  imported: SaasFile[]
  duplicates: Array<{ file: SaasFile; existing: SaasFile[] }>
  failed?: Array<{ name: string; error: string }>
}): LibraryImportResult {
  return {
    imported: (data.imported ?? []).map((f) => mapFile(tenantId, f)),
    duplicates: (data.duplicates ?? []).map((d) => ({
      file: mapFile(tenantId, d.file),
      existing: (d.existing ?? []).map((e) => mapFile(tenantId, e))
    })),
    failed: data.failed
  }
}

function fileToBase64(file: File): Promise<ApiResult<{ fileName: string; dataBase64: string }>> {
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
      resolve({ success: true, data: { fileName: file.name, dataBase64: btoa(binary) } })
    }
    reader.onerror = () => resolve({ success: false, error: 'Dosya okunamadı.' })
    reader.readAsArrayBuffer(file)
  })
}

function pickFiles(multiple: boolean): Promise<ApiResult<File[]>> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = multiple
    input.style.display = 'none'
    const cleanup = (): void => input.remove()
    input.addEventListener('change', () => {
      const files = Array.from(input.files ?? [])
      cleanup()
      if (!files.length) {
        resolve({ success: false, error: 'Dosya seçilmedi' })
        return
      }
      resolve({ success: true, data: files })
    })
    input.addEventListener('cancel', () => {
      cleanup()
      resolve({ success: false, error: 'Dosya seçilmedi' })
    })
    document.body.appendChild(input)
    input.click()
  })
}

export const libraryDesktopApi = {
  async listTree(): Promise<ApiResult<LibraryFolderNode[]>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const res = await desktopRequest<Array<SaasFolder & { children: SaasFolder[] }>>('/api/library/tree')
    if (!res.success || !res.data) return { success: false, error: res.error }
    return {
      success: true,
      data: res.data.map((n) => mapFolderNode(auth.data!.tenantId, n))
    }
  },

  async listFolder(folderId: number | null): Promise<ApiResult<LibraryFolderContents>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const resolved = resolveFolderCuid(auth.data.tenantId, folderId)
    if (!resolved.success) return { success: false, error: resolved.error }
    const q =
      resolved.data == null
        ? '/api/library/folder'
        : `/api/library/folder?folderId=${encodeURIComponent(resolved.data)}`
    const res = await desktopRequest<{
      folder: SaasFolder | null
      breadcrumb: SaasFolder[]
      folders: SaasFolder[]
      files: SaasFile[]
    }>(q)
    if (!res.success || !res.data) return { success: false, error: res.error }
    return { success: true, data: mapContents(auth.data.tenantId, res.data) }
  },

  async search(query: string): Promise<ApiResult<LibrarySearchResult>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const res = await desktopRequest<{
      folders: Array<SaasFolder & { breadcrumb: SaasFolder[] }>
      files: Array<SaasFile & { breadcrumb: SaasFolder[] }>
    }>(`/api/library/search?q=${encodeURIComponent(query)}`)
    if (!res.success || !res.data) return { success: false, error: res.error }
    const { tenantId } = auth.data
    return {
      success: true,
      data: {
        folders: (res.data.folders ?? []).map((f) => ({
          ...mapFolder(tenantId, f),
          breadcrumb: (f.breadcrumb ?? []).map((b) => mapFolder(tenantId, b))
        })),
        files: (res.data.files ?? []).map((f) => ({
          ...mapFile(tenantId, f),
          breadcrumb: (f.breadcrumb ?? []).map((b) => mapFolder(tenantId, b))
        }))
      }
    }
  },

  async createFolder(parentId: number | null, name: string): Promise<ApiResult<LibraryFolder>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const parent = resolveFolderCuid(auth.data.tenantId, parentId)
    if (!parent.success) return { success: false, error: parent.error }
    const res = await desktopRequest<SaasFolder>('/api/library/folders', {
      method: 'POST',
      body: { parentId: parent.data, name }
    })
    if (!res.success || !res.data) return { success: false, error: res.error }
    return { success: true, data: mapFolder(auth.data.tenantId, res.data) }
  },

  async renameFolder(id: number, name: string): Promise<ApiResult<LibraryFolder>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const folder = resolveFolderCuid(auth.data.tenantId, id)
    if (!folder.success || !folder.data) return { success: false, error: folder.error ?? 'Klasör yok' }
    const res = await desktopRequest<SaasFolder>(`/api/library/folders/${encodeURIComponent(folder.data)}`, {
      method: 'PATCH',
      body: { name }
    })
    if (!res.success || !res.data) return { success: false, error: res.error }
    return { success: true, data: mapFolder(auth.data.tenantId, res.data) }
  },

  async moveFolder(id: number, parentId: number | null): Promise<ApiResult<LibraryFolder>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const folder = resolveFolderCuid(auth.data.tenantId, id)
    if (!folder.success || !folder.data) return { success: false, error: folder.error ?? 'Klasör yok' }
    const parent = resolveFolderCuid(auth.data.tenantId, parentId)
    if (!parent.success) return { success: false, error: parent.error }
    const res = await desktopRequest<SaasFolder>(`/api/library/folders/${encodeURIComponent(folder.data)}`, {
      method: 'PATCH',
      body: { parentId: parent.data }
    })
    if (!res.success || !res.data) return { success: false, error: res.error }
    return { success: true, data: mapFolder(auth.data.tenantId, res.data) }
  },

  async getFolderDeletePreview(id: number): Promise<ApiResult<LibraryFolderDeletePreview>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const folder = resolveFolderCuid(auth.data.tenantId, id)
    if (!folder.success || !folder.data) return { success: false, error: folder.error ?? 'Klasör yok' }
    const res = await desktopRequest<{
      folder_id: string
      name: string
      descendant_folder_count: number
      file_count: number
      can_delete: boolean
    }>(`/api/library/folders/${encodeURIComponent(folder.data)}/delete-preview`)
    if (!res.success || !res.data) return { success: false, error: res.error }
    return {
      success: true,
      data: {
        ...res.data,
        folder_id: toNumericId(auth.data.tenantId, `libf:${res.data.folder_id}`)
      }
    }
  },

  async deleteFolder(id: number): Promise<ApiResult<void>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const folder = resolveFolderCuid(auth.data.tenantId, id)
    if (!folder.success || !folder.data) return { success: false, error: folder.error ?? 'Klasör yok' }
    return desktopRequest(`/api/library/folders/${encodeURIComponent(folder.data)}`, { method: 'DELETE' })
  },

  async pickAndUpload(folderId: number): Promise<ApiResult<LibraryImportResult>> {
    const picked = await pickFiles(true)
    if (!picked.success || !picked.data) return { success: false, error: picked.error }
    const tokens = picked.data.map((file) => libraryDesktopApi.pathForDroppedFile(file))
    return libraryDesktopApi.importFromPaths(folderId, tokens)
  },

  async importFromPaths(folderId: number, paths: string[]): Promise<ApiResult<LibraryImportResult>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const folder = resolveFolderCuid(auth.data.tenantId, folderId)
    if (!folder.success || !folder.data) return { success: false, error: folder.error ?? 'Klasör yok' }

    const files: Array<{ fileName: string; dataBase64: string }> = []
    const failed: Array<{ name: string; error: string }> = []
    for (const token of paths) {
      if (!token.startsWith(DROP_PREFIX)) {
        failed.push({ name: token, error: 'Dosya yolu tarayıcıda desteklenmiyor' })
        continue
      }
      const file = dropStore.get(token)
      dropStore.delete(token)
      if (!file) {
        failed.push({ name: token, error: 'Dosya oturumu sona erdi' })
        continue
      }
      const encoded = await fileToBase64(file)
      if (!encoded.success || !encoded.data) {
        failed.push({ name: file.name, error: encoded.error ?? 'Okunamadı' })
        continue
      }
      files.push(encoded.data)
    }

    if (!files.length) {
      return {
        success: failed.length === 0,
        error: failed[0]?.error ?? 'Dosya seçilmedi',
        data:
          failed.length > 0
            ? { imported: [], duplicates: [], failed }
            : undefined
      }
    }

    const res = await desktopRequest<{
      imported: SaasFile[]
      duplicates: Array<{ file: SaasFile; existing: SaasFile[] }>
      failed?: Array<{ name: string; error: string }>
    }>('/api/library/import', {
      method: 'POST',
      body: { folderId: folder.data, files }
    })
    if (!res.success || !res.data) return { success: false, error: res.error }
    const mapped = mapImport(auth.data.tenantId, res.data)
    if (failed.length) {
      mapped.failed = [...(mapped.failed ?? []), ...failed]
    }
    return { success: true, data: mapped }
  },

  async renameFile(id: number, displayName: string): Promise<ApiResult<LibraryFile>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const file = resolveFileCuid(auth.data.tenantId, id)
    if (!file.success || !file.data) return { success: false, error: file.error }
    const res = await desktopRequest<SaasFile>(`/api/library/files/${encodeURIComponent(file.data)}`, {
      method: 'PATCH',
      body: { displayName }
    })
    if (!res.success || !res.data) return { success: false, error: res.error }
    return { success: true, data: mapFile(auth.data.tenantId, res.data) }
  },

  async moveFile(id: number, folderId: number): Promise<ApiResult<LibraryFile>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const file = resolveFileCuid(auth.data.tenantId, id)
    if (!file.success || !file.data) return { success: false, error: file.error }
    const folder = resolveFolderCuid(auth.data.tenantId, folderId)
    if (!folder.success || !folder.data) return { success: false, error: folder.error ?? 'Klasör yok' }
    const res = await desktopRequest<SaasFile>(`/api/library/files/${encodeURIComponent(file.data)}`, {
      method: 'PATCH',
      body: { folderId: folder.data }
    })
    if (!res.success || !res.data) return { success: false, error: res.error }
    return { success: true, data: mapFile(auth.data.tenantId, res.data) }
  },

  async updateNote(id: number, note: string | null): Promise<ApiResult<LibraryFile>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const file = resolveFileCuid(auth.data.tenantId, id)
    if (!file.success || !file.data) return { success: false, error: file.error }
    const res = await desktopRequest<SaasFile>(`/api/library/files/${encodeURIComponent(file.data)}`, {
      method: 'PATCH',
      body: { note }
    })
    if (!res.success || !res.data) return { success: false, error: res.error }
    return { success: true, data: mapFile(auth.data.tenantId, res.data) }
  },

  async open(id: number): Promise<ApiResult<boolean>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const file = resolveFileCuid(auth.data.tenantId, id)
    if (!file.success || !file.data) return { success: false, error: file.error }
    const blobRes = await desktopFetchBlob(`/api/library/files/${encodeURIComponent(file.data)}/open`)
    if (!blobRes.success || !blobRes.data) return { success: false, error: blobRes.error }
    const url = URL.createObjectURL(blobRes.data.blob)
    window.open(url, '_blank', 'noopener')
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    return { success: true, data: true }
  },

  async getPreview(id: number): Promise<ApiResult<LibraryPreviewResult>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const file = resolveFileCuid(auth.data.tenantId, id)
    if (!file.success || !file.data) return { success: false, error: file.error }
    const res = await desktopRequest<LibraryPreviewResult & { file: SaasFile }>(
      `/api/library/files/${encodeURIComponent(file.data)}/preview`
    )
    if (!res.success || !res.data) return { success: false, error: res.error }
    return {
      success: true,
      data: {
        ...res.data,
        file: mapFile(auth.data.tenantId, res.data.file as unknown as SaasFile)
      }
    }
  },

  async export(id: number): Promise<ApiResult<LibraryExportResult>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const file = resolveFileCuid(auth.data.tenantId, id)
    if (!file.success || !file.data) return { success: false, error: file.error }
    const res = await downloadViaApi(`/api/library/files/${encodeURIComponent(file.data)}/export`, {
      method: 'GET',
      fallbackName: 'dokuman'
    })
    if (!res.success || !res.data) return { success: false, error: res.error }
    return {
      success: true,
      data: { file_path: res.data.file_path, file_size: 0 }
    }
  },

  async deleteFile(id: number): Promise<ApiResult<void>> {
    const auth = authTenant()
    if (!auth.success || !auth.data) return { success: false, error: auth.error }
    const file = resolveFileCuid(auth.data.tenantId, id)
    if (!file.success || !file.data) return { success: false, error: file.error }
    return desktopRequest(`/api/library/files/${encodeURIComponent(file.data)}`, { method: 'DELETE' })
  },

  pathForDroppedFile(file: File): string {
    const token = `${DROP_PREFIX}${crypto.randomUUID()}`
    dropStore.set(token, file)
    return token
  }
}
