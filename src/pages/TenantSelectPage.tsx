import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { roleLabel } from '../auth/roles'

export default function TenantSelectPage(): JSX.Element {
  const { memberships, tenantId, selectTenant, user } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')

  useEffect(() => {
    if (memberships.length === 1 && !tenantId) {
      selectTenant(memberships[0].tenantId)
      navigate('/', { replace: true })
    }
  }, [memberships, tenantId, selectTenant, navigate])

  if (memberships.length === 0) {
    return <Navigate to="/login" replace />
  }

  if (memberships.length === 1) {
    return (
      <div className="auth-loading" role="status">
        Kooperatif paneline yönlendiriliyor…
      </div>
    )
  }

  const onSelect = (nextTenantId: string): void => {
    setError('')
    try {
      selectTenant(nextTenantId)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kooperatif seçilemedi')
    }
  }

  return (
    <section className="data-panel tenant-select">
      <div className="data-panel__header">
        <h1 className="data-panel__title">Kooperatif seçin</h1>
      </div>
      <div className="data-panel__body">
        <p className="placeholder-copy">
          {user?.fullName ? `${user.fullName}, ` : ''}
          birden fazla kooperatif üyeliğiniz var. Devam etmek için bir kooperatif seçin.
        </p>

        {error ? (
          <div className="alert alert-error" role="alert">
            {error}
          </div>
        ) : null}

        <ul className="tenant-select__list">
          {memberships.map((membership) => {
            const selected = membership.tenantId === tenantId
            return (
              <li key={membership.id}>
                <button
                  type="button"
                  className={
                    selected
                      ? 'tenant-select__card tenant-select__card--active'
                      : 'tenant-select__card'
                  }
                  onClick={() => onSelect(membership.tenantId)}
                >
                  <strong>{membership.tenant.name}</strong>
                  <span>{roleLabel(membership.role)}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
