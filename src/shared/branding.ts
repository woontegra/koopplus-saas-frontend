export const APP_FULL_NAME = 'KoopPlus — Kooperatif Yönetim Sistemi'

export const APP_SHORT_NAME = 'KoopPlus'

export const APP_SUBTITLE = 'Kooperatif Yönetim Sistemi'

/** Yeni kurulumda boş bırakılır; kooperatif adı kullanıcı verisidir, ürün markası değildir. */
export const DEFAULT_COOPERATIVE_NAME = ''

export const DEVELOPER_CREDIT = 'Woontegra tarafından geliştirilmiştir.'

/** Windows AppUserModelId (taskbar). electron-builder appId / updater kimliği değildir. */
export const APP_ID = 'com.woontegra.koopplus'

export const USER_DATA_DIR = 'KoopPlus'

/** Eski ürün klasörü — yeni kurulum bunu oluşturmaz ve buradan veri kopyalamaz. */
export const LEGACY_PRODUCT_USER_DATA_DIR = 'ss-19-mayis-kent-konut-aidat-takip'

/** Eski geliştirme / önceki ürün userData klasör adları (salt okuma / denetim; kopyalama yok). */
export const LEGACY_USER_DATA_DIRS = [
  LEGACY_PRODUCT_USER_DATA_DIR,
  'kooperatif-aidat-takip',
  'Kooperatif Aidat Takip'
]

export const APP_VERSION = '0.1.0'

export const DB_FILE_NAME = 'kooperatif.db'

export const SYSTEM_DB_FILE_NAME = 'koopplus-system.db'
