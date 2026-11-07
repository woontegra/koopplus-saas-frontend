import BrandLogo from '../layout/BrandLogo'
import { ContactLinks } from '../contact/ContactLinks'
import { useAuth } from '../../auth/AuthContext'

/** Giriş sonrası: demo/kullanım süresi dolmuş veya askıya alınmış kooperatif. */
export default function AccessBlockedScreen(): JSX.Element {
  const { accessBlock, logout, user } = useAuth()
  const block = accessBlock

  return (
    <div className="access-blocked">
      <div className="access-blocked__card">
        <BrandLogo className="access-blocked__logo" />
        <p className="access-blocked__status" role="status">
          {block?.title ?? 'Erişim engellendi'}
        </p>
        {block?.tenantName ? (
          <p className="access-blocked__tenant">{block.tenantName}</p>
        ) : null}
        <p className="access-blocked__message">
          {block?.message ?? 'Bu kooperatife şu an erişilemiyor.'}
        </p>
        {block?.reason === 'SUSPENDED' && block.suspensionReason ? (
          <p className="access-blocked__reason">
            <strong>Sebep:</strong> {block.suspensionReason}
          </p>
        ) : null}
        <div className="access-blocked__contact">
          <span className="access-blocked__contact-label">İletişim</span>
          <ContactLinks contact={block?.contact} />
          {!block?.contact?.phone && !block?.contact?.email && !block?.contact?.whatsapp ? (
            <span className="access-blocked__contact-empty">İletişim bilgisi henüz tanımlı değil.</span>
          ) : null}
        </div>
        <div className="access-blocked__actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              void logout()
            }}
          >
            Çıkış yap
          </button>
          {user?.email ? <span className="access-blocked__user">{user.email}</span> : null}
        </div>
      </div>
    </div>
  )
}
