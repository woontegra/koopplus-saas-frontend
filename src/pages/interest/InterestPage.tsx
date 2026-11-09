import { useCallback, useEffect, useMemo, useState } from 'react'
import type {
  InterestPolicy,
  InterestPolicyAppliedMembersResult,
  InterestPolicyInput,
  InterestPolicyScopeType,
  InterestRun,
  InterestRunDetail,
  RangeInterestApplyResult,
  RangeInterestPreviewResult
} from '@shared/types'
import { InterestRangePreviewTable } from '../../components/interest/InterestRangePreviewTable'
import InterestRunDetailModal from '../../components/interest/InterestRunDetailModal'
import InterestPolicyMemberPicker, {
  formatInterestPolicyScopeLabel
} from '../../components/interest/InterestPolicyMemberPicker'
import DataPanel from '../../components/ui/DataPanel'
import EmptyState from '../../components/ui/EmptyState'
import StatPanel from '../../components/ui/StatPanel'
import StatusBadge from '../../components/ui/StatusBadge'
import { entitySingular } from '../../utils/entityLabels'
import { formatDate, formatMoney, formatPeriod } from '../../utils/format'
import { useActionToast } from '../../hooks/useActionToast'
import { useAskDialog } from '../../hooks/useAskDialog'

function buildDefaultDescription(startDate: string, endDate: string, rate: number): string {
  return `${formatDate(startDate)} - ${formatDate(endDate)} arası aylık %${rate} gecikme faizi`
}

function buildPayload(
  startDate: string,
  endDate: string,
  monthlyRate: number,
  description: string,
  defaultDescription: string,
  scopeType: InterestPolicyScopeType,
  memberIds: number[]
) {
  return {
    start_date: startDate,
    end_date: endDate,
    monthly_rate: monthlyRate,
    description: description.trim() || defaultDescription,
    scope_type: scopeType,
    member_ids: scopeType === 'SELECTED_MEMBERS' ? memberIds : []
  }
}

function formatRunRange(run: InterestRun): string {
  if (run.range_start_date && run.range_end_date) {
    return `${formatDate(run.range_start_date)} - ${formatDate(run.range_end_date)}`
  }
  return formatPeriod(run.period_year, run.period_month)
}

function validateForm(
  startDate: string,
  endDate: string,
  monthlyRate: number,
  scopeType: InterestPolicyScopeType,
  memberIds: number[]
): string | null {
  if (!startDate || !endDate) return 'Başlangıç ve bitiş tarihi zorunludur.'
  if (startDate > endDate) return 'Bitiş tarihi başlangıç tarihinden küçük olamaz.'
  if (!monthlyRate || monthlyRate <= 0) return 'Faiz oranı 0\'dan büyük olmalıdır.'
  if (scopeType === 'SELECTED_MEMBERS' && memberIds.length === 0) {
    return 'Seçili üyeler kapsamı için en az bir üye seçmelisiniz.'
  }
  return null
}

