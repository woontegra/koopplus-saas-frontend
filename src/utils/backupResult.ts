import type { BackupCreateResult } from '@shared/types'

export function describeBackupCreateResult(data: BackupCreateResult): {
  kind: 'ok' | 'partial'
  title: string
  message: string
} {
  if (data.documents_archive_status === 'failed') {
    return {
      kind: 'partial',
      title: 'Yedek kısmen oluşturuldu',
      message:
        data.documents_archive_error ??
        'Veritabanı yedeği oluşturuldu ancak doküman arşivi oluşturulamadı.'
    }
  }
  if (data.documents_archive_status === 'empty') {
    return {
      kind: 'ok',
      title: 'Yedekleme tamamlandı',
      message: 'Kooperatif veritabanı ve boş doküman arşivi oluşturuldu.'
    }
  }
  if (data.documents_archive_status === 'created') {
    const count = data.documents_file_count ?? 0
    return {
      kind: 'ok',
      title: 'Yedekleme tamamlandı',
      message: `Kooperatif veritabanı ve ${count} doküman arşivlendi.`
    }
  }
  return {
    kind: 'ok',
    title: 'Yedekleme tamamlandı',
    message: 'Kooperatif yedeği başarıyla oluşturuldu.'
  }
}
