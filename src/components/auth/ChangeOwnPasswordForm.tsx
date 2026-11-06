import { useState, type FormEvent } from 'react'
import type { ChangeOwnPasswordPayload } from '@shared/types'

interface ChangeOwnPasswordFormProps {
  onSuccess: () => void | Promise<void>
  submitLabel?: string
}

/** Kendi şifresini değiştir — window.api.auth.changeOwnPassword (/api/auth/change-own-password). */
export default function ChangeOwnPasswordForm({
  onSuccess,
  submitLabel = 'Şifreyi Güncelle'
}: ChangeOwnPasswordFormProps): JSX.Element {
  const [form, setForm] = useState<ChangeOwnPasswordPayload>({
    current_password: '',
    password: '',
    password_confirm: ''
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault()
    setError('')
    if (form.password.length < 6) return setError('Yeni şifre en az 6 karakter olmalıdır.')
    if (form.password !== form.password_confirm) return setError('Yeni şifreler eşleşmiyor.')
    setSaving(true)
    const res = await window.api.auth.changeOwnPassword(form)
    setSaving(false)
    if (!res.success) {
      setError(res.error ?? 'Şifre güncellenemedi')
      return
    }
    setForm({ current_password: '', password: '', password_confirm: '' })
    await onSuccess()
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="change-password-form">
      {error && <div className="alert alert-error">{error}</div>}
      <div className="form-grid">
        <div className="form-group">
          <label>Mevcut Şifre</label>
          <input
            type="password"
            autoComplete="current-password"
            value={form.current_password}
            onChange={(e) => setForm({ ...form, current_password: e.target.value })}
            autoFocus
          />
        </div>
        <div className="form-group">
          <label>Yeni Şifre</label>
          <input
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label>Yeni Şifre Tekrar</label>
          <input
            type="password"
            autoComplete="new-password"
            value={form.password_confirm}
            onChange={(e) => setForm({ ...form, password_confirm: e.target.value })}
          />
        </div>
      </div>
      <div className="settings-actions">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Kaydediliyor...' : submitLabel}
        </button>
      </div>
    </form>
  )
}
