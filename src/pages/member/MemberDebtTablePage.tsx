import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import type { MemberDebtTableReport, MemberDebtTableRow, MemberExtraDebtRow, MemberPaymentHistoryItem, Partner } from '@shared/types'
import AddDueModal from '../../components/member/AddDueModal'
import AddExtraDebtModal from '../../components/member/AddExtraDebtModal'
import AddPaymentModal from '../../components/member/AddPaymentModal'
import EditDueModal from '../../components/member/EditDueModal'
import EditExtraDebtModal from '../../components/member/EditExtraDebtModal'
import EditPaymentModal from '../../components/member/EditPaymentModal'
import MemberDebtTablePrintPreviewModal from '../../components/member/MemberDebtTablePrintPreviewModal'
import MemberDebtTableView from '../../components/member/MemberDebtTableView'
import AllMembersDebtTablePdfModal from '../../components/member/AllMembersDebtTablePdfModal'
import MemberInfoPanel from '../../components/member/MemberInfoPanel'
import PartnerFormModal from '../partners/PartnerFormModal'
import PartnerSearchSelect from '../../components/partners/PartnerSearchSelect'
import DataPanel from '../../components/ui/DataPanel'
import ErrorBoundary from '../../components/ui/ErrorBoundary'
import { useAuth } from '../../auth/AuthContext'
import { useActionToast } from '../../hooks/useActionToast'
import { useAskDialog } from '../../hooks/useAskDialog'
import { describeBackupCreateResult } from '../../utils/backupResult'

const EXPORT_CANCEL_ERRORS = new Set(['Kayıt iptal edildi', 'Kayıt konumu seçilmedi'])

function isExportCancelled(error?: string): boolean {
  return !!error && EXPORT_CANCEL_ERRORS.has(error)
}

