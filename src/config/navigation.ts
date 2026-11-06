import { APP_SHORT_NAME } from '@shared/branding'
import { SIMPLIFIED_UI } from '@shared/appMode'
import type { UserRole } from '@shared/types'

export { SIMPLIFIED_UI }

export type NavIconName =
  | 'home'
  | 'table'
  | 'users'
  | 'percent'
  | 'cash'
  | 'bank'
  | 'distribution'
  | 'chart'
  | 'settings'
  | 'save'
  | 'file-text'
  | 'calendar'
  | 'wallet'
  | 'building'
  | 'folder'

export interface NavItem {
  path: string
  label: string
  description: string
  end?: boolean
  adminOnly?: boolean
  icon?: NavIconName
}

export interface NavGroup {
  title: string
  items: NavItem[]
}

const simplifiedNavGroups: NavGroup[] = [
  {
    title: 'Yönetim',
    items: [
      {
        path: '/',
        label: 'Yönetim Paneli',
        description: 'Kooperatif genel durumu',
        end: true,
        icon: 'home'
      },
      {
        path: '/uye-borc-tablosu',
        label: 'Üye Borç Tablosu',
        description: 'Aidat, ödeme ve faiz tablosu',
        icon: 'table'
      },
      {
        path: '/uyeler',
        label: 'Üyeler',
        description: 'Üye kayıtları',
        icon: 'users'
      },
      {
        path: '/faiz-isletme',
        label: 'Faiz Kararı',
        description: 'Gecikme faizi oranları',
        adminOnly: true,
        icon: 'percent'
      },
      {
        path: '/kooperatif-kasasi',
        label: 'Kooperatif Kasası',
        description: 'Gelir, gider ve kasa takibi',
        icon: 'cash'
      },
      {
        path: '/banka-hareketleri',
        label: 'Banka Hareketleri',
        description: 'Excel içe aktar ve ödeme eşleştir',
        icon: 'bank'
      },
      {
        path: '/aidat-dagitim',
        label: 'Aidat Dağıtımı',
        description: 'Yıllık tahmini bütçe otomatik dağıtımı',
        icon: 'distribution'
      },
      {
        path: '/dokumanlar',
        label: 'Dokümanlar',
        description: 'Kooperatif evrak ve klasörleri',
        icon: 'folder'
      }
    ]
  },
  {
    title: 'Raporlar',
    items: [
      {
        path: '/raporlar',
        label: 'Raporlar',
        description: 'Borç, tahsilat ve ekstre raporları',
        icon: 'chart'
      }
    ]
  },
  {
    title: 'Sistem',
    items: [
      {
        path: '/kooperatifler',
        label: 'Kooperatifler',
        description: 'Kooperatif dosyaları ve geçiş',
        icon: 'building'
      },
      {
        path: '/ayarlar',
        label: 'Ayarlar',
        description: 'Kooperatif, kullanıcı ve yedekleme ayarları',
        icon: 'settings'
      },
      {
        path: '/yedekleme',
        label: 'Yedekleme',
        description: 'Veritabanı yedekle / geri yükle',
        icon: 'save'
      }
    ]
  }
]

const fullNavGroups: NavGroup[] = [
  {
    title: 'Genel',
    items: [
      {
        path: '/',
        label: 'Yönetim Paneli',
        description: 'Dönem özeti ve hızlı işlemler',
        end: true,
        icon: 'home'
      }
    ]
  },
  {
    title: 'Cari & Ortak',
    items: [
      {
        path: '/ortaklar',
        label: 'Ortak Yönetimi',
        description: 'Ortak kartları ve bakiyeler',
        icon: 'users'
      },
      {
        path: '/cari-hareketler',
        label: 'Cari Defter',
        description: 'Tüm cari hareket kayıtları',
        icon: 'file-text'
      }
    ]
  },
  {
    title: 'Tahakkuk & Tahsilat',
    items: [
      {
        path: '/tahakkuklar',
        label: 'Aidat / Tahakkuk',
        description: 'Aylık aidat tahakkuku',
        icon: 'calendar'
      },
      {
        path: '/odemeler',
        label: 'Tahsilatlar',
        description: 'Ödeme giriş ve takibi',
        icon: 'wallet'
      },
      {
        path: '/faiz-isletme',
        label: 'Faiz Kararı ve Uygulama',
        description: 'Faiz kararı tanımı ve gecikme faizi uygulama',
        icon: 'percent'
      }
    ]
  },
  {
    title: 'Yönetim',
    items: [
      {
        path: '/raporlar',
        label: 'Rapor Merkezi',
        description: 'Borç, tahsilat ve ekstre raporları',
        icon: 'chart'
      },
      {
        path: '/dokumanlar',
        label: 'Dokümanlar',
        description: 'Kooperatif evrak ve klasörleri',
        icon: 'folder'
      },
      {
        path: '/kooperatifler',
        label: 'Kooperatifler',
        description: 'Kooperatif dosyaları ve geçiş',
        icon: 'building'
      },
      {
        path: '/ayarlar',
        label: 'Sistem Ayarları',
        description: 'Kooperatif ve faiz ayarları',
        icon: 'settings'
      },
      {
        path: '/yedekleme',
        label: 'Yedekleme',
        description: 'Veritabanı yedekle / geri yükle',
        icon: 'save'
      }
    ]
  }
]

