import { useCallback, useEffect, useState } from 'react'
import type { User, UserCreatePayload, UserRole, UserUpdatePayload } from '@shared/types'
import SecurityQuestionFields, {
  EMPTY_SECURITY_QUESTION_FORM,
  type SecurityQuestionFormValues
} from '../auth/SecurityQuestionFields'
import DataPanel from '../ui/DataPanel'
import EmptyState from '../ui/EmptyState'
import StatusBadge from '../ui/StatusBadge'
import { roleLabel } from '../../auth/AuthContext'
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
  const [users, setUsers] = useState<User[]>([])
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
                          onClick={() => handleToggleActive(user)}
                        >
                          {user.is_active ? 'Pasif Yap' : 'Aktif Yap'}
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
    </>
  )
}
