import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import BrandLogo from '../components/layout/BrandLogo'
import { ApiError, apiRequest } from '../api/client'
import {
  IconCash,
  IconChart,
  IconPercent,
  IconShield,
  IconUsers
} from '../components/ui/icons'
import koopPlusMark from '../assets/brand/koopPlusFavicon.png'

const LOGIN_FEATURES = [
  { title: 'Üye ve Borç', icon: IconUsers },
  { title: 'Tahsilat & Faiz', icon: IconPercent },
  { title: 'Kooperatif Kasası', icon: IconCash },
  { title: 'Raporlama & Yedekleme', icon: IconChart }
] as const

type PeekData = {
  status: 'ready'
  fullName: string
  cooperativeName: string
  expiresAt: string
}

type PageState = 'checking' | 'ready' | 'starting' | 'done' | 'error'

export default function DemoConfirmPage(): JSX.Element {
  const [params] = useSearchParams()
  const token = params.get('token')?.trim() || ''
  const [state, setState] = useState<PageState>(token ? 'checking' : 'error')
  const [message, setMessage] = useState(
    token ? '' : 'Onay bağlantısı geçersiz veya eksik. E-postadaki bağlantıyı kontrol edin.'
  )
  const [peek, setPeek] = useState<PeekData | null>(null)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    ;(async () => {
      try {
        const data = await apiRequest<PeekData>(
          `/api/public/demo-confirm?token=${encodeURIComponent(token)}`,
          { method: 'GET', skipAuthRefresh: true }
        )
        if (cancelled) return
        setPeek(data)
        setState('ready')
        setMessage('')
      } catch (err) {
        if (cancelled) return
        setState('error')
        setMessage(
          err instanceof ApiError
            ? err.message
            : 'Onay bağlantısı doğrulanamadı. Süresi dolmuş veya daha önce kullanılmış olabilir.'
        )
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  const startDemo = useCallback(async () => {
    if (!token || state === 'starting' || state === 'done') return
    setState('starting')
    setMessage('')
    try {
      const data = await apiRequest<{ status: string; message?: string; loginUrl?: string }>(
        '/api/public/demo-confirm',
        { method: 'POST', body: { token }, skipAuthRefresh: true }
      )
      setState('done')
      setMessage(
        data.message ||
          'Demonuz hazır, giriş bilgileriniz e-postanıza gönderildi.'
      )
    } catch (err) {
      setState('error')
      setMessage(
        err instanceof ApiError
          ? err.message
          : 'Demo oluşturulamadı. Lütfen daha sonra tekrar deneyin.'
      )
    }
  }, [token, state])

  const firstName = peek?.fullName?.trim().split(/\s+/)[0] || ''

  return (
    <div className="login-stage">
      <div className="login-stage__atmosphere" aria-hidden>
        <div className="login-stage__glow login-stage__glow--west" />
        <div className="login-stage__glow login-stage__glow--east" />
        <div className="login-stage__glow login-stage__glow--core" />
        <div className="login-stage__grid" />
        <div className="login-stage__dots" />
        <span className="login-stage__orb login-stage__orb--a" />
        <span className="login-stage__orb login-stage__orb--b" />
      </div>

      <div className="login-stage__layout">
        <section className="login-stage__brand">
          <div className="login-stage__logo-stage login-stage__reveal login-stage__reveal--1">
            <span className="login-stage__ring login-stage__ring--outer" aria-hidden />
            <span className="login-stage__ring login-stage__ring--mid" aria-hidden />
            <span className="login-stage__ring login-stage__ring--inner" aria-hidden />
            <BrandLogo className="login-stage__wordmark" variant="onDark" />
          </div>

          <div className="login-stage__copy login-stage__reveal login-stage__reveal--2">
            <h1 className="login-stage__headline">
              7 günlük demo
              <br />
              bir adım uzağınızda.
            </h1>
            <p className="login-stage__lede">
              Onay sayfası açıldığında henüz hesap oluşturulmaz. Demoyu yalnızca aşağıdaki düğmeyle
              başlatırsınız.
            </p>
          </div>

          <ul className="login-stage__features login-stage__reveal login-stage__reveal--3">
            {LOGIN_FEATURES.map((feature) => {
              const FeatureIcon = feature.icon
              return (
                <li key={feature.title} className="login-stage__feature">
                  <span className="login-stage__feature-icon" aria-hidden>
                    <FeatureIcon size={15} />
                  </span>
                  <span>{feature.title}</span>
                </li>
              )
            })}
          </ul>

          <p className="login-stage__trust login-stage__reveal login-stage__reveal--3">
            <IconShield size={14} />
            Bağlantı tek kullanımlıktır; güvenlik tarayıcıları hesabı kendiliğinden açamaz.
          </p>
        </section>

        <section className="login-stage__aside">
          <div className="login-card login-stage__reveal login-stage__reveal--4">
            <div className="login-card__mark">
              <img src={koopPlusMark} alt="" width={36} height={36} draggable={false} />
            </div>

            {state === 'checking' ? (
              <>
                <h2 className="login-card__title">Bağlantı kontrol ediliyor</h2>
                <p className="login-card__subtitle">Lütfen bekleyin…</p>
              </>
            ) : null}

            {state === 'ready' || state === 'starting' ? (
              <>
                <h2 className="login-card__title">Demomu başlat</h2>
                <p className="login-card__subtitle">
                  {firstName ? `Merhaba ${firstName}. ` : ''}
                  {peek?.cooperativeName ? (
                    <>
                      <strong>{peek.cooperativeName}</strong> için 7 günlük demoyu başlatmaya
                      hazırsınız.
                    </>
                  ) : (
                    '7 günlük demoyu başlatmaya hazırsınız.'
                  )}
                </p>
                <button
                  type="button"
                  className="login-card__submit"
                  onClick={() => void startDemo()}
                  disabled={state === 'starting'}
                >
                  {state === 'starting' ? 'Hazırlanıyor…' : 'Demomu başlat'}
                </button>
                <p className="login-card__subtitle" style={{ marginTop: 14 }}>
                  Düğmeye bastığınızda hesap oluşturulur ve giriş bilgileri e-postanıza gönderilir.
                </p>
              </>
            ) : null}

            {state === 'done' ? (
              <>
                <h2 className="login-card__title">Demonuz hazır</h2>
                <p className="login-card__subtitle" style={{ color: 'var(--kat-credit, #0f766e)' }}>
                  Demonuz hazır, giriş bilgileriniz e-postanıza gönderildi.
                </p>
                {message ? <p className="login-card__subtitle">{message}</p> : null}
                <Link to="/login" className="login-card__submit" style={{ textAlign: 'center' }}>
                  Giriş sayfasına git
                </Link>
              </>
            ) : null}

            {state === 'error' ? (
              <>
                <h2 className="login-card__title">Onay tamamlanamadı</h2>
                <div className="alert alert-error" role="alert">
                  {message}
                </div>
                <Link to="/login" className="login-card__forgot" style={{ display: 'inline-block', marginTop: 12 }}>
                  Giriş sayfasına dön
                </Link>
              </>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  )
}
