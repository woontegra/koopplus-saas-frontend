/** Dokümanlar (library) — paylaşılan politika sabitleri. */

export const LIBRARY_MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024

export const LIBRARY_MAX_FOLDER_NAME_LENGTH = 200

export const LIBRARY_MAX_DISPLAY_NAME_LENGTH = 255

export const LIBRARY_MAX_NOTE_LENGTH = 2000

export const LIBRARY_DISK_RESERVE_BYTES = 8 * 1024 * 1024

export const LIBRARY_ALLOWED_EXTENSIONS = [
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'jpg',
  'jpeg',
  'png',
  'txt',
  'gif',
  'webp',
  'bmp',
  'tif',
  'tiff',
  'csv',
  'odt',
  'ods',
  'rtf',
  'ppt',
  'pptx'
] as const

export const LIBRARY_BLOCKED_EXTENSIONS = [
  'exe',
  'bat',
  'cmd',
  'ps1',
  'js',
  'vbs',
  'scr',
  'msi',
  'com',
  'pif',
  'cpl',
  'jar',
  'msc',
  'wsf',
  'hta',
  'lnk',
  'dll',
  'sys'
] as const

export const LIBRARY_DIALOG_EXTENSIONS = [...LIBRARY_ALLOWED_EXTENSIONS]

export const LIBRARY_STORAGE_NAME_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.[a-z0-9]{1,10}$/

export const LIBRARY_TEXT_PREVIEW_MAX_BYTES = 512 * 1024

export const LIBRARY_PREVIEW_IMAGE_EXTENSIONS = [
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'bmp'
] as const

export const LIBRARY_PREVIEW_TEXT_EXTENSIONS = ['txt', 'csv'] as const

export type LibraryPreviewKind = 'pdf' | 'image' | 'text' | 'unsupported'

export function classifyLibraryPreviewKind(
  extension: string | null | undefined
): LibraryPreviewKind {
  const ext = (extension ?? '').trim().replace(/^\./, '').toLowerCase()
  if (ext === 'pdf') return 'pdf'
  if ((LIBRARY_PREVIEW_IMAGE_EXTENSIONS as readonly string[]).includes(ext)) return 'image'
  if ((LIBRARY_PREVIEW_TEXT_EXTENSIONS as readonly string[]).includes(ext)) return 'text'
  return 'unsupported'
}

export const LIBRARY_MIME_BY_EXTENSION: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  txt: 'text/plain',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
  tif: 'image/tiff',
  tiff: 'image/tiff',
  csv: 'text/csv',
  odt: 'application/vnd.oasis.opendocument.text',
  ods: 'application/vnd.oasis.opendocument.spreadsheet',
  rtf: 'application/rtf',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
}
