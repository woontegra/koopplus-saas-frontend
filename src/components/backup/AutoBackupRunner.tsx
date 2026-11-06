/**
 * Uygulama açıkken otomatik yedek.
 * Masaüstünde sıklık/saklama ayarı yok; SaaS istemci sabitleri:
 * AUTO_BACKUP_INTERVAL_MS (24s) / AUTO_BACKUP_KEEP_COUNT (10).
 */
import { useEffect, useRef } from 'react'
import { useAuth } from '../../auth/AuthContext'
import {
  AUTO_BACKUP_INTERVAL_MS,
  backupDesktopApi,
  getLastAutoBackupAt
} from '../../desktopApi/backupDesktopApi'
import { loadBackupFolderRecord, supportsDirectoryPicker } from '../../desktopApi/backupFolderStore'

const CHECK_EVERY_MS = 15 * 60 * 1000

export default function AutoBackupRunner(): null {
  const { ready, token, tenantId, isAdmin } = useAuth()
  const running = useRef(false)

  useEffect(() => {
    if (!ready || !token || !tenantId || !isAdmin) return
    if (!supportsDirectoryPicker()) return

    const tick = async (): Promise<void> => {
      if (running.current) return
      if (document.visibilityState === 'hidden') return
      const folder = await loadBackupFolderRecord().catch(() => null)
      if (!folder) return
      const last = getLastAutoBackupAt()
      if (last != null && Date.now() - last < AUTO_BACKUP_INTERVAL_MS) return

      running.current = true
      try {
        await backupDesktopApi.createBackup({ auto: true })
      } catch {
        /* sessiz — kullanıcı manuel yedekte hatayı görür */
      } finally {
        running.current = false
      }
    }

    void tick()
    const id = window.setInterval(() => void tick(), CHECK_EVERY_MS)
    const onVis = (): void => {
      if (document.visibilityState === 'visible') void tick()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [ready, token, tenantId, isAdmin])

  return null
}
