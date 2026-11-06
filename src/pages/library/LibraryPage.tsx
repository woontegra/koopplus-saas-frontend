import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  LibraryFile,
  LibraryFolder,
  LibraryFolderNode,
  LibraryImportResult,
  LibrarySearchResult
} from '@shared/types'
import { useAuth } from '../../auth/AuthContext'
import { useCooperatives } from '../../context/CooperativeContext'
import {
  IconDots,
  IconExcel,
  IconFileText,
  IconFolder,
  IconImage,
  IconSearch,
  IconUpload
} from '../../components/ui/icons'
import { formatDateTime, formatFileSize } from '../../utils/format'
import { useActionToast } from '../../hooks/useActionToast'
import { useAskDialog } from '../../hooks/useAskDialog'
import {
  collectDroppedFiles,
  describeLibraryImportResult,
  nextDragCounter,
  prepareFileDrop,
  resolveDroppedPaths
} from './libraryDragDrop'
import LibraryPreviewPanel from './LibraryPreviewPanel'
import {
  LIBRARY_PREVIEW_DEFAULT_PCT,
  clampPreviewWidthPct,
  nextPreviewWidthPct
} from './libraryPreviewLayout'

type ModalKind = 'folder' | 'rename-folder' | 'rename-file' | 'note' | 'move-folder' | 'move-file'

interface ModalState {
  kind: ModalKind
  folder?: LibraryFolder
  file?: LibraryFile
}

function collectFolderOptions(
  nodes: LibraryFolderNode[],
  depth = 0,
  excludeIds: Set<number> = new Set()
): Array<{ id: number | null; label: string }> {
  const rows: Array<{ id: number | null; label: string }> = []
  for (const node of nodes) {
    if (excludeIds.has(node.id)) continue
    rows.push({ id: node.id, label: `${'— '.repeat(depth)}${node.name}` })
    rows.push(...collectFolderOptions(node.children, depth + 1, excludeIds))
  }
  return rows
}

function fileKindIcon(file: LibraryFile): JSX.Element {
  const ext = (file.extension || '').toLowerCase()
  if (['xls', 'xlsx', 'csv', 'ods'].includes(ext)) return <IconExcel size={16} />
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tif', 'tiff'].includes(ext)) {
    return <IconImage size={16} />
  }
  return <IconFileText size={16} />
}

