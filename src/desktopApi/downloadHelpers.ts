import { apiUrl } from '../api/config'
import { ApiError } from '../api/client'
import type { ApiResult } from '@shared/types'
import { loadTenantId, loadToken } from '../auth/session'

function authHeaders(): ApiResult<Record<string, string>> {
  const token = loadToken()
  const tenantId = loadTenantId()
  if (!token || !tenantId) {
    return { success: false, error: 'Oturum veya kooperatif seçimi eksik.' }
  }
  return {
    success: true,
    data: {
      Authorization: `Bearer ${token}`,
      'X-Tenant-Id': tenantId,
      Accept: '*/*'
    }
  }
}

function fileNameFromDisposition(header: string | null, fallback: string): string {
  if (!header) return fallback
  const utf = /filename\*=UTF-8''([^;]+)/i.exec(header)
  if (utf?.[1]) {
    try {
      return decodeURIComponent(utf[1].trim())
    } catch {
      /* ignore */
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(header)
  return plain?.[1]?.trim() || fallback
}

/** Binary/HTML yanıtı indirilebilir blob olarak alır. */
export async function desktopFetchBlob(
  path: string,
  options: { method?: string; body?: unknown; accept?: string } = {}
): Promise<ApiResult<{ blob: Blob; fileName: string; contentType: string }>> {
  const headersResult = authHeaders()
  if (!headersResult.success || !headersResult.data) {
    return { success: false, error: headersResult.error }
  }
  const headers: Record<string, string> = { ...headersResult.data }
  if (options.accept) headers.Accept = options.accept
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'

  let response: Response
  try {
    response = await fetch(apiUrl(path), {
      method: options.method ?? (options.body !== undefined ? 'POST' : 'GET'),
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined
    })
  } catch {
    return { success: false, error: 'Sunucuya bağlanılamadı.' }
  }

  if (!response.ok) {
    let message = 'İstek başarısız oldu'
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

  const contentType = response.headers.get('Content-Type') || 'application/octet-stream'
  const fileName = fileNameFromDisposition(
    response.headers.get('Content-Disposition'),
    contentType.includes('pdf')
      ? 'export.pdf'
      : contentType.includes('sheet')
        ? 'export.xlsx'
        : contentType.includes('json')
          ? 'backup.json'
          : 'export.bin'
  )
  const blob = await response.blob()
  return { success: true, data: { blob, fileName, contentType } }
}

export function triggerBrowserDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1500)
}

export async function downloadViaApi(
  path: string,
  options: { method?: string; body?: unknown; fallbackName?: string } = {}
): Promise<ApiResult<{ file_path: string; default_file_name?: string }>> {
  const result = await desktopFetchBlob(path, options)
  if (!result.success || !result.data) return { success: false, error: result.error }
  const name = result.data.fileName || options.fallbackName || 'download'
  triggerBrowserDownload(result.data.blob, name)
  return {
    success: true,
    data: { file_path: name, default_file_name: name }
  }
}

/** HTML string alır; yeni pencerede açıp yazdırır. */
export function openPrintHtml(html: string): ApiResult<{ file_path: string; default_file_name: string }> {
  const win = window.open('', '_blank')
  if (!win) {
    return { success: false, error: 'Tarayıcı yazdırma penceresini engelledi. Pop-up izni verin.' }
  }
  win.document.open()
  win.document.write(html)
  win.document.close()
  const tryPrint = (): void => {
    try {
      win.focus()
      win.print()
    } catch {
      /* ignore */
    }
  }
  if (win.document.readyState === 'complete') {
    window.setTimeout(tryPrint, 250)
  } else {
    win.addEventListener('load', () => window.setTimeout(tryPrint, 250))
  }
  return { success: true, data: { file_path: 'print', default_file_name: 'print.html' } }
}

export async function fetchText(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<ApiResult<string>> {
  const result = await desktopFetchBlob(path, { ...options, accept: 'text/html, application/json' })
  if (!result.success || !result.data) return { success: false, error: result.error }
  const text = await result.data.blob.text()
  return { success: true, data: text }
}

export function mapDownloadError(error: unknown): string {
  if (error instanceof ApiError) return error.message
  return error instanceof Error ? error.message : 'İndirme başarısız oldu'
}
