import { useState } from 'react'
import type { ResetPasswordWithSecurityPayload } from '@shared/types'

type ResetStep = 'email' | 'answer' | 'password' | 'done'

interface ForgotPasswordModalProps {
  onClose: () => void
}

export default function ForgotPasswordModal({ onClose }: ForgotPasswordModalProps): JSX.Element {
  const [step, setStep] = useState<ResetStep>('email')
  const [email, setEmail] = useState('')
  const [securityQuestion, setSecurityQuestion] = useState('')
  const [securityAnswer, setSecurityAnswer] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleLookup = async (): Promise<void> => {
    setSubmitting(true)
    setError('')
    const res = await window.api.auth.getPasswordResetQuestion(email.trim())
    setSubmitting(false)
    if (res.success && res.data) {
      const q = res.data.security_question
      if (!q) {
        // E-posta yok / soru yok — aynı genel mesaj (enumeration yok)
        setError(
          res.data.message ??
            'Eğer bu e-posta kayıtlıysa ve güvenlik sorusu tanımlıysa devam edebilirsiniz. Aksi halde iletişime geçin.'
        )
        return
      }
      setSecurityQuestion(q)
      setStep('answer')
      return
    }
    setError(res.error ?? 'İşlem başarısız')
  }

  const handleVerifyAnswer = (): void => {
    if (!securityAnswer.trim()) {
      setError('Güvenlik cevabı zorunludur')
      return
    }
    setError('')
    setStep('password')
  }

  const handleResetPassword = async (): Promise<void> => {
    setSubmitting(true)
    setError('')
    const payload: ResetPasswordWithSecurityPayload = {
      username: email.trim(),
      security_answer: securityAnswer,
      password,
      password_confirm: passwordConfirm
    }
    const res = await window.api.auth.resetPasswordWithSecurityAnswer(payload)
    setSubmitting(false)
    if (res.success) {
      setStep('done')
      return
    }
    setError(res.error ?? 'Şifre sıfırlanamadı')
  }

  return (
    <div className="modal-overlay">
      <div className="modal modal--narrow">
        <div className="modal-header">
          <h3>Şifremi Unuttum</h3>
          <button type="button" className="btn btn-sm" onClick={onClose}>
            Kapat
          </button>
        </div>

        <div className="modal-body">
          {error && <div className="alert alert-error">{error}</div>}

          {step === 'email' && (
            <>
              <p className="auth-form__subtitle">
                Şifrenizi sıfırlamak için e-posta adresinizi girin.
              </p>
              <div className="form-group">
                <label>E-posta Adresi</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                  autoComplete="email"
                />
              </div>
            </>
          )}

          {step === 'answer' && (
            <>
              <p className="auth-form__subtitle">Güvenlik sorusunu yanıtlayın.</p>
              <div className="form-group form-group--wide">
                <label>Güvenlik Sorusu</label>
                <div className="security-question-display">{securityQuestion}</div>
              </div>
              <div className="form-group form-group--wide">
                <label>Güvenlik Cevabı</label>
                <input
                  value={securityAnswer}
                  onChange={(e) => setSecurityAnswer(e.target.value)}
                  autoFocus
                  autoComplete="off"
                />
              </div>
            </>
          )}

          {step === 'password' && (
            <>
              <p className="auth-form__subtitle">Yeni şifrenizi belirleyin.</p>
              <div className="form-group">
                <label>Yeni Şifre</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Yeni Şifre Tekrar</label>
                <input
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
            </>
          )}

          {step === 'done' && (
            <div className="alert alert-success">
              Şifreniz değiştirildi. Yeni şifrenizle giriş yapabilirsiniz.
            </div>
          )}
        </div>

        <div className="modal-footer">
          {step !== 'done' && (
            <button type="button" className="btn btn-sm" onClick={onClose}>
              İptal
            </button>
          )}

          {step === 'email' && (
            <button
              type="button"
              className="btn btn-sm btn-primary"
              disabled={submitting || !email.trim()}
              onClick={handleLookup}
            >
              {submitting ? 'Kontrol ediliyor...' : 'Devam Et'}
            </button>
          )}

          {step === 'answer' && (
            <>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => {
                  setStep('email')
                  setSecurityAnswer('')
                  setError('')
                }}
              >
                Geri
              </button>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                disabled={!securityAnswer.trim()}
                onClick={handleVerifyAnswer}
              >
                Devam Et
              </button>
            </>
          )}

          {step === 'password' && (
            <>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => {
                  setStep('answer')
                  setPassword('')
                  setPasswordConfirm('')
                  setError('')
                }}
              >
                Geri
              </button>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                disabled={submitting}
                onClick={handleResetPassword}
              >
                {submitting ? 'Kaydediliyor...' : 'Şifreyi Değiştir'}
              </button>
            </>
          )}

          {step === 'done' && (
            <button type="button" className="btn btn-sm btn-primary" onClick={onClose}>
              Giriş Ekranına Dön
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
