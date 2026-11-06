import { useAuth } from '../../auth/AuthContext'
import { useActionToast } from '../../hooks/useActionToast'
import ChangeOwnPasswordForm from './ChangeOwnPasswordForm'
import koopPlusMark from '../../assets/brand/koopPlusFavicon.png'

/** user.mustChangePassword → uygulamaya girmeden zorunlu şifre değişikliği. */
export default function ForcePasswordChange(): JSX.Element {
  const { user, refreshSession, logout } = useAuth()
  const toast = useActionToast()

  return (
    <div className="login-stage">
      <div className="login-stage__atmosphere" aria-hidden>
        <div className="login-stage__glow login-stage__glow--west" />
        <div className="login-stage__glow login-stage__glow--east" />
        <div className="login-stage__grid" />
      </div>
      <div className="login-stage__layout" style={{ gridTemplateColumns: '1fr', justifyItems: 'center' }}>
        <section className="login-stage__aside">
          <div className="login-card login-stage__reveal login-stage__reveal--4">
            <div className="login-card__mark">
              <img src={koopPlusMark} alt="" width={36} height={36} draggable={false} />
            </div>
            <h2 className="login-card__title">Şifrenizi değiştirin</h2>
            <p className="login-card__subtitle">
              {user?.full_name ? `${user.full_name}, ` : ''}
              hesabınız geçici şifre ile açıldı. Devam etmek için yeni bir şifre belirleyin.
            </p>
            <ChangeOwnPasswordForm
              submitLabel="Şifreyi Kaydet ve Devam Et"
              onSuccess={async () => {
                toast.success('Şifre değiştirildi', 'Şifreniz güncellendi.')
                await refreshSession()
              }}
            />
            <div className="settings-actions" style={{ marginTop: 10 }}>
              <button type="button" className="btn btn-sm" onClick={() => void logout()}>
                Çıkış Yap
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
