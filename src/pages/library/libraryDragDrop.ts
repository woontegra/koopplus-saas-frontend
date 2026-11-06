import type { LibraryImportResult } from '@shared/types'

export type DragCounterAction = 'enter' | 'leave' | 'drop' | 'reset'

export function nextDragCounter(current: number, action: DragCounterAction): number {
  if (action === 'enter') return current + 1
  if (action === 'leave') return Math.max(0, current - 1)
  return 0
}

export function isFileDragEvent(dataTransfer: DataTransfer | null | undefined): boolean {
  if (!dataTransfer) return false
  return Array.from(dataTransfer.types ?? []).includes('Files')
}

export function collectDroppedFiles(dataTransfer: DataTransfer | null | undefined): File[] {
  if (!dataTransfer) return []
  return Array.from(dataTransfer.files ?? [])
}

export function resolveDroppedFilePath(
  file: File,
  getPath?: (file: File) => string
): string | null {
  if (getPath) {
    try {
      const resolved = getPath(file)?.trim()
      if (resolved) return resolved
    } catch {
      /* Electron File proxy / contextBridge */
    }
  }
  const legacy = (file as File & { path?: string }).path?.trim()
  return legacy || null
}

export function resolveDroppedPaths(
  files: File[],
  getPath?: (file: File) => string
): { paths: string[]; unresolved: string[] } {
  const paths: string[] = []
  const unresolved: string[] = []
  for (const file of files) {
    const path = resolveDroppedFilePath(file, getPath)
    if (path) paths.push(path)
    else unresolved.push(file.name || 'Adsız dosya')
  }
  return { paths, unresolved }
}

export function prepareFileDrop(event: {
  preventDefault: () => void
  stopPropagation?: () => void
  dataTransfer: DataTransfer | null
}): boolean {
  if (!isFileDragEvent(event.dataTransfer)) return false
  event.preventDefault()
  event.stopPropagation?.()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'copy'
  }
  return true
}

export function describeLibraryImportResult(
  result: Pick<LibraryImportResult, 'imported' | 'duplicates'> & {
    failed?: Array<{ name: string; error: string }>
  },
  unresolved: string[] = []
): { kind: 'ok' | 'partial' | 'fail'; title: string; message: string } {
  const ok = result.imported.length
  const failed = (result.failed?.length ?? 0) + unresolved.length
  const dup = result.duplicates.length
  const failReasons = [
    ...(result.failed ?? []).map((item) => item.error),
    ...unresolved.map((name) => `${name} yolu okunamadı`)
  ]

  if (ok === 0 && failed > 0) {
    return {
      kind: 'fail',
      title: 'Doküman yüklenemedi',
      message: failReasons[0] || 'Sürüklenen dosyalar yüklenemedi.'
    }
  }
  if (ok > 0 && failed > 0) {
    return {
      kind: 'partial',
      title: 'Yükleme kısmen tamamlandı',
      message: `${ok} doküman yüklendi, ${failed} doküman yüklenemedi.`
    }
  }
  if (dup > 0) {
    return {
      kind: 'ok',
      title: `${ok} doküman başarıyla yüklendi.`,
      message: 'Bu dosyanın aynısı arşivde bulunuyor. Yine de yüklendi.'
    }
  }
  return {
    kind: 'ok',
    title: `${ok} doküman başarıyla yüklendi.`,
    message: ok === 1 ? 'Dosya seçili klasöre eklendi.' : 'Dosyalar seçili klasöre eklendi.'
  }
}
