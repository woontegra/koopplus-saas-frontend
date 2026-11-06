import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import { getPartner, listPartners } from '../api/partners'
import type { Partner, PartnerListItem } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { canWriteMembers } from '../auth/roles'
import MemberFormModal from '../components/members/MemberFormModal'

function matchesSearch(partner: PartnerListItem, query: string): boolean {
  if (!query) return true
  const q = query.toLocaleLowerCase('tr-TR')
  return (
    partner.partnerNo.toLocaleLowerCase('tr-TR').includes(q) ||
    partner.fullName.toLocaleLowerCase('tr-TR').includes(q)
  )
}

export default function MembersPage(): JSX.Element {
  const { token, tenantId, activeRole } = useAuth()
  const canWrite = canWriteMembers(activeRole)
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [partners, setPartners] = useState<PartnerListItem[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editPartner, setEditPartner] = useState<Partner | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!token || !tenantId) return
    setLoading(true)
    setError('')
    try {
      const data = await listPartners({ token, tenantId })
      setPartners(data.partners)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Üyeler yüklenemedi')
    } finally {
      setLoading(false)
    }
  }, [token, tenantId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!canWrite) return
    if (searchParams.get('action') === 'new') {
      setEditPartner(null)
      setShowModal(true)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams, canWrite])

  const filtered = useMemo(
    () => partners.filter((p) => matchesSearch(p, search.trim())),
    [partners, search]
  )

  const openCreate = (): void => {
    if (!canWrite) return
    setEditPartner(null)
    setShowModal(true)
  }

  const openEdit = async (item: PartnerListItem): Promise<void> => {
    if (!canWrite || !token || !tenantId) return
    setError('')
    try {
      const data = await getPartner(item.id, { token, tenantId })
      setEditPartner(data.partner)
      setShowModal(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Üye detayı alınamadı')
    }
  }

  const onSaved = (partner: Partner): void => {
    setShowModal(false)
    setEditPartner(null)
    setSuccess(editPartner ? 'Üye güncellendi.' : 'Üye oluşturuldu.')
    void load()
    navigate(`/uyeler/${partner.id}`)
  }

  return (
    <section className="data-panel members-page">
      <div className="data-panel__header members-page__header">
        <div>
          <h1 className="data-panel__title">Üyeler</h1>
          <p className="members-page__subtitle">Kayıtlı kooperatif üyeleri</p>
        </div>
        <div className="members-page__header-meta">
          <span className="members-page__count">{filtered.length} üye</span>
          {canWrite ? (
            <button type="button" className="btn btn--primary" onClick={openCreate}>
              + Yeni Üye
            </button>
          ) : null}
        </div>
      </div>

      <div className="data-panel__body members-page__body">
        <div className="members-toolbar">
          <input
            className="members-toolbar__search"
            type="search"
            placeholder="Üye no, ad…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Üye ara"
          />
          <button type="button" className="btn btn--ghost" onClick={() => void load()} disabled={loading}>
            Yenile
          </button>
        </div>

        {error ? <div className="alert alert-error">{error}</div> : null}
        {success ? <div className="alert alert-success">{success}</div> : null}
        {!canWrite ? (
          <p className="members-page__hint">İzleyici rolü: üyeleri görüntüleyebilirsiniz; değişiklik yapılamaz.</p>
        ) : null}

        <div className="members-table-wrap">
          <table className="members-table">
            <thead>
              <tr>
                <th>Üye No</th>
                <th>Ad Soyad / Ünvan</th>
                <th>Durum</th>
                <th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="members-table__empty">
                    Yükleniyor…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="members-table__empty">
                    {search.trim() ? 'Aramaya uygun üye bulunamadı.' : 'Henüz üye kaydı yok.'}
                  </td>
                </tr>
              ) : (
                filtered.map((partner) => (
                  <tr
                    key={partner.id}
                    className={
                      selectedId === partner.id
                        ? 'members-table__row members-table__row--selected'
                        : 'members-table__row'
                    }
                    onClick={() => setSelectedId(partner.id)}
                    onDoubleClick={() => void (canWrite ? openEdit(partner) : navigate(`/uyeler/${partner.id}`))}
                  >
                    <td className="members-table__mono">{partner.partnerNo}</td>
                    <td>
                      <Link className="members-table__name" to={`/uyeler/${partner.id}`}>
                        {partner.fullName}
                      </Link>
                    </td>
                    <td>
                      <span
                        className={
                          partner.isActive
                            ? 'status-badge status-badge--active'
                            : 'status-badge status-badge--inactive'
                        }
                      >
                        {partner.isActive ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>
                    <td>
                      <div className="members-table__actions">
                        <Link className="btn btn--ghost btn--sm" to={`/uyeler/${partner.id}`}>
                          Detay
                        </Link>
                        {canWrite ? (
                          <button
                            type="button"
                            className="btn btn--ghost btn--sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              void openEdit(partner)
                            }}
                          >
                            Düzenle
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && canWrite ? (
        <MemberFormModal
          partner={editPartner}
          onClose={() => {
            setShowModal(false)
            setEditPartner(null)
          }}
          onSaved={onSaved}
        />
      ) : null}
    </section>
  )
}
