import { useMemo, useState, type FormEvent } from 'react'
import { activateLicenseRequest } from '../../api/auth'
import { useAuth } from '../../auth/AuthContext'
import { useActionToast } from '../../hooks/useActionToast'
import koopPlusMark from '../../assets/brand/koopPlusFavicon.png'

/** Şifre değişikliğinden sonra — lisans anahtarı ile kooperatif etkinleştirme. */
export default function LicenseActivation(): JSX.Element {
  const { user, memberships, tenantId, selectTenant, refreshSession, logout } = useAuth()
  const toast = useActionToast()
  const [key, setKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const pending = useMemo(
    () =>
      memberships.filter(
        (m) => m.role === 'ADMIN' && (m.tenant.licensePending || !m.tenant.licenseActivatedAt)
      ),
    [memberships]
  )

  const selectedId =
    (tenantId && pending.some((m) => m.tenantId === tenantId) ? tenantId : null) ??
    pending[0]?.tenantId ??
    ''

  const selected = pending.find((m) => m.tenantId === selectedId) ?? pending[0]

  const onSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault()
    if (!selectedId) return
    setBusy(true)
    setError('')
    try {
      await activateLicenseRequest(selectedId, key)
      toast.success('Lisans etkinleştirildi', 'Kooperatif kullanıma açıldı.')
      selectTenant(selectedId)
      await refreshSession()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Etkinleştirme başarısız')
    } finally {
      setBusy(false)
    }
  }

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
            <h2 className="login-card__title">Lisans Etkinleştirme</h2>
            <p className="login-card__subtitle">
              {user?.full_name ? `${user.full_name}, ` : ''}
              <strong>{selected?.tenant.name ?? 'Kooperatif'}</strong> henüz etkinleştirilmedi. Hoş
              geldin e-postasındaki lisans anahtarını girin.
            </p>
            {pending.length > 1 && (
              <label className="field" style={{ display: 'block', marginBottom: 12 }}>
                <span>Kooperatif</span>
                <select
                  value={selectedId}
                  onChange={(e) => selectTenant(e.target.value)}
                  disabled={busy}
                >
                  {pending.map((m) => (
                    <option key={m.tenantId} value={m.tenantId}>
                      {m.tenant.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <form onSubmit={(e) => void onSubmit(e)}>
              <label className="field" style={{ display: 'block', marginBottom: 12 }}>
                <span>Lisans anahtarı</span>
                <input
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="KOOP-XXXX-XXXX-XXXX-XXXX"
                  value={key}
                  onChange={(e) => setKey(e.target.value.toUpperCase())}
                  disabled={busy}
                  required
                />
              </label>
              {error && (
                <div className="alert alert-error" role="alert">
                  {error}
                </div>
              )}
              <button type="submit" className="btn btn-primary" disabled={busy || !selectedId}>
                {busy ? 'Kontrol ediliyor...' : 'Etkinleştir'}
              </button>
            </form>
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
