import { FormEvent, useCallback, useEffect, useState } from 'react'
import DataPanel from '../../components/ui/DataPanel'
import { useActionToast } from '../../hooks/useActionToast'
import { platformApi, platformErrorMessage, type PlatformContactSettings } from '../../platform/platformApi'
import { PageHeader } from './platformUi'

export default function PlatformSettingsPage(): JSX.Element {
  const toast = useActionToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [whatsapp, setWhatsapp] = useState('')

  const apply = useCallback((c: PlatformContactSettings) => {
    setPhone(c.phone ?? '')
    setEmail(c.email ?? '')
    setWhatsapp(c.whatsapp ?? '')
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      apply(await platformApi.getContactSettings())
    } catch (err) {
      setError(platformErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [apply])

  useEffect(() => {
    void load()
  }, [load])

  const onSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault()
    setSaving(true)
    try {
      const saved = await platformApi.updateContactSettings({
        phone: phone.trim(),
        email: email.trim(),
        whatsapp: whatsapp.trim() || null
      })
      apply(saved)
      toast.success('Kaydedildi', 'İletişim bilgileri güncellendi.')
    } catch (err) {
      toast.fail('Kayıt başarısız', platformErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="pf-page">
      <PageHeader
        title="Ayarlar"
        subtitle="Kooperatif kullanıcılarına gösterilen platform iletişim bilgileri."
      />

      {error ? (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      ) : null}

      <DataPanel title="İletişim bilgileri">
        {loading ? (
          <p className="pf-muted">Yükleniyor…</p>
        ) : (
          <form className="pf-form" onSubmit={(e) => void onSubmit(e)}>
            <div className="form-grid">
              <label className="form-field">
                <span>Telefon</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Örn. 0212 000 00 00"
                  autoComplete="tel"
                />
              </label>
              <label className="form-field">
                <span>E-posta</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="destek@ornek.com"
                  autoComplete="email"
                />
              </label>
              <label className="form-field">
                <span>WhatsApp numarası (isteğe bağlı)</span>
                <input
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="Örn. 05xx xxx xx xx"
                />
              </label>
            </div>
            <p className="pf-muted" style={{ marginTop: 8 }}>
              Bu bilgiler demo / süre uyarı şeritlerinde ve erişim engeli ekranında gösterilir. Kooperatif
              kullanıcıları yalnızca okuyabilir.
            </p>
            <div className="pf-form__actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
            </div>
          </form>
        )}
      </DataPanel>
    </div>
  )
}