export default function LibraryPage(): JSX.Element {
  const { canWrite } = useAuth()
  const { currentId } = useCooperatives()
  const toast = useActionToast()
  const ask = useAskDialog()

  const [tree, setTree] = useState<LibraryFolderNode[]>([])
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null)
  const [folders, setFolders] = useState<LibraryFolder[]>([])
  const [files, setFiles] = useState<LibraryFile[]>([])
  const [breadcrumb, setBreadcrumb] = useState<LibraryFolder[]>([])
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [search, setSearch] = useState('')
  const [searchResult, setSearchResult] = useState<LibrarySearchResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const [menuFolderId, setMenuFolderId] = useState<number | null>(null)
  const [previewFile, setPreviewFile] = useState<LibraryFile | null>(null)
  const [previewExpanded, setPreviewExpanded] = useState(false)
  const [previewWidthPct, setPreviewWidthPct] = useState(LIBRARY_PREVIEW_DEFAULT_PCT)
  const [previewResizing, setPreviewResizing] = useState(false)
  const [modal, setModal] = useState<ModalState | null>(null)
  const [modalValue, setModalValue] = useState('')
  const [moveTarget, setMoveTarget] = useState<number | null>(null)
  const dragCountRef = useRef(0)
  const selectedFolderIdRef = useRef<number | null>(null)
  const pageRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    selectedFolderIdRef.current = selectedFolderId
  }, [selectedFolderId])

  const loadTree = useCallback(async (): Promise<LibraryFolderNode[]> => {
    const res = await window.api.library.listTree()
    if (!res.success || !res.data) {
      throw new Error(res.error ?? 'Klasör ağacı alınamadı')
    }
    setTree(res.data)
    return res.data
  }, [])

  const loadFolder = useCallback(async (folderId: number | null): Promise<void> => {
    const res = await window.api.library.listFolder(folderId)
    if (!res.success || !res.data) {
      throw new Error(res.error ?? 'Klasör içeriği alınamadı')
    }
    setFolders(res.data.folders)
    setFiles(res.data.files)
    setBreadcrumb(res.data.breadcrumb)
    setSelectedFolderId(res.data.folder?.id ?? null)
  }, [])

  const reload = useCallback(
    async (folderId: number | null = selectedFolderId) => {
      setLoading(true)
      setError('')
      try {
        const nextTree = await loadTree()
        setExpanded((prev) => {
          const next = new Set(prev)
          const walk = (nodes: LibraryFolderNode[]): void => {
            for (const node of nodes) {
              if (!next.has(node.id)) next.add(node.id)
              walk(node.children)
            }
          }
          walk(nextTree)
          return next
        })
        await loadFolder(folderId)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Dokümanlar yüklenemedi')
      } finally {
        setLoading(false)
      }
    },
    [loadFolder, loadTree, selectedFolderId]
  )

  useEffect(() => {
    setPreviewFile(null)
    setPreviewExpanded(false)
    setPreviewWidthPct(LIBRARY_PREVIEW_DEFAULT_PCT)
    void reload(null)
  }, [currentId])

  useEffect(() => {
    const q = search.trim()
    if (!q) {
      setSearchResult(null)
      return
    }
    const handle = window.setTimeout(() => {
      void window.api.library.search(q).then((res) => {
        if (res.success && res.data) setSearchResult(res.data)
      })
    }, 200)
    return () => window.clearTimeout(handle)
  }, [search])

  useEffect(() => {
    const blockWindowFileOpen = (event: DragEvent): void => {
      if (!event.dataTransfer || !Array.from(event.dataTransfer.types).includes('Files')) return
      event.preventDefault()
    }
    window.addEventListener('dragover', blockWindowFileOpen)
    window.addEventListener('drop', blockWindowFileOpen)
    return () => {
      window.removeEventListener('dragover', blockWindowFileOpen)
      window.removeEventListener('drop', blockWindowFileOpen)
    }
  }, [])

  useEffect(() => {
    const closeMenu = (): void => setMenuFolderId(null)
    window.addEventListener('click', closeMenu)
    return () => window.removeEventListener('click', closeMenu)
  }, [])

  useEffect(() => {
    if (!previewExpanded) return
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setPreviewExpanded(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [previewExpanded])

  const searching = search.trim().length > 0
  const canUploadHere = canWrite && selectedFolderId != null

  const resetDrag = (): void => {
    dragCountRef.current = nextDragCounter(dragCountRef.current, 'reset')
    setDragging(false)
  }

  const handleDragEnter = (event: React.DragEvent<HTMLElement>): void => {
    if (!prepareFileDrop(event) || !canWrite) return
    dragCountRef.current = nextDragCounter(dragCountRef.current, 'enter')
    setDragging(true)
  }

  const handleDragOver = (event: React.DragEvent<HTMLElement>): void => {
    if (!prepareFileDrop(event) || !canWrite) return
    setDragging(true)
  }

  const handleDragLeave = (event: React.DragEvent<HTMLElement>): void => {
    if (!prepareFileDrop(event)) return
    dragCountRef.current = nextDragCounter(dragCountRef.current, 'leave')
    if (dragCountRef.current === 0) setDragging(false)
  }

  const reportImport = (result: LibraryImportResult, unresolved: string[] = []): void => {
    const described = describeLibraryImportResult(result, unresolved)
    if (described.kind === 'fail') toast.fail(described.title, described.message)
    else if (described.kind === 'partial') toast.warn(described.title, described.message)
    else if (result.duplicates.length > 0) toast.warn(described.title, described.message)
    else toast.success(described.title, described.message)
  }

  const handleUpload = async (): Promise<void> => {
    if (selectedFolderId == null) {
      toast.fail('Klasör seçin', 'Dosya yüklemek için önce bir klasör seçin.')
      return
    }
    setBusy(true)
    const res = await window.api.library.pickAndUpload(selectedFolderId)
    setBusy(false)
    if (!res.success || !res.data) {
      if (res.error !== 'Dosya seçilmedi') toast.fail('Dosya yüklenemedi', res.error)
      return
    }
    reportImport(res.data)
    await reload(selectedFolderId)
  }

  const importDropped = async (dataTransfer: DataTransfer | null): Promise<void> => {
    const folderId = selectedFolderIdRef.current
    if (folderId == null) {
      toast.fail('Klasör seçin', 'Dosyalar seçili klasöre yüklenir. Soldan bir klasör seçin.')
      return
    }
    const files = collectDroppedFiles(dataTransfer)
    if (files.length === 0) {
      toast.fail('Dosya okunamadı', 'Sürüklenen dosyalar alınamadı.')
      return
    }
    const { paths, unresolved } = resolveDroppedPaths(files, (file) =>
      window.api.library.pathForDroppedFile(file)
    )
    if (paths.length === 0) {
      toast.fail('Sürüklenen dosya okunamadı', unresolved[0] ?? 'Dosya yolu alınamadı.')
      return
    }
    setBusy(true)
    const res = await window.api.library.importFromPaths(folderId, paths)
    setBusy(false)
    if (!res.success || !res.data) {
      toast.fail('Dosya yüklenemedi', res.error)
      return
    }
    reportImport(res.data, unresolved)
    await reload(folderId)
  }

  const handleDrop = (event: React.DragEvent<HTMLElement>): void => {
    const ready = prepareFileDrop(event)
    resetDrag()
    if (!ready || !canWrite) return
    void importDropped(event.dataTransfer)
  }

  const handleCreateFolder = async (parentId: number | null = selectedFolderId): Promise<void> => {
    if (!modalValue.trim()) return
    setBusy(true)
    const res = await window.api.library.createFolder(parentId, modalValue)
    setBusy(false)
    if (!res.success || !res.data) {
      toast.fail('Klasör oluşturulamadı', res.error)
      return
    }
    toast.success('Klasör oluşturuldu', res.data.name)
    setModal(null)
    await reload(selectedFolderId)
  }

  const handleRenameFolder = async (): Promise<void> => {
    if (!modal?.folder) return
    setBusy(true)
    const res = await window.api.library.renameFolder(modal.folder.id, modalValue)
    setBusy(false)
    if (!res.success) {
      toast.fail('Klasör adı değiştirilemedi', res.error)
      return
    }
    toast.success('Klasör adı güncellendi', modal.folder.name)
    setModal(null)
    await reload(selectedFolderId)
  }

  const handleMoveFolder = async (): Promise<void> => {
    if (!modal?.folder) return
    setBusy(true)
    const res = await window.api.library.moveFolder(modal.folder.id, moveTarget)
    setBusy(false)
    if (!res.success) {
      toast.fail('Klasör taşınamadı', res.error)
      return
    }
    toast.success('Klasör taşındı', modal.folder.name)
    setModal(null)
    await reload(selectedFolderId)
  }

  const handleDeleteFolder = async (folder: LibraryFolder): Promise<void> => {
    const preview = await window.api.library.getFolderDeletePreview(folder.id)
    if (!preview.success || !preview.data) {
      toast.fail('Klasör silinemedi', preview.error)
      return
    }
    if (!preview.data.can_delete) {
      await ask.alert(
        `"${folder.name}" klasörü dolu.\n\n${preview.data.descendant_folder_count} alt klasör ve ${preview.data.file_count} dosya bulunuyor.\n\nÖnce içeriği taşıyın veya silin.`,
        'Dolu klasör silinemez'
      )
      return
    }
    if (
      !(await ask.confirm(`"${folder.name}" klasörü silinsin mi?`, {
        title: 'Klasörü Sil',
        confirmLabel: 'Sil',
        variant: 'danger'
      }))
    ) {
      return
    }
    const res = await window.api.library.deleteFolder(folder.id)
    if (!res.success) {
      toast.fail('Klasör silinemedi', res.error)
      return
    }
    toast.success('Klasör silindi', folder.name)
    const nextId = selectedFolderId === folder.id ? folder.parent_id : selectedFolderId
    await reload(nextId)
  }

  const closePreview = (): void => {
    setPreviewFile(null)
    setPreviewExpanded(false)
    setPreviewWidthPct(LIBRARY_PREVIEW_DEFAULT_PCT)
    setPreviewResizing(false)
  }

  const handleOpen = (file: LibraryFile): void => {
    setPreviewFile(file)
  }

  const handlePreviewResizeStart = (clientX: number): void => {
    const workspaceWidth = pageRef.current?.getBoundingClientRect().width ?? 0
    const startPct = previewWidthPct
    setPreviewResizing(true)
    const onMove = (event: PointerEvent): void => {
      event.preventDefault()
      setPreviewWidthPct(clampPreviewWidthPct(nextPreviewWidthPct(startPct, clientX, event.clientX, workspaceWidth)))
    }
    const onUp = (): void => {
      setPreviewResizing(false)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const handleOpenExternal = async (file: LibraryFile): Promise<void> => {
    const res = await window.api.library.open(file.id)
    if (!res.success) toast.fail('Dosya açılamadı', res.error)
  }

  const handleExport = async (file: LibraryFile): Promise<void> => {
    const res = await window.api.library.export(file.id)
    if (!res.success) {
      if (res.error !== 'Dosya seçilmedi') toast.fail('Dışarı aktarılamadı', res.error)
      return
    }
    toast.success('Dosya kaydedildi', file.display_name)
  }

  const handleRenameFile = async (): Promise<void> => {
    if (!modal?.file) return
    setBusy(true)
    const res = await window.api.library.renameFile(modal.file.id, modalValue)
    setBusy(false)
    if (!res.success) {
      toast.fail('Ad değiştirilemedi', res.error)
      return
    }
    toast.success('Dosya adı güncellendi', modal.file.display_name)
    if (previewFile?.id === modal.file.id) setPreviewFile(res.data ?? { ...modal.file, display_name: modalValue })
    setModal(null)
    await reload(selectedFolderId)
  }

  const handleMoveFile = async (): Promise<void> => {
    if (!modal?.file || moveTarget == null) return
    setBusy(true)
    const res = await window.api.library.moveFile(modal.file.id, moveTarget)
    setBusy(false)
    if (!res.success) {
      toast.fail('Dosya taşınamadı', res.error)
      return
    }
    toast.success('Dosya taşındı', modal.file.display_name)
    if (previewFile?.id === modal.file.id) closePreview()
    setModal(null)
    await reload(selectedFolderId)
  }

  const handleNote = async (): Promise<void> => {
    if (!modal?.file) return
    setBusy(true)
    const res = await window.api.library.updateNote(modal.file.id, modalValue)
    setBusy(false)
    if (!res.success) {
      toast.fail('Not kaydedilemedi', res.error)
      return
    }
    toast.success('Not güncellendi', modal.file.display_name)
    if (previewFile?.id === modal.file.id) {
      setPreviewFile({ ...previewFile, note: modalValue || null })
    }
    setModal(null)
    await reload(selectedFolderId)
  }

  const handleDeleteFile = async (file: LibraryFile): Promise<void> => {
    if (
      !(await ask.confirm(`"${file.display_name}" silinsin mi?`, {
        title: 'Dosyayı Sil',
        confirmLabel: 'Sil',
        variant: 'danger'
      }))
    ) {
      return
    }
    const res = await window.api.library.deleteFile(file.id)
    if (!res.success) {
      toast.fail('Dosya silinemedi', res.error)
      return
    }
    toast.success('Dosya silindi', file.display_name)
    if (previewFile?.id === file.id) closePreview()
    await reload(selectedFolderId)
  }

  const toggleExpand = (id: number): void => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const folderMoveOptions = useMemo(() => {
    const exclude = new Set<number>()
    if (modal?.kind === 'move-folder' && modal.folder) exclude.add(modal.folder.id)
    return [{ id: null, label: 'Ana Dizin' }, ...collectFolderOptions(tree, 0, exclude)]
  }, [modal, tree])

  const fileMoveOptions = useMemo(() => collectFolderOptions(tree), [tree])

  const submitModal = (): void => {
    if (modal?.kind === 'folder') void handleCreateFolder(modal.folder?.id ?? selectedFolderId)
    if (modal?.kind === 'rename-folder') void handleRenameFolder()
    if (modal?.kind === 'rename-file') void handleRenameFile()
    if (modal?.kind === 'note') void handleNote()
    if (modal?.kind === 'move-folder') void handleMoveFolder()
    if (modal?.kind === 'move-file') void handleMoveFile()
  }

  const openFolder = (folderId: number | null): void => {
    setSearch('')
    setMenuFolderId(null)
    closePreview()
    void loadFolder(folderId)
  }

  const renderTree = (nodes: LibraryFolderNode[], depth = 0): JSX.Element[] =>
    nodes.map((node) => {
      const isOpen = expanded.has(node.id)
      const selected = selectedFolderId === node.id
      return (
        <div key={node.id} className="library-tree__node">
          <div
            className={`library-tree__row${selected ? ' is-active' : ''}`}
            style={{ paddingLeft: 10 + depth * 14 }}
          >
            <button
              type="button"
              className="library-tree__item"
              onClick={() => openFolder(node.id)}
            >
              {node.children.length > 0 ? (
                <span
                  className="library-tree__twist"
                  onClick={(event) => {
                    event.stopPropagation()
                    toggleExpand(node.id)
                  }}
                >
                  {isOpen ? '▾' : '▸'}
                </span>
              ) : (
                <span className="library-tree__twist library-tree__twist--empty" />
              )}
              <IconFolder size={15} />
              <span className="library-tree__name">{node.name}</span>
            </button>
            {canWrite && (
              <button
                type="button"
                className="library-tree__more"
                title="Klasör işlemleri"
                onClick={(event) => {
                  event.stopPropagation()
                  setMenuFolderId((current) => (current === node.id ? null : node.id))
                }}
              >
                <IconDots size={14} />
              </button>
            )}
            {menuFolderId === node.id && (
              <div className="library-menu" onClick={(event) => event.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => {
                    setModalValue('')
                    setModal({ kind: 'folder', folder: node })
                    setMenuFolderId(null)
                  }}
                >
                  Alt klasör oluştur
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModalValue(node.name)
                    setModal({ kind: 'rename-folder', folder: node })
                    setMenuFolderId(null)
                  }}
                >
                  Yeniden adlandır
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMoveTarget(node.parent_id)
                    setModal({ kind: 'move-folder', folder: node })
                    setMenuFolderId(null)
                  }}
                >
                  Taşı
                </button>
                <button type="button" className="is-danger" onClick={() => void handleDeleteFolder(node)}>
                  Sil
                </button>
              </div>
            )}
          </div>
          {isOpen && node.children.length > 0 ? renderTree(node.children, depth + 1) : null}
        </div>
      )
    })

  const overlayCopy = selectedFolderId
    ? 'Dosyalar seçili klasöre yüklenecek'
    : 'Yüklemek için soldan bir klasör seçin'

  return (
    <div
      ref={pageRef}
      className={`library-page${dragging ? ' is-dragging' : ''}${previewFile ? ' is-previewing' : ''}${previewExpanded ? ' is-preview-expanded' : ''}${previewResizing ? ' is-preview-resizing' : ''}`}
    >
      {error && <div className="alert alert-error">{error}</div>}

      <aside className="library-sidebar">
        <div className="library-sidebar__head">
          <div className="library-sidebar__kicker">Klasörler</div>
          <p className="library-sidebar__hint">Evraklarınızı klasörlerle düzenleyin.</p>
        </div>
        <div className="library-tree">
          <div className={`library-tree__row${selectedFolderId == null && !searching ? ' is-active' : ''}`}>
            <button type="button" className="library-tree__item" onClick={() => openFolder(null)}>
              <span className="library-tree__twist library-tree__twist--empty" />
              <IconFolder size={15} />
              <span className="library-tree__name">Dokümanlar</span>
            </button>
          </div>
          {tree.length === 0 ? (
            <div className="library-tree__empty">Henüz klasör yok</div>
          ) : (
            renderTree(tree)
          )}
        </div>
      </aside>

      <section
        className="library-main"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {dragging && canWrite && (
          <div className="library-drop-overlay" aria-hidden>
            <div className="library-drop-overlay__card">
              <IconUpload size={28} />
              <strong>Dosyaları buraya bırakın</strong>
              <span>{overlayCopy}</span>
              <em>PDF, Word, Excel, görsel ve metin dosyaları • Maks. 100 MB</em>
            </div>
          </div>
        )}

        <div className="library-toolbar">
          <nav className="library-breadcrumb" aria-label="Konum">
            <button type="button" onClick={() => openFolder(null)}>
              Ana Dizin
            </button>
            {breadcrumb.map((item) => (
              <span key={item.id} className="library-breadcrumb__seg">
                <span className="library-breadcrumb__sep">/</span>
                <button type="button" onClick={() => openFolder(item.id)}>
                  {item.name}
                </button>
              </span>
            ))}
          </nav>
          <div className="library-toolbar__actions">
            {canWrite && (
              <>
                <button
                  type="button"
                  className="btn btn-sm"
                  disabled={busy}
                  onClick={() => {
                    setModalValue('')
                    setModal({ kind: 'folder' })
                  }}
                >
                  + Yeni Klasör
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  disabled={busy || selectedFolderId == null}
                  onClick={() => void handleUpload()}
                >
                  + Dosya Yükle
                </button>
              </>
            )}
            <label className="library-search">
              <IconSearch size={15} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Dokümanlarda ara..."
              />
            </label>
          </div>
        </div>

        <div className="library-body">
          {loading ? (
            <div className="page-loading">Dokümanlar yükleniyor...</div>
          ) : searching ? (
            !searchResult || (searchResult.folders.length === 0 && searchResult.files.length === 0) ? (
              <div className="library-empty">
                <IconSearch size={28} />
                <h3>Sonuç yok</h3>
                <p>Arama kriterine uygun klasör veya dosya bulunamadı.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="data-table library-table">
                  <thead>
                    <tr>
                      <th>Ad</th>
                      <th>Konum</th>
                      <th>Boyut</th>
                      <th>Yüklenme</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchResult.folders.map((folder) => (
                      <tr key={`sf-${folder.id}`} className="clickable" onClick={() => openFolder(folder.id)}>
                        <td>
                          <span className="library-file-name">
                            <IconFolder size={16} />
                            {folder.name}
                          </span>
                        </td>
                        <td className="cell-ellipsis">
                          {['Ana Dizin', ...folder.breadcrumb.map((item) => item.name)].join(' / ')}
                        </td>
                        <td>—</td>
                        <td>{formatDateTime(folder.created_at)}</td>
                      </tr>
                    ))}
                    {searchResult.files.map((file) => (
                      <tr
                        key={`sfi-${file.id}`}
                        className={`clickable${previewFile?.id === file.id ? ' is-previewing' : ''}`}
                        onClick={() => handleOpen(file)}
                      >
                        <td>
                          <span className="library-file-name">
                            {fileKindIcon(file)}
                            {file.display_name}
                          </span>
                        </td>
                        <td className="cell-ellipsis">
                          {['Ana Dizin', ...file.breadcrumb.map((item) => item.name)].join(' / ')}
                        </td>
                        <td>{formatFileSize(file.size_bytes)}</td>
                        <td>{formatDateTime(file.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : folders.length === 0 && files.length === 0 ? (
            <div className="library-empty">
              <IconUpload size={32} />
              <h3>Bu klasör henüz boş</h3>
              <p>
                {selectedFolderId == null
                  ? 'Yeni klasör oluşturun, ardından dosyalarınızı buraya sürükleyip bırakın.'
                  : 'Dosyalarınızı buraya sürükleyip bırakabilir veya bilgisayarınızdan seçebilirsiniz.'}
              </p>
              {canUploadHere && (
                <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void handleUpload()}>
                  Dosya Yükle
                </button>
              )}
              {canWrite && (
                <span className="library-empty__hint">veya dosyaları buraya sürükleyin</span>
              )}
            </div>
          ) : (
            <>
              {folders.length > 0 && (
                <div className="library-folders">
                  {folders.map((folder) => (
                    <button
                      key={folder.id}
                      type="button"
                      className="library-folder-card"
                      onClick={() => openFolder(folder.id)}
                    >
                      <IconFolder size={18} />
                      <span>{folder.name}</span>
                    </button>
                  ))}
                </div>
              )}
              {files.length > 0 && (
                <div className="table-wrap">
                  <table className="data-table library-table">
                    <thead>
                      <tr>
                        <th>Ad</th>
                        <th>Not</th>
                        <th>Boyut</th>
                        <th>Yüklenme tarihi</th>
                        <th>İşlemler</th>
                      </tr>
                    </thead>
                    <tbody>
                      {files.map((file) => (
                        <tr
                          key={`fi-${file.id}`}
                          className={previewFile?.id === file.id ? 'is-previewing' : undefined}
                        >
                          <td>
                            <span
                              className="library-file-name"
                              onDoubleClick={() => handleOpen(file)}
                            >
                              {fileKindIcon(file)}
                              {file.display_name}
                            </span>
                          </td>
                          <td className="cell-ellipsis">{file.note || '—'}</td>
                          <td>{formatFileSize(file.size_bytes)}</td>
                          <td>{formatDateTime(file.created_at)}</td>
                          <td className="library-actions">
                            <button type="button" className="btn btn-sm" onClick={() => handleOpen(file)}>
                              Aç
                            </button>
                            <button type="button" className="btn btn-sm" onClick={() => void handleExport(file)}>
                              Dışarı Aktar
                            </button>
                            {canWrite && (
                              <>
                                <button
                                  type="button"
                                  className="btn btn-sm"
                                  onClick={() => {
                                    setModalValue(file.display_name)
                                    setModal({ kind: 'rename-file', file })
                                  }}
                                >
                                  Yeniden Adlandır
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm"
                                  onClick={() => {
                                    setMoveTarget(file.folder_id)
                                    setModal({ kind: 'move-file', file })
                                  }}
                                >
                                  Taşı
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm"
                                  onClick={() => {
                                    setModalValue(file.note ?? '')
                                    setModal({ kind: 'note', file })
                                  }}
                                >
                                  Not
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-danger"
                                  onClick={() => void handleDeleteFile(file)}
                                >
                                  Sil
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {folders.length > 0 && files.length === 0 && canUploadHere && (
                <p className="library-inline-hint">Dosyaları bu alana sürükleyip bırakabilirsiniz.</p>
              )}
            </>
          )}
        </div>
      </section>

      {previewFile && (
        <LibraryPreviewPanel
          file={previewFile}
          expanded={previewExpanded}
          widthPct={previewWidthPct}
          resizing={previewResizing}
          onClose={closePreview}
          onToggleExpand={() => setPreviewExpanded((current) => !current)}
          onResizeStart={handlePreviewResizeStart}
          onOpenExternal={(target) => void handleOpenExternal(target)}
          onExport={(target) => void handleExport(target)}
        />
      )}

      {modal && (
        <div className="modal-overlay" onClick={() => !busy && setModal(null)}>
          <div className="modal modal--narrow" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {modal.kind === 'folder' && (modal.folder ? 'Alt Klasör' : 'Yeni Klasör')}
                {modal.kind === 'rename-folder' && 'Klasörü Yeniden Adlandır'}
                {modal.kind === 'rename-file' && 'Dosyayı Yeniden Adlandır'}
                {modal.kind === 'note' && 'Dosya Notu'}
                {modal.kind === 'move-folder' && 'Klasörü Taşı'}
                {modal.kind === 'move-file' && 'Dosyayı Taşı'}
              </h3>
            </div>
            <div className="modal-body">
              {(modal.kind === 'folder' ||
                modal.kind === 'rename-folder' ||
                modal.kind === 'rename-file' ||
                modal.kind === 'note') && (
                <div className="form-group">
                  <label>{modal.kind === 'note' ? 'Açıklama / not' : 'Ad'}</label>
                  {modal.kind === 'note' ? (
                    <textarea
                      rows={4}
                      value={modalValue}
                      onChange={(event) => setModalValue(event.target.value)}
                      autoFocus
                    />
                  ) : (
                    <input
                      value={modalValue}
                      onChange={(event) => setModalValue(event.target.value)}
                      autoFocus
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') submitModal()
                      }}
                    />
                  )}
                </div>
              )}
              {(modal.kind === 'move-folder' || modal.kind === 'move-file') && (
                <div className="form-group">
                  <label>Hedef klasör</label>
                  <select
                    value={moveTarget == null ? '' : String(moveTarget)}
                    onChange={(event) =>
                      setMoveTarget(event.target.value === '' ? null : Number(event.target.value))
                    }
                  >
                    {(modal.kind === 'move-folder' ? folderMoveOptions : fileMoveOptions).map((option) => (
                      <option
                        key={option.id == null ? 'root' : option.id}
                        value={option.id == null ? '' : option.id}
                        disabled={modal.kind === 'move-file' && option.id == null}
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn" disabled={busy} onClick={() => setModal(null)}>
                Vazgeç
              </button>
              <button type="button" className="btn btn-primary" disabled={busy} onClick={submitModal}>
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