export default function InterestPage(): JSX.Element {
  const toast = useActionToast()
  const ask = useAskDialog()
  const currentYear = new Date().getFullYear()
  const [startDate, setStartDate] = useState(`${currentYear}-01-01`)
  const [endDate, setEndDate] = useState(`${currentYear}-12-31`)
  const [monthlyRate, setMonthlyRate] = useState(5)
  const [description, setDescription] = useState('')
  const [scopeType, setScopeType] = useState<InterestPolicyScopeType>('SELECTED_MEMBERS')
  const [memberIds, setMemberIds] = useState<number[]>([])
  const [policies, setPolicies] = useState<InterestPolicy[]>([])
  const [applications, setApplications] = useState<InterestRun[]>([])
  const [preview, setPreview] = useState<RangeInterestPreviewResult | null>(null)
  const [hasPreviewed, setHasPreviewed] = useState(false)
  const [loadingPolicies, setLoadingPolicies] = useState(true)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [savingPolicy, setSavingPolicy] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [applyResult, setApplyResult] = useState<RangeInterestApplyResult | null>(null)
  const [detail, setDetail] = useState<InterestRunDetail | null>(null)
  const [editingPolicy, setEditingPolicy] = useState<InterestPolicy | null>(null)
  const [viewingPolicy, setViewingPolicy] = useState<InterestPolicy | null>(null)

  const defaultDescription = useMemo(
    () => buildDefaultDescription(startDate, endDate, monthlyRate),
    [startDate, endDate, monthlyRate]
  )

  const sortedPolicies = useMemo(
    () => [...policies].sort((a, b) => b.start_date.localeCompare(a.start_date)),
    [policies]
  )

  const loadPolicies = useCallback(async () => {
    setLoadingPolicies(true)
    const res = await window.api.interestPolicies.list()
    setLoadingPolicies(false)
    if (res.success && res.data) setPolicies(res.data)
  }, [])

  const loadApplications = useCallback(async () => {
    const res = await window.api.interest.listRuns()
    if (res.success && res.data) setApplications(res.data)
  }, [])

  useEffect(() => {
    loadPolicies()
    loadApplications()
  }, [loadPolicies, loadApplications])

  const resetMessages = (): void => {
    setError('')
    setSuccess('')
    setApplyResult(null)
  }

  const handleSavePolicy = async (): Promise<void> => {
    const validationError = validateForm(startDate, endDate, monthlyRate, scopeType, memberIds)
    if (validationError) {
      setError(validationError)
      return
    }

    resetMessages()
    setSavingPolicy(true)
    const res = await window.api.interest.saveRangePolicy(
      buildPayload(
        startDate,
        endDate,
        monthlyRate,
        description,
        defaultDescription,
        scopeType,
        memberIds
      )
    )
    setSavingPolicy(false)

    if (res.success && res.data) {
      setSuccess(res.data.message)
      toast.success('Faiz kararı kaydedildi', res.data.message)
      await loadPolicies()
    } else {
      setError(res.error ?? 'Faiz kararı kaydedilemedi')
      toast.fail('Faiz kararı kaydedilemedi', res.error)
    }
  }

  const loadPreview = useCallback(async () => {
    const validationError = validateForm(startDate, endDate, monthlyRate, scopeType, memberIds)
    if (validationError) {
      setError(validationError)
      setPreview(null)
      setHasPreviewed(false)
      return
    }

    resetMessages()
    setLoadingPreview(true)
    const res = await window.api.interest.previewRange(
      buildPayload(
        startDate,
        endDate,
        monthlyRate,
        description,
        defaultDescription,
        scopeType,
        memberIds
      )
    )
    setLoadingPreview(false)
    setHasPreviewed(true)

    if (res.success && res.data) {
      setPreview(res.data)
    } else {
      setPreview(null)
      setError(res.error ?? 'Faiz ön izlemesi yüklenemedi')
    }
  }, [startDate, endDate, monthlyRate, description, defaultDescription, scopeType, memberIds])

  const handleApply = async (): Promise<void> => {
    const validationError = validateForm(startDate, endDate, monthlyRate, scopeType, memberIds)
    if (validationError) {
      setError(validationError)
      return
    }

    const previewSummary = preview?.summary
    const confirmMsg = [
      `${formatDate(startDate)} - ${formatDate(endDate)} aralığında aylık %${monthlyRate} faiz uygulanacak.`,
      previewSummary
        ? `${entitySingular}: ${previewSummary.partner_count} | Borç: ${previewSummary.debt_count} | Faiz: ${formatMoney(previewSummary.total_interest)}`
        : 'Önizleme yapılmadı; sistem kayıtları hesaplayarak uygulayacak.',
      '',
      'Devam edilsin mi?'
    ].join('\n')

    if (!(await ask.confirm(confirmMsg))) return

    resetMessages()
    setSubmitting(true)
    const res = await window.api.interest.applyRange(
      buildPayload(
        startDate,
        endDate,
        monthlyRate,
        description,
        defaultDescription,
        scopeType,
        memberIds
      )
    )
    setSubmitting(false)

    if (res.success && res.data) {
      setApplyResult(res.data)
      setSuccess(res.data.message)
      toast.success('Faiz işlemi tamamlandı', res.data.message)
      await Promise.all([loadPolicies(), loadApplications()])
      await loadPreview()
    } else {
      setError(res.error ?? 'Faiz uygulama başarısız')
      toast.fail('Faiz işlemi tamamlanamadı', res.error)
    }
  }

  const handleTogglePolicy = async (policy: InterestPolicy): Promise<void> => {
    resetMessages()
    const next = policy.is_active ? 0 : 1
    const res = await window.api.interestPolicies.setActive(policy.id, next)
    if (res.success) {
      const message = next ? 'Faiz kararı aktif yapıldı.' : 'Faiz kararı pasif yapıldı.'
      setSuccess(message)
      toast.success('Faiz kararı güncellendi', message)
      await loadPolicies()
    } else {
      setError(res.error ?? 'Durum güncellenemedi')
      toast.fail('Faiz kararı güncellenemedi', res.error)
    }
  }

  const handleDeletePolicy = async (policy: InterestPolicy): Promise<void> => {
    const confirmed = await ask.confirm(
      `"${policy.decision_description ?? 'Faiz kararı'}" silinsin mi?\n\n` +
        'Bu kararla yapılmış faiz uygulamaları varsa, o uygulamalar ve oluşturdukları faiz kayıtları da birlikte silinir. ' +
        'Faize ödeme dağıtılmışsa silme işlemi güvenlik nedeniyle engellenir.'
    )
    if (!confirmed) return
    resetMessages()
    const res = await window.api.interestPolicies.delete(policy.id)
    if (res.success) {
      setSuccess(res.data?.message ?? 'Faiz kararı silindi.')
      toast.success('Faiz kararı silindi', res.data?.message ?? 'Faiz kararı başarıyla silindi.')
      await loadPolicies()
      await loadApplications()
    } else {
      setError(res.error ?? 'Silme işlemi başarısız. Kullanılmış kararlar pasif yapılabilir.')
      toast.fail('Faiz kararı silinemedi', res.error)
    }
  }

  const openDetail = async (runId: number): Promise<void> => {
    const res = await window.api.interest.getRunDetail(runId)
    if (res.success && res.data) setDetail(res.data)
    else await ask.alert(res.error ?? 'Detay yüklenemedi')
  }

  const summary = preview?.summary

  return (
    <div className="interest-page">
      {error && <div className="alert alert-error">{error}</div>}
      {(success || applyResult?.message) && (
        <div className="alert alert-success">{success || applyResult?.message}</div>
      )}

      <DataPanel title="Faiz Kararı ve Uygulama" subtitle="Tarih, oran ve üye kapsamı ile faiz kararı tanımlayın">
        <p className="settings-hint">
          Tarih aralığı, aylık faiz oranı ve kapsamı kaydedin. Faiz yalnızca kapsama giren
          üyelere uygulanır. Üye özel faiz dönemleri genel karardan bağımsız çalışır.
        </p>

        <div className="form-grid">
          <div className="form-group">
            <label>Başlangıç Tarihi</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value)
                setHasPreviewed(false)
                resetMessages()
              }}
            />
          </div>
          <div className="form-group">
            <label>Bitiş Tarihi</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value)
                setHasPreviewed(false)
                resetMessages()
              }}
            />
          </div>
          <div className="form-group">
            <label>Aylık Faiz Oranı (%)</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={monthlyRate}
              onChange={(e) => {
                setMonthlyRate(Number(e.target.value))
                setHasPreviewed(false)
                resetMessages()
              }}
            />
          </div>
          <div className="form-group form-group--wide">
            <label>Açıklama</label>
            <input
              value={description}
              placeholder={defaultDescription}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="form-group form-group--wide">
            <label>Kapsam</label>
            <div className="interest-policy-scope">
              <label>
                <input
                  type="radio"
                  name="interest-scope"
                  checked={scopeType === 'ALL_ACTIVE'}
                  onChange={() => {
                    setScopeType('ALL_ACTIVE')
                    setHasPreviewed(false)
                    resetMessages()
                  }}
                />
                Tüm aktif üyeler
              </label>
              <label>
                <input
                  type="radio"
                  name="interest-scope"
                  checked={scopeType === 'SELECTED_MEMBERS'}
                  onChange={() => {
                    setScopeType('SELECTED_MEMBERS')
                    setHasPreviewed(false)
                    resetMessages()
                  }}
                />
                Seçili üyeler
              </label>
            </div>
            {scopeType === 'SELECTED_MEMBERS' && (
              <InterestPolicyMemberPicker
                selectedIds={memberIds}
                onChange={(ids) => {
                  setMemberIds(ids)
                  setHasPreviewed(false)
                  resetMessages()
                }}
              />
            )}
          </div>
        </div>

        <p className="settings-hint" role="note">
          Faiz yalnızca yazılma günü gelmiş aylar için uygulanır. Kalan aylar, zamanı gelince yeniden
          uygulandığında eklenir.
        </p>

        <div className="accruals-form__actions">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleSavePolicy}
            disabled={savingPolicy}
          >
            {savingPolicy ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={loadPreview}
            disabled={loadingPreview}
          >
            {loadingPreview ? 'Hesaplanıyor...' : 'Önizle'}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={handleApply}
            disabled={submitting || loadingPreview}
          >
            {submitting ? 'Uygulanıyor...' : 'Faizi Uygula'}
          </button>
        </div>
      </DataPanel>

      <DataPanel title="Faiz Kararları" noPadding>
        {loadingPolicies ? (
          <div className="page-loading">Faiz kararları yükleniyor...</div>
        ) : sortedPolicies.length === 0 ? (
          <EmptyState message="Henüz faiz kararı kaydı yok. Kaydet ile ilk kararı oluşturun." compact />
        ) : (
          <div className="table-wrap table-wrap--compact">
            <table className="data-table interest-policies-table">
              <thead>
                <tr>
                  <th>Başlangıç Tarihi</th>
                  <th>Bitiş Tarihi</th>
                  <th className="text-right">Aylık Faiz Oranı</th>
                  <th>Kapsam</th>
                  <th>Durum</th>
                  <th>Açıklama</th>
                  <th className="text-right interest-policies-table__actions-col">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {sortedPolicies.map((policy) => (
                  <tr
                    key={policy.id}
                    className="interest-policies-table__row"
                    title="Bu kararla faiz tahakkuk eden üyeleri göster"
                    onClick={() => setViewingPolicy(policy)}
                  >
                    <td>{formatDate(policy.start_date)}</td>
                    <td>{formatDate(policy.end_date)}</td>
                    <td className="text-right">%{policy.monthly_rate}</td>
                    <td>{formatInterestPolicyScopeLabel(policy)}</td>
                    <td>
                      <StatusBadge active={policy.is_active === 1} />
                    </td>
                    <td className="cell-ellipsis">{policy.decision_description || '—'}</td>
                    <td
                      className="interest-policies-table__actions-cell"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <div className="interest-policy-row-actions">
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => setEditingPolicy(policy)}
                        >
                          Düzenle
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => handleTogglePolicy(policy)}
                        >
                          {policy.is_active ? 'Pasif Yap' : 'Aktif Yap'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDeletePolicy(policy)}
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

      {loadingPreview && hasPreviewed && !summary ? (
        <div className="page-loading">Faiz ön izlemesi hesaplanıyor...</div>
      ) : !hasPreviewed ? (
        <EmptyState message="Önizleme için tarih aralığını seçip Önizle butonuna basın." compact />
      ) : summary ? (
        <>
          <div className="interest-summary-grid interest-summary-grid--compact">
            <StatPanel label={`Faiz uygulanacak ${entitySingular.toLowerCase()}`} value={summary.partner_count} />
            <StatPanel label="Faiz uygulanacak borç" value={summary.debt_count} variant="accent" />
            <StatPanel
              label="Toplam ana borç"
              value={formatMoney(summary.total_principal)}
              variant="debit"
            />
            <StatPanel label="Toplam faiz" value={formatMoney(summary.total_interest)} variant="debit" />
            <StatPanel label="Atlanan kayıt" value={summary.skipped_count} />
          </div>

          <DataPanel title="Faiz Ön İzleme" noPadding>
            {preview.rows.length === 0 ? (
              <EmptyState message="Değerlendirilecek borç bulunamadı." compact />
            ) : (
              <InterestRangePreviewTable rows={preview.rows} />
            )}
          </DataPanel>
        </>
      ) : null}

      <DataPanel title="Geçmiş Faiz Uygulamaları" noPadding>
        {applications.length === 0 ? (
          <EmptyState message="Henüz faiz uygulama kaydı bulunmuyor." compact />
        ) : (
          <div className="table-wrap table-wrap--compact">
            <table className="data-table data-table--selectable">
              <thead>
                <tr>
                  <th>Uygulama Tarihi</th>
                  <th>Tarih Aralığı</th>
                  <th className="text-right">Aylık Oran</th>
                  <th className="text-right">{entitySingular}</th>
                  <th className="text-right">Borç</th>
                  <th className="text-right">Toplam Ana Borç</th>
                  <th className="text-right">Toplam Faiz</th>
                  <th>Açıklama</th>
                  <th>Detay</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((run) => (
                  <tr key={run.id}>
                    <td>{formatDate(run.calculation_date)}</td>
                    <td>{formatRunRange(run)}</td>
                    <td className="text-right">%{run.interest_rate}</td>
                    <td className="text-right">{run.affected_partner_count}</td>
                    <td className="text-right">{run.affected_debt_count}</td>
                    <td className="money debit">{formatMoney(run.total_principal)}</td>
                    <td className="money debit">{formatMoney(run.total_interest)}</td>
                    <td className="cell-ellipsis">{run.description || '—'}</td>
                    <td>
                      {run.id > 0 ? (
                        <button type="button" className="btn btn-sm" onClick={() => openDetail(run.id)}>
                          Detay
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DataPanel>

      {viewingPolicy && (
        <PolicyAppliedMembersModal policy={viewingPolicy} onClose={() => setViewingPolicy(null)} />
      )}

      {editingPolicy && (
        <PolicyEditModal
          policy={editingPolicy}
          onClose={() => setEditingPolicy(null)}
          onSaved={async () => {
            setEditingPolicy(null)
            setSuccess('Faiz kararı güncellendi.')
            toast.success('Faiz kararı güncellendi', 'Faiz kararı başarıyla kaydedildi.')
            await loadPolicies()
          }}
        />
      )}

      {detail && <InterestRunDetailModal detail={detail} onClose={() => setDetail(null)} />}
    </div>
  )
}

function PolicyAppliedMembersModal({
  policy,
  onClose
}: {
  policy: InterestPolicy
  onClose: () => void
}): JSX.Element {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [result, setResult] = useState<InterestPolicyAppliedMembersResult | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    setResult(null)
    void window.api.interestPolicies.listAppliedMembers(policy.id).then((res) => {
      if (cancelled) return
      setLoading(false)
      if (res.success && res.data) setResult(res.data)
      else setError(res.error ?? 'Üye listesi alınamadı')
    })
    return () => {
      cancelled = true
    }
  }, [policy.id])

  return (
    <div className="modal-overlay">
      <div className="modal modal--wide modal--applied-members">
        <div className="modal-header">
          <h3>Faiz Uygulanan Üyeler</h3>
          <button type="button" className="btn btn-sm" onClick={onClose}>
            Kapat
          </button>
        </div>
        <div className="modal-body">
          <div className="detail-grid">
            <div>
              <span className="detail-field__label">Başlangıç</span>
              <span className="detail-field__value">{formatDate(policy.start_date)}</span>
            </div>
            <div>
              <span className="detail-field__label">Bitiş</span>
              <span className="detail-field__value">{formatDate(policy.end_date)}</span>
            </div>
            <div>
              <span className="detail-field__label">Aylık faiz oranı</span>
              <span className="detail-field__value">%{policy.monthly_rate}</span>
            </div>
          </div>

          {loading && <div className="page-loading">Üyeler yükleniyor...</div>}
          {error && <div className="alert alert-error">{error}</div>}

          {result && !result.reliable && (
            <div className="alert alert-warning">
              Bu karara bağlı faiz kayıtlarında güvenilir dönem bilgisi yok. Tahmini üye listesi
              gösterilmiyor.
            </div>
          )}

          {result?.reliable && result.inactive && (
            <div className="alert alert-info">
              Bu karar pasif. Bugünkü borç motoru hesabında bu karara bağlı faiz görünmeyebilir.
            </div>
          )}

          {result?.reliable && result.members.length === 0 && (
            <EmptyState
              message="Bugün itibarıyla bu karar tarihleri içinde borç motoruna göre faiz yazılacak üye yok."
              compact
            />
          )}

          {result?.reliable && result.members.length > 0 && (
            <div className="table-wrap table-wrap--compact">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Üye No</th>
                    <th>Ad Soyad / Ünvan</th>
                    <th className="text-right">Bugüne kadar yazılan faiz</th>
                  </tr>
                </thead>
                <tbody>
                  {result.members.map((member) => (
                    <tr key={member.partner_id}>
                      <td>{member.partner_no}</td>
                      <td>{member.full_name}</td>
                      <td className="text-right">{formatMoney(member.accrued_interest)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function PolicyEditModal({
  policy,
  onClose,
  onSaved
}: {
  policy: InterestPolicy
  onClose: () => void
  onSaved: () => void
}): JSX.Element {
  const toast = useActionToast()
  const [form, setForm] = useState<InterestPolicyInput>({
    start_date: policy.start_date,
    end_date: policy.end_date,
    is_active: policy.is_active,
    monthly_rate: policy.monthly_rate,
    decision_date: policy.decision_date,
    decision_description: policy.decision_description ?? '',
    scope_type: policy.scope_type ?? 'ALL_ACTIVE',
    member_ids: policy.member_ids ?? []
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async (): Promise<void> => {
    if (!form.start_date || !form.end_date || !form.decision_date) {
      setError('Tarih alanları zorunludur.')
      return
    }
    if (form.start_date > form.end_date) {
      setError('Bitiş tarihi başlangıç tarihinden küçük olamaz.')
      return
    }
    if (form.monthly_rate <= 0) {
      setError('Faiz oranı 0\'dan büyük olmalıdır.')
      return
    }
    if (
      (form.scope_type ?? 'SELECTED_MEMBERS') === 'SELECTED_MEMBERS' &&
      (form.member_ids?.length ?? 0) === 0
    ) {
      setError('Seçili üyeler kapsamı için en az bir üye seçmelisiniz.')
      return
    }

    setSaving(true)
    setError('')
    const res = await window.api.interestPolicies.update(policy.id, {
      ...form,
      member_ids: form.scope_type === 'SELECTED_MEMBERS' ? form.member_ids ?? [] : []
    })
    setSaving(false)
    if (res.success) onSaved()
    else {
      setError(res.error ?? 'Güncelleme başarısız')
      toast.fail('Faiz kararı güncellenemedi', res.error)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal modal--wide">
        <div className="modal-header">
          <h3>Faiz Kararı Düzenle</h3>
          <button type="button" className="btn btn-sm" onClick={onClose}>
            Kapat
          </button>
        </div>
        <div className="modal-body">
          {error && <div className="alert alert-error">{error}</div>}
          <div className="form-grid">
            <div className="form-group">
              <label>Başlangıç Tarihi</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Bitiş Tarihi</label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Aylık Faiz Oranı (%)</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.monthly_rate}
                onChange={(e) => setForm({ ...form, monthly_rate: Number(e.target.value) })}
              />
            </div>
            <div className="form-group">
              <label>Karar Tarihi</label>
              <input
                type="date"
                value={form.decision_date}
                onChange={(e) => setForm({ ...form, decision_date: e.target.value })}
              />
            </div>
            <div className="form-group form-group--wide">
              <label>Açıklama</label>
              <input
                value={form.decision_description ?? ''}
                onChange={(e) => setForm({ ...form, decision_description: e.target.value })}
              />
            </div>
            <div className="form-group form-group--wide">
              <label>Kapsam</label>
              <div className="interest-policy-scope">
                <label>
                  <input
                    type="radio"
                    name="edit-interest-scope"
                    checked={(form.scope_type ?? 'ALL_ACTIVE') === 'ALL_ACTIVE'}
                    onChange={() => setForm({ ...form, scope_type: 'ALL_ACTIVE', member_ids: [] })}
                  />
                  Tüm aktif üyeler
                </label>
                <label>
                  <input
                    type="radio"
                    name="edit-interest-scope"
                    checked={form.scope_type === 'SELECTED_MEMBERS'}
                    onChange={() =>
                      setForm({
                        ...form,
                        scope_type: 'SELECTED_MEMBERS',
                        member_ids: form.member_ids ?? []
                      })
                    }
                  />
                  Seçili üyeler
                </label>
              </div>
              {form.scope_type === 'SELECTED_MEMBERS' && (
                <InterestPolicyMemberPicker
                  selectedIds={form.member_ids ?? []}
                  onChange={(ids) => setForm({ ...form, member_ids: ids })}
                />
              )}
            </div>
          </div>
          <div className="settings-actions">
            <button type="button" className="btn btn-sm" onClick={onClose}>
              İptal
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
