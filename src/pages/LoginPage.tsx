import { FormEvent, useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { ApiError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import ForgotPasswordModal from '../components/auth/ForgotPasswordModal'
import {
  IconCash,
  IconChart,
  IconEye,
  IconEyeOff,
  IconLock,
  IconPercent,
  IconShield,
  IconUser,
  IconUsers
} from '../components/auth/LoginIcons'

const LOGIN_FEATURES = [
  { title: 'Üye ve Borç', icon: IconUsers },
  { title: 'Tahsilat & Faiz', icon: IconPercent },
  { title: 'Kooperatif Kasası', icon: IconCash },
  { title: 'Raporlama', icon: IconChart }
] as const

function loginErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'E-posta veya şifre hatalı.'
    if (error.status === 403) return 'Aktif kooperatif üyeliği bulunamadı.'
    if (error.status === 0) return error.message
    return error.message || 'Giriş başarısız.'
  }
  if (error instanceof Error) return error.message
  return 'Giriş başarısız.'
}

export default function LoginPage(): JSX.Element {
  const { ready, token, user, tenantId, memberships, rememberedEmail, login } = useAuth()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showForgotModal, setShowForgotModal] = useState(false)

  useEffect(() => {
    if (rememberedEmail) {
      setEmail(rememberedEmail)
      setRemember(true)
    }
  }, [rememberedEmail])

  if (ready && token && user) {
    if (!tenantId && memberships.length > 1) {
      return <Navigate to="/kooperatifler" replace />
    }
    const target = from && from !== '/login' ? from : '/'
    return <Navigate to={tenantId ? target : '/kooperatifler'} replace />
  }

  const onSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await login(email, password, remember)
      // Oturum state güncellenince üstteki Navigate yönlendirir.
    } catch (err) {
      setError(loginErrorMessage(err))
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
            <div className="login-stage__wordmark login-stage__wordmark--text" aria-label="KoopPlus">
              <span className="login-stage__wordmark-mark">K+</span>
              <div className="login-stage__wordmark-copy">
                <strong>KoopPlus</strong>
                <span>SaaS</span>
              </div>
            </div>
          </div>

          <div className="login-stage__copy login-stage__reveal login-stage__reveal--2">
            <h1 className="login-stage__headline">
              Kooperatif yönetiminin
              <br />
              yeni merkezi.
            </h1>
            <p className="login-stage__lede">
              Aidattan tahsilata, kasadan raporlamaya tüm kooperatif süreçlerinizi tek merkezden
              yönetin.
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
            Verileriniz güvenli bulut altyapısında, kooperatif bazında izole edilir.
          </p>
        </section>

        <section className="login-stage__aside">
          <form className="login-card login-stage__reveal login-stage__reveal--4" onSubmit={onSubmit}>
            <div className="login-card__mark" aria-hidden>
              <span className="login-card__mark-glyph">K+</span>
            </div>
            <h2 className="login-card__title">Tekrar hoş geldiniz</h2>
            <p className="login-card__subtitle">Hesabınıza giriş yaparak devam edin.</p>

            {error ? (
              <div className="alert alert-error" role="alert">
                {error}
              </div>
            ) : null}

            <div className="login-field">
              <label htmlFor="login-email">E-posta Adresi</label>
              <div className="login-field__control">
                <IconUser size={18} className="login-field__icon" />
                <input
                  id="login-email"
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
              <label htmlFor="login-password">Şifre</label>
              <div className="login-field__control">
                <IconLock size={18} className="login-field__icon" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  minLength={8}
                  disabled={submitting}
                />
                <button
                  type="button"
                  className="login-field__toggle"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                >
                  {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                </button>
              </div>
            </div>

            <div className="login-card__meta">
              <label className="login-card__remember">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  disabled={submitting}
                />
                Beni hatırla
              </label>
              <button
                type="button"
                className="login-card__forgot"
                onClick={() => setShowForgotModal(true)}
              >
                Şifremi Unuttum
              </button>
            </div>

            <button className="login-card__submit" type="submit" disabled={submitting}>
              {submitting ? 'Giriş yapılıyor…' : 'Giriş Yap'}
            </button>
          </form>
        </section>
      </div>

      {showForgotModal && <ForgotPasswordModal onClose={() => setShowForgotModal(false)} />}
    </div>
  )
}
