import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import BrandLogo from '../components/layout/BrandLogo'
import { apiUrl } from '../api/config'
import koopPlusMark from '../assets/brand/koopPlusFavicon.png'

type ConfirmState = 'loading' | 'ok' | 'error'

export default function DemoConfirmPage(): JSX.Element {
  const [params] = useSearchParams()
  const token = params.get('token')?.trim() || ''
  const [state, setState] = useState<ConfirmState>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setState('error')
      setMessage('Onay bağlantısı geçersiz veya eksik.')
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(apiUrl(`/api/public/demo-confirm?token=${encodeURIComponent(token)}`), {
          method: 'GET',
          headers: { Accept: 'application/json' }
        })
        const body = (await res.json().catch(() => ({}))) as {
          success?: boolean
          error?: string
          data?: { message?: string }
        }
        if (cancelled) return
        if (!res.ok || body.success === false) {
          setState('error')
          setMessage(body.error || 'Onay tamamlanamadı. Bağlantı süresi dolmuş olabilir.')
          return
        }
        setState('ok')
        setMessage(
          body.data?.message ||
            'Demonuz hazırlandı. Giriş bilgileri e-posta adresinize gönderildi; lütfen e-postanızı kontrol edin.'
        )
      } catch {
        if (!cancelled) {
          setState('error')
          setMessage('Bağlantı kurulamadı. Lütfen daha sonra tekrar deneyin.')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  return (
    <div className="login-page demo-confirm-page">
      <div className="login-page__panel">
        <div className="login-page__brand">
          <BrandLogo className="login-page__logo" />
          <img src={koopPlusMark} alt="" className="login-page__mark" width={40} height={40} />
        </div>
        <h1 className="login-page__title">Demo Onayı</h1>
        {state === 'loading' && <p className="login-page__lead">Demonuz hazırlanıyor…</p>}
        {state === 'ok' && (
          <>
            <p className="login-page__lead" style={{ color: 'var(--kat-credit, #0f766e)' }}>
              Demonuz hazırlandı
            </p>
            <p className="muted">{message}</p>
            <p className="muted" style={{ marginTop: 16 }}>
              <a href="/login">Giriş sayfasına git</a>
            </p>
          </>
        )}
        {state === 'error' && (
          <>
            <p className="login-page__lead" style={{ color: 'var(--kat-debit, #b91c1c)' }}>
              Onay tamamlanamadı
            </p>
            <p className="muted">{message}</p>
          </>
        )}
      </div>
    </div>
  )
}
