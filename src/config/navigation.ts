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
  | 'folder'
  | 'building'

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

/** Masaüstü sade menü iskeleti — işlevler henüz bağlı değil. */
export const navGroups: NavGroup[] = [
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

export const pageTitles: Record<string, string> = {
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
