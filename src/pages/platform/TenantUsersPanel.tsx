import { useCallback, useEffect, useState } from 'react'
import DataPanel from '../../components/ui/DataPanel'
import EmptyState from '../../components/ui/EmptyState'
import { useActionToast } from '../../hooks/useActionToast'
import PlatformModal from '../../platform/PlatformModal'
import {
  platformApi,
  platformErrorMessage,
  type PlatformTenantUser
} from '../../platform/platformApi'
import { formatDateTime } from '../../utils/format'
import { Badge, ROLE_LABEL } from './platformUi'

type UserFormState = {
  id: string | null
  fullName: string
  email: string
  role: PlatformTenantUser['role']
  password: string
  mustChangePassword: boolean
}

export default function TenantUsersPanel({ tenantId, tenantName }: { tenantId: string; tenantName: string }): JSX.Element {
  const toast = useActionToast()
  const [users, setUsers] = useState<PlatformTenantUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState<UserFormState | null>(null)
  const [pwTarget, setPwTarget] = useState<PlatformTenantUser | null>(null)
  const [pwValue, setPwValue] = useState('')
  const [pwForce, setPwForce] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modalError, setModalError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setUsers(await platformApi.listUsers(tenantId))
    } catch (err) {
      setError(platformErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    void load()
  }, [load])

  const saveUser = async (): Promise<void> => {
    if (!form) return
    setSaving(true)
    setModalError('')
    try {
      if (form.id) {
        await platformApi.updateUser(tenantId, form.id, {
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          role: form.role
        })
      } else {
        if (form.password.length < 8) throw new Error('Şifre en az 8 karakter olmalıdır.')
        await platformApi.createUser(tenantId, {
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          password: form.password,
          role: form.role,
          mustChangePassword: form.mustChangePassword
        })
      }
      toast.success('Kullanıcı kaydedildi', form.fullName)
      setForm(null)
      void load()
    } catch (err) {
      setModalError(platformErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (u: PlatformTenantUser): Promise<void> => {
    setError('')
    try {
      await platformApi.updateUser(tenantId, u.id, { isActive: !u.isActive })
      void load()
    } catch (err) {
      setError(platformErrorMessage(err))
      toast.fail('Kullanıcı güncellenemedi', platformErrorMessage(err))
    }
  }

  const resetPassword = async (): Promise<void> => {
    if (!pwTarget) return
    if (pwValue.length < 8) return setModalError('Şifre en az 8 karakter olmalıdır.')
    setSaving(true)
    setModalError('')
    try {
      await platformApi.resetUserPassword(tenantId, pwTarget.id, {
        newPassword: pwValue,
        mustChangePassword: pwForce
      })
      toast.success('Şifre güncellendi', pwTarget.email)
      setPwTarget(null)
      setPwValue('')
      void load()
    } catch (err) {
      setModalError(platformErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <DataPanel
      title={`Kullanıcılar — ${tenantName}`}
      subtitle="Kooperatifin kullanıcıları ve yetkileri"
      noPadding
      actions={
        <button
          type="button"
          className="btn btn-sm btn-primary"
          onClick={() => {
            setModalError('')
            setForm({ id: null, fullName: '', email: '', role: 'STAFF', password: '', mustChangePassword: true })
          }}
        >
          Yeni Kullanıcı
        </button>
      }
    >
      {error && <div className="alert alert-error platform-inline-alert">{error}</div>}
      {loading ? (
        <div className="page-loading">Kullanıcılar yükleniyor...</div>
      ) : users.length === 0 ? (
        <EmptyState message="Bu kooperatifte kullanıcı yok." compact />
      ) : (
        <div className="table-wrap table-wrap--compact">
          <table className="data-table">
            <thead>
              <tr>
                <th>E-posta</th>
                <th>Ad Soyad</th>
                <th>Rol</th>
                <th>Durum</th>
                <th>Son Giriş</th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="cell-mono">{u.email}</td>
                  <td>
                    {u.fullName}
                    {u.mustChangePassword && <span className="platform-tag">Şifre değişmeli</span>}
                  </td>
                  <td>{ROLE_LABEL[u.role] ?? u.role}</td>
                  <td>
                    <Badge tone={u.isActive ? 'green' : 'gray'}>{u.isActive ? 'Aktif' : 'Pasif'}</Badge>
                  </td>
                  <td>{formatDateTime(u.lastLoginAt)}</td>
                  <td>
                    <div className="settings-row-actions">
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => {
                          setModalError('')
                          setForm({ id: u.id, fullName: u.fullName, email: u.email, role: u.role, password: '', mustChangePassword: false })
                        }}
                      >
                        Düzenle
                      </button>
                      <button type="button" className="btn btn-sm" onClick={() => void toggleActive(u)}>
                        {u.isActive ? 'Pasif Yap' : 'Aktif Yap'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => {
                          setModalError('')
                          setPwValue('')
                          setPwForce(true)
                          setPwTarget(u)
                        }}
                      >
                        Şifre Sıfırla
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {form && (
        <PlatformModal
          title={form.id ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı'}
          onClose={() => setForm(null)}
          footer={
            <>
              <button type="button" className="btn btn-sm" onClick={() => setForm(null)}>
                İptal
              </button>
              <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void saveUser()}>
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </>
          }
        >
          {modalError && <div className="alert alert-error">{modalError}</div>}
          <div className="form-grid form-grid--2">
            <div className="form-group">
              <label>Ad Soyad</label>
              <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            </div>
            <div className="form-group">
              <label>E-posta</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Rol</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as PlatformTenantUser['role'] })}>
                {(['ADMIN', 'STAFF', 'VIEWER'] as const).map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </select>
            </div>
            {!form.id && (
              <>
                <div className="form-group">
                  <label>Geçici Şifre</label>
                  <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="off" />
                </div>
                <label className="platform-check form-group--wide">
                  <input
                    type="checkbox"
                    checked={form.mustChangePassword}
                    onChange={(e) => setForm({ ...form, mustChangePassword: e.target.checked })}
                  />
                  İlk girişte şifre değiştirmeye zorla
                </label>
              </>
            )}
          </div>
        </PlatformModal>
      )}

      {pwTarget && (
        <PlatformModal
          title={`Şifre Sıfırla — ${pwTarget.email}`}
          onClose={() => setPwTarget(null)}
          footer={
            <>
              <button type="button" className="btn btn-sm" onClick={() => setPwTarget(null)}>
                İptal
              </button>
              <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void resetPassword()}>
                Şifreyi Kaydet
              </button>
            </>
          }
        >
          {modalError && <div className="alert alert-error">{modalError}</div>}
          <div className="form-group">
            <label>Yeni Geçici Şifre</label>
            <input value={pwValue} onChange={(e) => setPwValue(e.target.value)} autoComplete="off" />
          </div>
          <label className="platform-check">
            <input type="checkbox" checked={pwForce} onChange={(e) => setPwForce(e.target.checked)} />
            Sonraki girişte şifre değiştirmeye zorla
          </label>
        </PlatformModal>
      )}
    </DataPanel>
  )
}