export const navGroups: NavGroup[] = SIMPLIFIED_UI ? simplifiedNavGroups : fullNavGroups

export function getNavGroupsForRole(role: UserRole | undefined): NavGroup[] {
  const isAdmin = role === 'ADMIN'
  return navGroups.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.adminOnly || isAdmin)
  }))
}

export interface RibbonAction {
  label: string
  path: string
  icon: string
}

export const ribbonActions: RibbonAction[] = SIMPLIFIED_UI
  ? [
      { label: 'Yeni Üye', path: '/uyeler?action=new', icon: 'user-plus' },
      { label: 'Aidat Gir', path: '/?action=due', icon: 'calendar' },
      { label: 'Tahsilat', path: '/?action=payment', icon: 'wallet' },
      { label: 'Faiz Ekle', path: '/faiz-isletme', icon: 'percent' },
      { label: 'Ayarlar', path: '/ayarlar', icon: 'settings' },
      { label: 'Yedekle', path: '/yedekleme', icon: 'save' }
    ]
  : [
      { label: 'Yeni Ortak', path: '/ortaklar?action=new', icon: 'user-plus' },
      { label: 'Toplu Tahakkuk', path: '/tahakkuklar', icon: 'calendar' },
      { label: 'Ödeme Al', path: '/odemeler', icon: 'wallet' },
      { label: 'Faiz İşlet', path: '/faiz-isletme', icon: 'percent' },
      { label: 'Cari Ekstre', path: '/raporlar?report=partner-ledger', icon: 'file-text' },
      { label: 'Rapor Al', path: '/raporlar', icon: 'chart' },
      { label: 'Yedekle', path: '/yedekleme', icon: 'save' }
    ]

/** Dashboard hızlı işlemleri — mevcut sayfa/aksiyon yollarına bağlanır */
export const dashboardQuickActions: RibbonAction[] = SIMPLIFIED_UI
  ? [
      { label: 'Yeni Üye', path: '/uyeler?action=new', icon: 'user-plus' },
      { label: 'Aidat Gir', path: '/?action=due', icon: 'calendar' },
      { label: 'Tahsilat', path: '/?action=payment', icon: 'wallet' },
      { label: 'Faiz Ekle', path: '/faiz-isletme', icon: 'percent' },
      { label: 'Excel İçe Aktar', path: '/banka-hareketleri', icon: 'file-excel' },
      { label: 'Yedekle', path: '/yedekleme', icon: 'save' }
    ]
  : ribbonActions

export const pageTitles: Record<string, string> = SIMPLIFIED_UI
  ? {
      '/': 'Yönetim Paneli',
      '/uye-borc-tablosu': 'Üye Borç Tablosu',
      '/uyeler': 'Üyeler',
      '/faiz-isletme': 'Faiz Kararı',
      '/kooperatif-kasasi': 'Kooperatif Kasası',
      '/banka-hareketleri': 'Banka Hareketleri',
      '/aidat-dagitim': 'Aidat Dağıtımı',
      '/dokumanlar': 'Dokümanlar',
      '/raporlar': 'Raporlar',
      '/kooperatifler': 'Kooperatifler',
      '/ayarlar': 'Ayarlar',
      '/yedekleme': 'Yedekleme'
    }
  : {
      '/': 'Yönetim Paneli — Dönem Özeti',
      '/ortaklar': 'Ortak Yönetimi',
      '/tahakkuklar': 'Aidat / Tahakkuk',
      '/odemeler': 'Tahsilatlar',
      '/faiz-isletme': 'Faiz Kararı ve Uygulama',
      '/cari-hareketler': 'Cari Defter',
      '/dokumanlar': 'Dokümanlar',
      '/raporlar': 'Rapor Merkezi',
      '/kooperatifler': 'Kooperatifler',
      '/ayarlar': 'Sistem Ayarları',
      '/yedekleme': 'Yedekleme / Geri Yükleme'
    }

export function getPageTitle(pathname: string): string {
  if (pathname.startsWith('/ortaklar/')) return 'Ortak Kartı — Detay'
  if (pathname.startsWith('/uyeler/')) return 'Üye Detayı'
  if (pathname.startsWith('/aidat-dagitim')) return 'Aidat Dağıtımı'
  if (pathname.startsWith('/uye-borc-tablosu')) return 'Üye Borç Tablosu'
  if (pathname.startsWith('/uyeler')) return 'Üyeler'
  if (pathname.startsWith('/kooperatifler')) return 'Kooperatifler'
  if (pathname.startsWith('/dokumanlar')) return 'Dokümanlar'
  return pageTitles[pathname] ?? APP_SHORT_NAME
}