export default function MemberDebtTablePage(): JSX.Element {
  const { canWrite } = useAuth()
  const toast = useActionToast()
  const ask = useAskDialog()
  const [actionBusy, setActionBusy] = useState(false)
  const navigate = useNavigate()
  const { partnerId: routePartnerId } = useParams<{ partnerId?: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const [partners, setPartners] = useState<Partner[]>([])
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null)
  const [partnerId, setPartnerId] = useState<number | ''>('')
  const [report, setReport] = useState<MemberDebtTableReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [showDueModal, setShowDueModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showExtraDebtModal, setShowExtraDebtModal] = useState(false)
  const [showMemberModal, setShowMemberModal] = useState(false)
  const [editRow, setEditRow] = useState<MemberDebtTableRow | null>(null)
  const [editExtraDebt, setEditExtraDebt] = useState<MemberExtraDebtRow | null>(null)
  const [editPayment, setEditPayment] = useState<MemberPaymentHistoryItem | null>(null)
  const [showPrintPreview, setShowPrintPreview] = useState(false)
  const [showAllMembersPdfModal, setShowAllMembersPdfModal] = useState(false)
  const [paymentModalKey, setPaymentModalKey] = useState(0)

  const loadPartners = useCallback(async () => {
    const res = await window.api.partners.list({ is_active: 1 })
    if (res.success && res.data) {
      setPartners(res.data)
      const routeId = routePartnerId ? Number(routePartnerId) : null
      setPartnerId((prev) => {
        if (routeId && res.data!.some((p) => p.id === routeId)) return routeId
        if (prev && res.data!.some((p) => p.id === prev)) return prev
        if (routeId) {
          setError('Seçilen üye bulunamadı veya silinmiş.')
          return ''
        }
        return ''
      })
    }
  }, [routePartnerId])

  const loadSelectedPartner = useCallback(async (id: number): Promise<void> => {
    const res = await window.api.partners.get(id)
    if (res.success && res.data) setSelectedPartner(res.data)
    else setSelectedPartner(null)
  }, [])

  const loadTable = useCallback(async (id: number): Promise<void> => {
    setLoading(true)
    setError('')
    const res = await window.api.memberDebtTable.get(id)
    setLoading(false)
    if (res.success && res.data) setReport(res.data)
    else {
      setReport(null)
      setError(res.error ?? 'Tablo yüklenemedi')
    }
  }, [])

  useEffect(() => {
    loadPartners()
  }, [loadPartners])

  useEffect(() => {
    const action = searchParams.get('action')
    if (action === 'due') setShowDueModal(true)
    if (action === 'payment') {
      setPaymentModalKey((prev) => prev + 1)
      setShowPaymentModal(true)
    }
    if (action) setSearchParams({}, { replace: true })
  }, [searchParams, setSearchParams])

  useEffect(() => {
    if (!routePartnerId) return
    const id = Number(routePartnerId)
    if (id) setPartnerId(id)
  }, [routePartnerId])

  useEffect(() => {
    if (partnerId) {
      loadTable(Number(partnerId))
      loadSelectedPartner(Number(partnerId))
    } else {
      setReport(null)
      setSelectedPartner(null)
    }
  }, [partnerId, loadTable, loadSelectedPartner])

  const refresh = (): void => {
    if (partnerId) {
      loadTable(Number(partnerId))
      loadSelectedPartner(Number(partnerId))
    }
    loadPartners()
  }

  const requirePartner = (): number | null => {
    if (!partnerId) {
      setError('Lütfen önce bir üye seçin.')
      return null
    }
    return Number(partnerId)
  }

  const openPaymentModal = (): void => {
    if (!requirePartner()) return
    const hasDebt = (report?.rows.length ?? 0) > 0 || (report?.extra_debts?.length ?? 0) > 0
    if (!hasDebt) {
      toast.info(
        'Tahsilat yapılamadı',
        'Bu üyeye ödeme girebilmek için önce aidat veya ek borç kaydı ekleyin.'
      )
      return
    }
    ;(document.activeElement as HTMLElement | null)?.blur?.()
    setPaymentModalKey((prev) => prev + 1)
    setShowPaymentModal(true)
  }

  const toolbarLocked =
    showPaymentModal ||
    showDueModal ||
    showExtraDebtModal ||
    showMemberModal ||
    showPrintPreview ||
    showAllMembersPdfModal ||
    !!editRow ||
    !!editExtraDebt ||
    !!editPayment

  const openPrintPreview = (): void => {
    const id = requirePartner()
    if (!id || !report) {
      if (id && !report) setError('Tablo yüklenemedi. Lütfen tekrar deneyin.')
      return
    }
    setShowPrintPreview(true)
  }

  const handlePrint = async (): Promise<void> => {
    const id = requirePartner()
    if (!id) return

    try {
      const res = await window.api.documents.printMemberDebtTable(id)
      if (res.success) {
        setSuccess('Yazdırma önizlemesi tarayıcıda açıldı.')
        toast.success('Yazdırma başlatıldı', 'Yazdırma önizlemesi tarayıcıda açıldı.')
      } else {
        console.error('[memberDebtPrint] Yazdırma hatası:', res.error)
        toast.fail('Yazdırma başlatılamadı', res.error)
      }
    } catch (err) {
      console.error('[memberDebtPrint] Yazdırma hatası:', err)
      toast.fail('Yazdırma başlatılamadı', err instanceof Error ? err.message : 'Bilinmeyen hata')
    }
  }

  const handleEditRow = (row: MemberDebtTableRow): void => {
    if (!row.can_edit) {
      toast.info('Aidat düzenlenemez', 'Bu aidat kaydı düzenlenemez.')
      return
    }
    setEditRow(row)
  }

  const handleDeleteRow = async (row: MemberDebtTableRow): Promise<void> => {
    const partner = requirePartner()
    if (!partner || actionBusy) return

    if (row.is_payment_only) {
      let paymentIds = row.payment_ids ?? []

      // Eski önizleme / eksik id durumunda ödeme geçmişinden ay+tutar ile bul
      if (paymentIds.length === 0 && report) {
        paymentIds = report.payment_history
          .filter((item) => {
            const [y, m] = item.payment_date.split('-').map(Number)
            if (y !== row.period_year || m !== row.period_month) return false
            return Math.abs(item.amount - row.paid_amount) < 0.02 || row.paid_amount <= 0
          })
          .map((item) => item.payment_id)

        // Ay eşleşmesi tutarsa ama tutar tek ödemede dağılıyorsa tüm ay ödemelerini al
        if (paymentIds.length === 0) {
          paymentIds = report.payment_history
            .filter((item) => {
              const [y, m] = item.payment_date.split('-').map(Number)
              return y === row.period_year && m === row.period_month
            })
            .map((item) => item.payment_id)
        }
      }

      if (paymentIds.length === 0) {
        toast.info(
          'Ödeme silinemedi',
          'Bu satıra bağlı silinebilir ödeme bulunamadı. Ödeme Geçmişi sekmesinden silmeyi deneyin.'
        )
        return
      }

      if (
        !(await ask.confirm(
          `${row.period_label} dönemindeki ${paymentIds.length} ödeme kaydı silinecek (toplam ${row.paid_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺). Devam etmek istiyor musunuz?`
        ))
      ) {
        return
      }

      setActionBusy(true)
      for (const paymentId of paymentIds) {
        const res = await window.api.memberDebtTable.deletePayment(paymentId, partner)
        if (!res.success) {
          setActionBusy(false)
          toast.fail('Tahsilat silinemedi', res.error)
          refresh()
          return
        }
      }
      setActionBusy(false)
      setSuccess('Ödeme kaydı silindi.')
      toast.success('Tahsilat silindi', 'Ödeme kaydı başarıyla silindi.')
      refresh()
      return
    }

    if (!row.can_delete) {
      toast.info(
        'Aidat silinemedi',
        'Bu aidata ödeme işlendiği için silinemez. Önce ilgili ödemeyi silmeniz gerekir.'
      )
      return
    }

    if (!(await ask.confirm('Bu aidat kaydı silinecek. Devam etmek istiyor musunuz?'))) {
      return
    }

    setActionBusy(true)
    const res = await window.api.memberDebtTable.deleteDue(row.ledger_entry_id)
    setActionBusy(false)
    if (res.success) {
      setSuccess(res.data?.message ?? 'Kayıt silindi.')
      toast.success('Aidat silindi', 'Aidat kaydı başarıyla silindi.')
      refresh()
    } else {
      toast.fail('Aidat silinemedi', res.error)
    }
  }

  const handleDeleteExtraDebt = async (row: MemberExtraDebtRow): Promise<void> => {
    if (actionBusy) return
    if (!row.can_delete) {
      toast.info('Ek borç silinemedi', 'Ödemesi olan ek borç kaydı silinemez.')
      return
    }
    if (!(await ask.confirm('Bu ek borç kaydı silinecek. Devam etmek istiyor musunuz?'))) return

    setActionBusy(true)
    const res = await window.api.memberExtraDebts.delete(row.id, row.partner_id)
    setActionBusy(false)
    if (res.success) {
      setSuccess(res.data?.message ?? 'Ek borç silindi.')
      toast.success('Ek borç silindi', 'Ek borç kaydı başarıyla silindi.')
      refresh()
    } else {
      toast.fail('Ek borç silinemedi', res.error)
    }
  }

  const handleEditPayment = (item: MemberPaymentHistoryItem): void => {
    setEditPayment(item)
  }

  const handleDeletePayment = async (item: MemberPaymentHistoryItem): Promise<void> => {
    const id = requirePartner()
    if (!id || actionBusy) return

    const baseMessage = item.is_bank_import
      ? 'Bu ödeme banka aktarımıyla oluşmuştur. Silerseniz ödeme üye hesabından kaldırılacak ve ilgili banka hareketi tekrar işlenebilir hale getirilecektir.'
      : 'Bu ödeme kaydı silinecek. Üyenin borç tablosu yeniden hesaplanacak.'

    if (!(await ask.confirm(`${baseMessage} Devam etmek istiyor musunuz?`))) return

    ;(document.activeElement as HTMLElement | null)?.blur?.()

    let forgetMatchRule = false
    if (item.is_bank_import) {
      forgetMatchRule = await ask.confirm(
        'Bu ödemeye ait hatırlanan eşleşmeyi de silmek ister misiniz?\n\nTamam = Ödemeyi sil ve eşleşmeyi unut\nİptal = Sadece ödemeyi sil'
      )
    }

    setActionBusy(true)
    const res = await window.api.memberDebtTable.deletePayment(item.payment_id, id, {
      forget_match_rule: forgetMatchRule
    })
    setActionBusy(false)
    if (res.success) {
      setSuccess(
        forgetMatchRule
          ? 'Ödeme kaydı silindi ve hatırlanan eşleşme kaldırıldı.'
          : 'Ödeme kaydı silindi.'
      )
      toast.success(
        'Tahsilat silindi',
        forgetMatchRule
          ? 'Ödeme kaydı silindi ve hatırlanan eşleşme kaldırıldı.'
          : 'Ödeme kaydı başarıyla silindi.'
      )
      refresh()
    } else {
      toast.fail('Tahsilat silinemedi', res.error)
    }
  }

  const handlePdf = async (): Promise<void> => {
    const id = requirePartner()
    if (!id) return

    try {
      const res = await window.api.documents.saveMemberDebtTablePdf(id)
      if (res.success) {
        setSuccess('PDF dosyası oluşturuldu.')
        toast.success('PDF oluşturuldu', 'Borç tablosu PDF dosyası kaydedildi.')
      } else if (!isExportCancelled(res.error)) {
        console.error('[memberDebtPdf] PDF oluşturma hatası:', res.error)
        toast.fail('PDF oluşturulamadı', res.error)
      }
    } catch (err) {
      console.error('[memberDebtPdf] PDF oluşturma hatası:', err)
      toast.fail('PDF oluşturulamadı', err instanceof Error ? err.message : 'Bilinmeyen hata')
    }
  }

  const handleExcel = async (): Promise<void> => {
    const id = requirePartner()
    if (!id) return

    try {
      const res = await window.api.reports.exportMemberDebtTableExcel(id)
      if (res.success) {
        setSuccess('Excel dosyası oluşturuldu.')
        toast.success('Excel oluşturuldu', 'Borç tablosu Excel dosyası kaydedildi.')
      } else if (!isExportCancelled(res.error)) {
        console.error('[memberDebtExcel] Excel oluşturma hatası:', res.error)
        toast.fail('Excel oluşturulamadı', res.error)
      }
    } catch (err) {
      console.error('[memberDebtExcel] Excel oluşturma hatası:', err)
      toast.fail('Excel oluşturulamadı', err instanceof Error ? err.message : 'Bilinmeyen hata')
    }
  }

  const handleBackup = async (): Promise<void> => {
    setSuccess('')
    setError('')

    try {
      const res = await window.api.backup.createBackup()
      if (res.success && res.data) {
        const described = describeBackupCreateResult(res.data)
        setSuccess(described.message)
        if (described.kind === 'partial') {
          setError(described.message)
          toast.warn(described.title, described.message)
        } else {
          toast.success(described.title, described.message)
        }
      } else if (res.error !== 'Klasör seçilmedi') {
        setError(res.error ?? 'Yedekleme başarısız')
        toast.fail('Yedekleme tamamlanamadı', res.error)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Yedekleme başarısız'
      setError(message)
      toast.fail('Yedekleme tamamlanamadı', message)
    }
  }

  return (
    <div className="member-debt-page">
      {success && (
        <div className="alert alert-success" onAnimationEnd={() => setSuccess('')}>
          {success}
        </div>
      )}
      {error && <div className="alert alert-error">{error}</div>}

      <DataPanel title="Üye Borç Tablosu" subtitle="Aidat, ödeme ve faiz takibi" noPadding>
        <div className="member-debt-toolbar">
          <div className="member-debt-toolbar__select">
            <label>Üye</label>
            <PartnerSearchSelect
              partners={partners}
              value={partnerId}
              disabled={toolbarLocked}
              onChange={(nextId) => {
                setPartnerId(nextId)
                if (nextId) navigate(`/uye-borc-tablosu/${nextId}`)
                else navigate('/uye-borc-tablosu')
              }}
            />
          </div>
          <div className="member-debt-toolbar__actions">
            <button type="button" className="btn btn-sm" onClick={() => setShowMemberModal(true)}>
              Yeni Üye
            </button>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => {
                if (!requirePartner()) return
                setShowDueModal(true)
              }}
            >
              Aidat Gir
            </button>
            <button
              type="button"
              className="btn btn-sm"
              disabled={!canWrite}
              onClick={() => {
                if (!requirePartner()) return
                setShowExtraDebtModal(true)
              }}
            >
              Ek Borç Gir
            </button>
            <button
              type="button"
              className="btn btn-sm btn-accent"
              disabled={!canWrite}
              onClick={openPaymentModal}
            >
              Tahsilat
            </button>
            <button type="button" className="btn btn-sm" onClick={handleBackup}>
              Yedekle
            </button>
          </div>
        </div>

        <ErrorBoundary title="Üye borç tablosu görüntülenemedi">
          {selectedPartner && (
            <div className="member-debt-member-info">
              <MemberInfoPanel partner={selectedPartner} variant="compact" />
            </div>
          )}

          <MemberDebtTableView
            report={report}
            loading={loading}
            canWrite={canWrite}
            onEditRow={canWrite ? handleEditRow : undefined}
            onDeleteRow={canWrite ? handleDeleteRow : undefined}
            onEditExtraDebt={canWrite ? setEditExtraDebt : undefined}
            onDeleteExtraDebt={canWrite ? handleDeleteExtraDebt : undefined}
            onEditPayment={canWrite ? handleEditPayment : undefined}
            onDeletePayment={canWrite ? handleDeletePayment : undefined}
            onPreview={openPrintPreview}
            onPrint={handlePrint}
            onPdf={handlePdf}
            onExcel={handleExcel}
            onAllMembersPdf={() => setShowAllMembersPdfModal(true)}
          />
        </ErrorBoundary>
      </DataPanel>

      {showDueModal && (
        <AddDueModal
          partners={partners}
          initialPartnerId={partnerId ? Number(partnerId) : undefined}
          onClose={() => setShowDueModal(false)}
          onSaved={() => {
            setSuccess('Aidat kaydedildi.')
            toast.success('Aidat kaydedildi', 'Aidat kaydı başarıyla eklendi.')
            refresh()
          }}
        />
      )}

      {showPaymentModal && (
        <AddPaymentModal
          key={paymentModalKey}
          partners={partners}
          initialPartnerId={partnerId ? Number(partnerId) : undefined}
          openPeriods={(report?.rows ?? [])
            .filter(
              (row) =>
                !row.is_payment_only &&
                !row.is_interest_only &&
                (row.remaining_due > 0.009 || (row.delay_interest ?? 0) > 0.009)
            )
            .map((row) => ({
              year: row.period_year,
              month: row.period_month,
              label: row.period_label
            }))}
          onClose={() => setShowPaymentModal(false)}
          onSaved={() => {
            setShowPaymentModal(false)
            setSuccess('Tahsilat kaydedildi.')
            toast.success('Tahsilat kaydedildi', 'Tahsilat başarıyla işlendi.')
            refresh()
          }}
        />
      )}

      {showExtraDebtModal && (
        <AddExtraDebtModal
          partners={partners}
          initialPartnerId={partnerId ? Number(partnerId) : undefined}
          onClose={() => setShowExtraDebtModal(false)}
          onSaved={() => {
            setSuccess('Ek borç kaydedildi.')
            toast.success('Ek borç kaydedildi', 'Ek borç kaydı başarıyla eklendi.')
            refresh()
          }}
        />
      )}

      {editExtraDebt && (
        <EditExtraDebtModal
          debt={editExtraDebt}
          onClose={() => setEditExtraDebt(null)}
          onSaved={() => {
            setSuccess('Ek borç güncellendi.')
            toast.success('Ek borç güncellendi', 'Ek borç kaydı başarıyla güncellendi.')
            refresh()
          }}
        />
      )}

      {showMemberModal && (
        <PartnerFormModal
          partner={null}
          onClose={() => setShowMemberModal(false)}
          onSaved={() => {
            setShowMemberModal(false)
            setSuccess('Yeni üye eklendi.')
            toast.success('Üye kaydedildi', 'Üye bilgileri başarıyla kaydedildi.')
            loadPartners()
          }}
        />
      )}

      {editRow && partnerId && (
        <EditDueModal
          row={editRow}
          partnerId={Number(partnerId)}
          onClose={() => setEditRow(null)}
          onSaved={() => {
            setSuccess('Aidat güncellendi.')
            toast.success('Aidat güncellendi', 'Aidat kaydı başarıyla güncellendi.')
            setEditRow(null)
            refresh()
          }}
        />
      )}

      {editPayment && partnerId && selectedPartner && (
        <EditPaymentModal
          payment={editPayment}
          memberLabel={`${selectedPartner.partner_no} — ${selectedPartner.full_name}`}
          partnerId={Number(partnerId)}
          onClose={() => setEditPayment(null)}
          onSaved={() => {
            setSuccess('Tahsilat güncellendi.')
            toast.success('Tahsilat güncellendi', 'Tahsilat kaydı başarıyla güncellendi.')
            setEditPayment(null)
            refresh()
          }}
        />
      )}

      {showPrintPreview && partnerId && (
        <MemberDebtTablePrintPreviewModal
          partnerId={Number(partnerId)}
          onClose={() => setShowPrintPreview(false)}
          onMessage={setSuccess}
        />
      )}

      {showAllMembersPdfModal && (
        <AllMembersDebtTablePdfModal
          defaultReportDate={report?.as_of_date ?? ''}
          onClose={() => setShowAllMembersPdfModal(false)}
          onSaved={(message) => {
            setShowAllMembersPdfModal(false)
            setSuccess(message)
            toast.success('PDF oluşturuldu', message || 'Toplu PDF dosyası oluşturuldu.')
          }}
        />
      )}
    </div>
  )
}
