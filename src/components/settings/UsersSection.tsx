import { useCallback, useEffect, useState } from 'react'
import type { User, UserCreatePayload, UserRole, UserUpdatePayload } from '@shared/types'
import SecurityQuestionFields, {
  EMPTY_SECURITY_QUESTION_FORM,
  type SecurityQuestionFormValues
} from '../auth/SecurityQuestionFields'
import DataPanel from '../ui/DataPanel'
import EmptyState from '../ui/EmptyState'
import StatusBadge from '../ui/StatusBadge'
import { roleLabel, useAuth } from '../../auth/AuthContext'
import { useAskDialog } from '../../hooks/useAskDialog'
import { formatDateTime } from '../../utils/format'
import { useActionToast } from '../../hooks/useActionToast'

const ROLES: UserRole[] = ['ADMIN', 'STAFF', 'VIEWER']

interface UserFormState {
  full_name: string
  email: string
  phone: string
  role: UserRole
  password: string
  password_confirm: string
  is_active: number
  security: SecurityQuestionFormValues
}

const EMPTY_FORM: UserFormState = {
  full_name: '',
  email: '',
  phone: '',
  role: 'STAFF',
  password: '',
  password_confirm: '',
  is_active: 1,
  security: EMPTY_SECURITY_QUESTION_FORM
}

