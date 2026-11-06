import { FormEvent, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import BrandLogo from '../../components/layout/BrandLogo'
import koopPlusMark from '../../assets/brand/koopPlusFavicon.png'
import { IconEye, IconEyeOff, IconLock, IconShield, IconUser } from '../../components/ui/icons'
import { platformErrorMessage } from '../../platform/platformApi'
import { usePlatformAuth } from '../../platform/PlatformAuthContext'

export default function PlatformLoginPage(): JSX.Element {
  const { ready, token, admin, login } = usePlatformAuth()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (ready && token && admin) {
    return (
      <Navigate to={from && from.startsWith('/platform') && from !== '/platform/login' ? from : '/platform'} replace />
    )
  }

  const onSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await login(email, password)
    } catch (err) {
      setError(platformErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

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
            <BrandLogo className="login-stage__wordmark" />
          </div>
          <div className="login-stage__copy login-stage__reveal login-stage__reveal--2">
            <h1 className="login-stage__headline">
              Platform
              <br />
              yönetim paneli.
            </h1>
            <p className="login-stage__lede">
              Kooperatifleri, kullanım sürelerini, destek oturumlarını ve yedekleri tek yerden
              yönetin.
            </p>
          </div>
          <p className="login-stage__trust login-stage__reveal login-stage__reveal--3">
            <IconShield size={14} />
            Bu alan yalnızca platform yöneticilerine açıktır.
          </p>
        </section>

        <section className="login-stage__aside">
          <form className="login-card login-stage__reveal login-stage__reveal--4" onSubmit={onSubmit}>
            <div className="login-card__mark">
              <img src={koopPlusMark} alt="" width={36} height={36} draggable={false} />
            </div>
            <h2 className="login-card__title">Platform girişi</h2>
            <p className="login-card__subtitle">Platform yöneticisi hesabınızla devam edin.</p>

            {error ? (
              <div className="alert alert-error" role="alert">
                {error}
              </div>
            ) : null}

            <div className="login-field">
              <label htmlFor="platform-email">E-posta Adresi</label>
              <div className="login-field__control">
                <IconUser size={18} className="login-field__icon" />
                <input
                  id="platform-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  autoFocus
                  required
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="platform-password">Şifre</label>
              <div className="login-field__control">
                <IconLock size={18} className="login-field__icon" />
                <input
                  id="platform-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  disabled={submitting}
                />
                <button
                  type="button"
                  className="login-field__toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                >
                  {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                </button>
              </div>
            </div>

            <button className="login-card__submit" type="submit" disabled={submitting}>
              {submitting ? 'Giriş yapılıyor…' : 'Giriş Yap'}
            </button>
          </form>
        </section>
      </div>
    </div>
  )
}
