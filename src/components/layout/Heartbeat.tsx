import { useEffect } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { sendHeartbeat } from '../../platform/platformApi'

const HEARTBEAT_MS = 60_000

/** Oturum açık + kooperatif seçiliyken dakikada bir POST /api/auth/heartbeat (çevrimiçi takibi). */
export default function Heartbeat(): null {
  const { tenantId, user } = useAuth()
  const userId = user?.id ?? null

  useEffect(() => {
    if (!tenantId || !userId) return
    const ping = (): void => {
      if (document.visibilityState === 'hidden') return
      sendHeartbeat(tenantId).catch(() => undefined)
    }
    ping()
    const timer = setInterval(ping, HEARTBEAT_MS)
    return () => clearInterval(timer)
  }, [tenantId, userId])

  return null
}