export default function UsersSection(): JSX.Element {
  const toast = useActionToast()
  const ask = useAskDialog()
  const { user: authUser } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [pwTarget, setPwTarget] = useState<User | null>(null)
  const [pwForm, setPwForm] = useState({ password: '', password_confirm: '' })
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [form, setForm] = useState<UserFormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const loadUsers = useCallback(async () => {
    setLoading(true)
    const res = await window.api.users.list()
    if (res.success && res.data) setUsers(res.data)
    else setError(res.error ?? 'Kullanıcılar yüklenemedi')
    setLoading(false)
  }, [])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const selfEmail = (authUser?.email ?? '').trim().toLowerCase()
  const isSelf = (u: User): boolean =>
    selfEmail !== '' && (u.email ?? u.username ?? '').trim().toLowerCase() === selfEmail
  const activeAdminCount = users.filter((u) => u.role === 'ADMIN' && u.is_active === 1).length
  const isLastAdmin = (u: User): boolean =>
    u.role === 'ADMIN' && u.is_active === 1 && activeAdminCount <= 1

  const openPasswordReset = (u: User): void => {
    setPwTarget(u)
    setPwForm({ password: '', password_confirm: '' })
    setPwError('')
  }

  const handlePasswordReset = async (): Promise<void> => {
    if (!pwTarget) return
    setPwSaving(true)
    setPwError('')
    const res = await window.api.users.changePassword(pwTarget.id, pwForm)
    setPwSaving(false)
    if (res.success) {
      toast.success('Şifre sıfırlandı', `${pwTarget.full_name} için yeni şifre belirlendi.`)
      setPwTarget(null)
    } else {
      setPwError(res.error ?? 'Şifre sıfırlanamadı')
    }
  }

  const handleRemove = async (u: User): Promise<void> => {
    if (isSelf(u)) {
      setError('Kendi hesabınızı silemezsiniz.')
      return
    }
    if (isLastAdmin(u)) {
      setError('Kooperatifte en az bir aktif yönetici kalmalıdır.')
      return
    }
    const ok = await ask.confirm(
      `${u.full_name} (${u.email || u.username}) kullanıcısı bu kooperatiften kaldırılacak. Devam edilsin mi?`,
      { title: 'Kullanıcıyı Sil', confirmLabel: 'Sil', variant: 'danger' }
    )
    if (!ok) return
    setError('')
    setMessage('')
    const res = await window.api.users.remove(u.id)
    if (res.success) {
      toast.success('Kullanıcı silindi', 'Kullanıcı kooperatiften kaldırıldı.')
      loadUsers()
    } else {
      setError(res.error ?? 'Kullanıcı silinemedi')
      toast.fail('Kullanıcı silinemedi', res.error)
    }
  }

  const openCreate = (): void => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
    setError('')
    setMessage('')
  }

  const openEdit = (user: User): void => {
    setEditing(user)
    setForm({
      full_name: user.full_name,
      email: user.email ?? '',
      phone: user.phone ?? '',
      role: user.role,
      password: '',
      password_confirm: '',
      is_active: user.is_active,
      security: EMPTY_SECURITY_QUESTION_FORM
    })
    setShowModal(true)
    setError('')
    setMessage('')
  }

  const handleSave = async (): Promise<void> => {
    setSaving(true)
    setError('')
    try {
      if (editing) {
        const payload: UserUpdatePayload = {
          full_name: form.full_name,
          email: form.email,
          phone: form.phone,
          role: form.role,
          is_active: form.is_active
        }
        if (form.password || form.password_confirm) {
          payload.password = form.password
          payload.password_confirm = form.password_confirm
        }
        const res = await window.api.users.update(editing.id, payload)
        if (!res.success) throw new Error(res.error ?? 'Güncelleme başarısız')
        setMessage('Kullanıcı güncellendi.')
        toast.success('Kullanıcı güncellendi', 'Kullanıcı bilgileri başarıyla kaydedildi.')
      } else {
        const payload: UserCreatePayload = {
          full_name: form.full_name,
          email: form.email,
          phone: form.phone,
          role: form.role,
          password: form.password,
          password_confirm: form.password_confirm,
          is_active: form.is_active,
          security_question: form.security.security_question,
          security_question_custom: form.security.security_question_custom,
          security_answer: form.security.security_answer
        }
        const res = await window.api.users.create(payload)
        if (!res.success) throw new Error(res.error ?? 'Kullanıcı oluşturulamadı')
        setMessage('Yeni kullanıcı eklendi.')
        toast.success('Kullanıcı kaydedildi', 'Yeni kullanıcı başarıyla eklendi.')
      }
      setShowModal(false)
      loadUsers()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'İşlem başarısız'
      setError(message)
      toast.fail(editing ? 'Kullanıcı güncellenemedi' : 'Kullanıcı kaydedilemedi', message)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (user: User): Promise<void> => {
    setError('')
    setMessage('')
    const next = user.is_active ? 0 : 1
    if (!next && isSelf(user)) {
      setError('Kendi hesabınızı kilitleyemezsiniz.')
      return
    }
    if (!next && isLastAdmin(user)) {
      setError('Kooperatifte en az bir aktif yönetici kalmalıdır.')
      return
    }
    const res = await window.api.users.setActive(user.id, next)
    if (res.success) {
      setMessage(next ? 'Kullanıcı aktif yapıldı.' : 'Kullanıcı pasif yapıldı.')
      toast.success(
        next ? 'Kullanıcı aktif yapıldı' : 'Kullanıcı pasif yapıldı',
        'Kullanıcı durumu güncellendi.'
      )
      loadUsers()
    } else {
      setError(res.error ?? 'Durum güncellenemedi')
      toast.fail('Kullanıcı güncellenemedi', res.error)
    }
  }

  if (loading) {
    return <div className="page-loading">Kullanıcılar yükleniyor...</div>
  }

  return (
    <>
      {error && !showModal && <div className="alert alert-error">{error}</div>}
      {message && !showModal && <div className="alert alert-success">{message}</div>}

      <DataPanel
        title="Kullanıcılar ve Yetkiler"
        subtitle="Kullanıcı oluşturma, düzenleme ve yetki yönetimi"
        actions={
          <button type="button" className="btn btn-sm btn-primary" onClick={openCreate}>
            Yeni Kullanıcı
          </button>
        }
        noPadding
      >
        {users.length === 0 ? (
          <EmptyState message="Henüz kullanıcı kaydı bulunmuyor." compact />
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
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="cell-mono">{user.email || user.username}</td>
                    <td>{user.full_name}</td>
                    <td>{roleLabel(user.role)}</td>
                    <td>
                      <StatusBadge active={user.is_active === 1} />
                    </td>
                    <td>{formatDateTime(user.last_login_at)}</td>
                    <td>
                      <div className="settings-row-actions">
                        <button type="button" className="btn btn-sm" onClick={() => openEdit(user)}>
                          Düzenle
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm"
                          disabled={user.is_active === 1 && (isSelf(user) || isLastAdmin(user))}
                          title={isSelf(user) ? 'Kendi hesabınızı kilitleyemezsiniz' : undefined}
                          onClick={() => handleToggleActive(user)}
                        >
                          {user.is_active ? 'Kilitle' : 'Kilidi Aç'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => openPasswordReset(user)}
                        >
                          Şifre Sıfırla
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          disabled={isSelf(user) || isLastAdmin(user)}
                          title={
                            isSelf(user)
                              ? 'Kendi hesabınızı silemezsiniz'
                              : isLastAdmin(user)
                                ? 'Son yönetici silinemez'
                                : undefined
                          }
                          onClick={() => void handleRemove(user)}
                        >
                          Sil
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DataPanel>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>{editing ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı'}</h3>
              <button type="button" className="btn btn-sm" onClick={() => setShowModal(false)}>
                Kapat
              </button>
            </div>
            <div className="modal-body">
              {error && <div className="alert alert-error">{error}</div>}
              <div className="form-grid">
                <div className="form-group">
                  <label>Ad Soyad</label>
                  <input
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>E-posta Adresi</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    autoComplete="email"
                  />
                </div>
                <div className="form-group">
                  <label>Telefon Numarası</label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="05XX XXX XX XX"
                  />
                </div>
                <div className="form-group">
                  <label>Rol</label>
                  <select
                    value={form.role}
                    disabled={Boolean(editing && editing.role === 'ADMIN' && (isSelf(editing) || isLastAdmin(editing)))}
                    title={editing && isSelf(editing) ? 'Kendi yetkinizi düşüremezsiniz' : undefined}
                    onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                  >
                    {ROLES.map((role) => (
                      <option key={role} value={role}>
                        {roleLabel(role)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Durum</label>
                  <select
                    value={form.is_active}
                    disabled={Boolean(editing && (isSelf(editing) || isLastAdmin(editing)))}
                    onChange={(e) => setForm({ ...form, is_active: Number(e.target.value) })}
                  >
                    <option value={1}>Aktif</option>
                    <option value={0}>Pasif</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>{editing ? 'Yeni Şifre (opsiyonel)' : 'Şifre'}</label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    autoComplete="new-password"
                  />
                </div>
                <div className="form-group">
                  <label>Şifre Tekrar</label>
                  <input
                    type="password"
                    value={form.password_confirm}
                    onChange={(e) => setForm({ ...form, password_confirm: e.target.value })}
                    autoComplete="new-password"
                  />
                </div>
                {!editing && (
                  <SecurityQuestionFields
                    values={form.security}
                    onChange={(security) => setForm({ ...form, security })}
                  />
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-sm" onClick={() => setShowModal(false)}>
                İptal
              </button>
              <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {pwTarget && (
        <div className="modal-overlay">
          <div className="modal modal--narrow">
            <div className="modal-header">
              <h3>Şifre Sıfırla — {pwTarget.full_name}</h3>
              <button type="button" className="btn btn-sm" onClick={() => setPwTarget(null)}>
                Kapat
              </button>
            </div>
            <div className="modal-body">
              {pwError && <div className="alert alert-error">{pwError}</div>}
              <div className="form-grid">
                <div className="form-group">
                  <label>Yeni Şifre</label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={pwForm.password}
                    onChange={(e) => setPwForm({ ...pwForm, password: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Yeni Şifre Tekrar</label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={pwForm.password_confirm}
                    onChange={(e) => setPwForm({ ...pwForm, password_confirm: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-sm" onClick={() => setPwTarget(null)}>
                İptal
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handlePasswordReset}
                disabled={pwSaving}
              >
                {pwSaving ? 'Kaydediliyor...' : 'Şifreyi Sıfırla'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
