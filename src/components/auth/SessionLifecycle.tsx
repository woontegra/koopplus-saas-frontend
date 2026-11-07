import { useCallback, useEffect, useRef, useState } from 'react'
import { onApiActivity, silentRefreshAccessToken } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import {
  IDLE_TIMEOUT_MS,
  IDLE_WARNING_MS,
  SESSION_CHANNEL,
  isIdleExpired,
  nextSilentRefreshAt,
  shouldShowIdleWarning,
  type SessionBroadcast
} from '../../auth/idleSession'
import {
  loadLastActivityAt,
  loadToken,
  saveLastActivityAt,
  saveToken
} from '../../auth/session'
import IdleWarningModal from './IdleWarningModal'

/**
 * Sessiz token yenileme + 60 dk idle + çoklu sekme senkronu.
 * Platform paneli dahil tüm oturumlu sayfalarda AuthProvider altında çalışır.
 */
export default function SessionLifecycle(): JSX.Element {
  const { token, logout } = useAuth()
  const [warnOpen, setWarnOpen] = useState(false)
  const lastActivityRef = useRef<number>(loadLastActivityAt())
  const warnShownRef = useRef(false)
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastBroadcastAtRef = useRef(0)
  const loggingOutRef = useRef(false)

  const broadcast = useCallback((msg: SessionBroadcast) => {
    try {
      const ch = new BroadcastChannel(SESSION_CHANNEL)
      ch.postMessage(msg)
      ch.close()
    } catch {
      /* ignore */
    }
  }, [])

  const markActivity = useCallback(
    (opts?: { broadcast?: boolean; fromRemote?: boolean }) => {
      if (!loadToken()) return
      const at = Date.now()
      lastActivityRef.current = at
      saveLastActivityAt(at)
      warnShownRef.current = false
      setWarnOpen(false)
      if (opts?.broadcast !== false && !opts?.fromRemote) {
        // Çoklu sekme senkronunu throttle et (mousemove sellerini kes)
        if (at - lastBroadcastAtRef.current >= 5_000) {
          lastBroadcastAtRef.current = at
          broadcast({ type: 'activity', at })
        }
      }
    },
    [broadcast]
  )

  const doLogout = useCallback(async () => {
    if (loggingOutRef.current) return
    loggingOutRef.current = true
    broadcast({ type: 'logout' })
    setWarnOpen(false)
    try {
      await logout()
    } finally {
      loggingOutRef.current = false
    }
  }, [broadcast, logout])

  const continueSession = useCallback(() => {
    markActivity()
    broadcast({ type: 'continue', at: Date.now() })
    void silentRefreshAccessToken()
  }, [broadcast, markActivity])

  // Aktivite dinleyicileri (fare / klavye / dokunma / görünürlük)
  useEffect(() => {
    if (!token) {
      setWarnOpen(false)
      return
    }

    const onUserEvent = (): void => markActivity()
    const events: Array<keyof WindowEventMap> = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
      'click',
      'wheel'
    ]
    for (const ev of events) {
      window.addEventListener(ev, onUserEvent, { passive: true })
    }
    const onVis = (): void => {
      if (document.visibilityState === 'visible') markActivity()
    }
    document.addEventListener('visibilitychange', onVis)
    const offApi = onApiActivity(() => markActivity({ broadcast: true }))

    return () => {
      for (const ev of events) window.removeEventListener(ev, onUserEvent)
      document.removeEventListener('visibilitychange', onVis)
      offApi()
    }
  }, [token, markActivity])

  // Idle tick
  useEffect(() => {
    if (!token) return
    const tick = (): void => {
      const last = lastActivityRef.current
      if (isIdleExpired(last)) {
        void doLogout()
        return
      }
      if (shouldShowIdleWarning(last) && !warnShownRef.current) {
        warnShownRef.current = true
        setWarnOpen(true)
      }
    }
    tick()
    const id = window.setInterval(tick, 5_000)
    return () => window.clearInterval(id)
  }, [token, doLogout])

  // Sessiz access yenileme zamanlayıcısı
  useEffect(() => {
    if (!token) return
    const schedule = (access: string): void => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
      const delay = Math.max(5_000, nextSilentRefreshAt(access) - Date.now())
      refreshTimerRef.current = setTimeout(() => {
        void silentRefreshAccessToken().then((next) => {
          if (next) schedule(next)
          else {
            // cookie henüz hazır olmayabilir — kısa süre sonra tekrar dene
            refreshTimerRef.current = setTimeout(() => {
              void silentRefreshAccessToken().then((n) => n && schedule(n))
            }, 30_000)
          }
        })
      }, delay)
    }
    schedule(token)
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    }
  }, [token])

  // Çoklu sekme
  useEffect(() => {
    let ch: BroadcastChannel
    try {
      ch = new BroadcastChannel(SESSION_CHANNEL)
    } catch {
      return
    }
    ch.onmessage = (ev: MessageEvent<SessionBroadcast>) => {
      const msg = ev.data
      if (!msg || typeof msg !== 'object') return
      if (msg.type === 'logout') {
        if (loggingOutRef.current) return
        loggingOutRef.current = true
        setWarnOpen(false)
        void logout().finally(() => {
          loggingOutRef.current = false
        })
        return
      }
      if (msg.type === 'activity' || msg.type === 'continue') {
        lastActivityRef.current = msg.at
        saveLastActivityAt(msg.at)
        warnShownRef.current = false
        setWarnOpen(false)
        return
      }
      if (msg.type === 'tokens') {
        saveToken(msg.access)
      }
    }
    return () => ch.close()
  }, [logout])

  // Girişte aktivite damgası
  useEffect(() => {
    if (token) markActivity({ broadcast: false })
  }, [token, markActivity])

  return (
    <IdleWarningModal
      open={warnOpen}
      onContinue={continueSession}
      onLogout={() => {
        void doLogout()
      }}
    />
  )
}

/** Test / dokümantasyon için sabitler (ağaç-sallama önleme). */
export const SESSION_IDLE_MS = IDLE_TIMEOUT_MS
export const SESSION_WARN_MS = IDLE_WARNING_MS
