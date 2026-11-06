import { useEffect, useRef, useState } from 'react'
import { roleLabel, useAuth } from '../../auth/AuthContext'
import { useAskDialog } from '../../hooks/useAskDialog'
import { useActionToast } from '../../hooks/useActionToast'
import { formatDate } from '../../utils/format'
import { daysRemaining, usageLabel } from '../../utils/usage'
import PlatformModal from '../../platform/PlatformModal'
import ChangeOwnPasswordForm from '../auth/ChangeOwnPasswordForm'
import UsersSection from '../settings/UsersSection'

type ModalKind = 'profile' | 'usage' | 'password' | 'users' | null

/** AppHeader sağ üst — kullanıcı adına tıklayınca açılan profil menüsü. */
export default function ProfileMenu(): JSX.Element | null {
  const { user, memberships, activeMembership, canManageUsers, logout } = useAuth()
  const ask = useAskDialog()
  const toast = useActionToast()
  const [open, setOpen] = useState(false)
  const [modal, setModal] = useState<ModalKind>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent): void => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!user) return null

  const pick = (kind: Exclude<ModalKind, null>): void => {
    setOpen(false)
    setModal(kind)
  }

  const handleLogout = async (): Promise<void> => {
    setOpen(false)
    const ok = await ask.confirm('Oturumu kapatmak istiyor musunuz?', {
      title: 'Oturumu Kapat',
      confirmLabel: 'Çıkış Yap',
      variant: 'danger'
    })
    if (ok) await logout()
  }

  const expiresAt = activeMembership?.tenant.usageExpiresAt ?? null
  const days = daysRemaining(expiresAt)
  const initial = user.full_name.trim().charAt(0).toLocaleUpperCase('tr-TR') || '?'

  return (
    <div className="profile-menu" ref={rootRef}>
      <button
        type="button"
        className={`profile-menu__trigger${open ? ' is-open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="profile-menu__avatar" aria-hidden>
          {initial}
        </span>
        <span>{user.full_name}</span>
        <span className="profile-menu__chevron" aria-hidden />
      </button>

      {open && (
        <div className="profile-menu__panel" role="menu">
          <div className="profile-menu__head">
            <strong>{user.full_name}</strong>
            <span>{user.email}</span>
          </div>
          <button type="button" role="menuitem" className="profile-menu__item" onClick={() => pick('profile')}>
            Profilim
          </button>
          <button type="button" role="menuitem" className="profile-menu__item" onClick={() => pick('usage')}>
            Kullanım süresi
          </button>
          <button type="button" role="menuitem" className="profile-menu__item" onClick={() => pick('password')}>
            Şifre değiştir
          </button>
          {canManageUsers && (
            <button type="button" role="menuitem" className="profile-menu__item" onClick={() => pick('users')}>
              Kullanıcılar ve yetkiler
            </button>
          )}
          <button
            type="button"
            role="menuitem"
            className="profile-menu__item profile-menu__item--danger"
            onClick={() => void handleLogout()}
          >
            Çıkış
          </button>
        </div>
      )}

      {modal === 'profile' && (
        <PlatformModal title="Profilim" onClose={() => setModal(null)}>
          <dl className="profile-info">
            <dt>Ad Soyad</dt>
            <dd>{user.full_name}</dd>
            <dt>E-posta</dt>
            <dd>{user.email}</dd>
            <dt>Rol (aktif kooperatif)</dt>
            <dd>{roleLabel(user.role)}</dd>
            <dt>Kooperatifler</dt>
            <dd>
              {memberships.length === 0
                ? '—'
                : memberships.map((m) => (
                    <div key={m.id}>
                      {m.tenant.name} · {roleLabel(m.role)}
                      {m.tenantId === activeMembership?.tenantId ? ' (açık)' : ''}
                    </div>
                  ))}
            </dd>
          </dl>
        </PlatformModal>
      )}

      {modal === 'usage' && (
        <PlatformModal title="Kullanım Süresi" onClose={() => setModal(null)}>
          <dl className="profile-info">
            <dt>Kooperatif</dt>
            <dd>{activeMembership?.tenant.name ?? '—'}</dd>
            <dt>Bitiş tarihi</dt>
            <dd>{expiresAt ? formatDate(expiresAt) : 'Sınırsız'}</dd>
            <dt>Kalan süre</dt>
            <dd>{usageLabel(days)}</dd>
            {activeMembership?.tenant.isDemo && (
              <>
                <dt>Hesap türü</dt>
                <dd>Demo</dd>
              </>
            )}
          </dl>
        </PlatformModal>
      )}

      {modal === 'password' && (
        <PlatformModal title="Şifre Değiştir" onClose={() => setModal(null)}>
          <ChangeOwnPasswordForm
            onSuccess={() => {
              toast.success('Şifre değiştirildi', 'Şifreniz başarıyla güncellendi.')
              setModal(null)
            }}
          />
        </PlatformModal>
      )}

      {modal === 'users' && canManageUsers && (
        <PlatformModal title="Kullanıcılar ve Yetkiler" onClose={() => setModal(null)} wide>
          <UsersSection />
        </PlatformModal>
      )}
    </div>
  )
}
