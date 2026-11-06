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
      message: 'Veritabanı yedeği alındı. Doküman arşivi boştu.'
    }
  }
  const where =
    data.file_path && data.file_path.includes('/')
      ? `Kayıt: ${data.file_path}`
      : 'Dosya seçili yedek klasörüne (veya İndirilenler’e) kaydedildi.'
  return {
    kind: 'ok',
    title: 'Yedekleme tamamlandı',
    message: `Veritabanı ve dokümanlar yedekte. ${where}`
  }
}
