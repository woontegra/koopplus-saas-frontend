import { useState, type FormEvent, type ReactNode } from 'react'
import type { ChangeOwnPasswordPayload } from '@shared/types'

interface ChangeOwnPasswordFormProps {
  onSuccess: () => void | Promise<void>
  submitLabel?: string
  /** Submit ile aynı satırda gösterilecek ek eylem (ör. Çıkış Yap). */
  secondaryAction?: ReactNode
}

function PasswordField({
  label,
  autoComplete,
  value,
  onChange,
  autoFocus
}: {
  label: string
  autoComplete: string
  value: string
  onChange: (value: string) => void
  autoFocus?: boolean
}): JSX.Element {
  const [visible, setVisible] = useState(false)
  return (
    <div className="form-group auth-password-field">
      <label>{label}</label>
      <div className="auth-password-field__row">
        <input
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoFocus={autoFocus}
        />
        <button
          type="button"
          className="btn btn-xs auth-password-field__toggle"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Şifreyi gizle' : 'Şifreyi göster'}
        >
          {visible ? 'Gizle' : 'Göster'}
        </button>
      </div>
    </div>
  )
}

/** Kendi şifresini değiştir — window.api.auth.changeOwnPassword (/api/auth/change-own-password). */
export default function ChangeOwnPasswordForm({
  onSuccess,
  submitLabel = 'Şifreyi Güncelle',
  secondaryAction
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
    <form onSubmit={(e) => void submit(e)} className="change-password-form change-password-form--stack">
      {error && <div className="alert alert-error">{error}</div>}
      <div className="form-grid form-grid--stack">
        <PasswordField
          label="Mevcut Şifre"
          autoComplete="current-password"
          value={form.current_password}
          onChange={(current_password) => setForm({ ...form, current_password })}
          autoFocus
        />
        <PasswordField
          label="Yeni Şifre"
          autoComplete="new-password"
          value={form.password}
          onChange={(password) => setForm({ ...form, password })}
        />
        <PasswordField
          label="Yeni Şifre Tekrar"
          autoComplete="new-password"
          value={form.password_confirm}
          onChange={(password_confirm) => setForm({ ...form, password_confirm })}
        />
      </div>
      <div className="settings-actions auth-gate-actions">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Kaydediliyor...' : submitLabel}
        </button>
        {secondaryAction}
      </div>
    </form>
  )
}
