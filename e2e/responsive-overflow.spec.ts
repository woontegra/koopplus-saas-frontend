import { test, expect, type Page } from '@playwright/test'

const VIEWPORTS = [
  { name: 'phone', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'laptop', width: 1024, height: 768 }
] as const

/** Uygulama rotaları — navigation.ts pageTitles + platform. */
const APP_PATHS = [
  '/login',
  '/',
  '/uye-borc-tablosu',
  '/uyeler',
  '/faiz-isletme',
  '/kooperatif-kasasi',
  '/banka-hareketleri',
  '/aidat-dagitim',
  '/dokumanlar',
  '/raporlar',
  '/kooperatifler',
  '/ayarlar',
  '/yedekleme',
  '/platform',
  '/platform/tenants',
  '/platform/users',
  '/platform/online',
  '/platform/announcements',
  '/platform/settings',
  '/platform/system',
  '/platform/audit'
]

const mePayload = {
  success: true,
  data: {
    user: {
      id: 'u1',
      email: 'e2e@example.com',
      fullName: 'E2E Kullanıcı',
      isActive: true,
      mustChangePassword: false,
      isPlatformAdmin: true,
      has_security_question: true
    },
    memberships: [
      {
        id: 'm1',
        tenantId: 't1',
        role: 'ADMIN',
        tenant: {
          id: 't1',
          name: 'Demo Kooperatif E2E',
          status: 'ACTIVE',
          isDemo: true,
          usageExpiresAt: null,
          demoExpiresAt: new Date(Date.now() + 5 * 86400000).toISOString(),
          licenseActivatedAt: new Date().toISOString(),
          licensePending: false
        }
      }
    ]
  }
}

async function installApiMocks(page: Page): Promise<void> {
  await page.route('**/api/**', async (route) => {
    const url = route.request().url()
    const method = route.request().method()

    if (url.includes('/api/auth/me')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mePayload) })
      return
    }
    if (url.includes('/api/auth/platform-contact')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { phone: '02120000000', email: 'destek@example.com', whatsapp: '05550000000' }
        })
      })
      return
    }
    if (url.includes('/api/auth/refresh')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { token: 'e2e-token', refreshToken: 'e2e-refresh' } })
      })
      return
    }
    if (url.includes('/api/platform/overview')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            cards: {
              total: 0,
              yearlyActive: 0,
              demoActive: 0,
              suspended: 0,
              archived: 0,
              expiringSoon: 0,
              expired: 0,
              memberTotal: 0,
              userTotal: 0
            },
            logins: { uniqueToday: 0, uniqueLast7Days: 0, uniqueLast30Days: 0, onlineNow: 0 },
            charts: { dailyLogins: [], monthlyTenants: [], topActive: [] },
            lists: { expiring: [], expired: [], recent: [] }
          }
        })
      })
      return
    }
    if (url.includes('/api/auth/announcements') || url.includes('/api/platform/')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] })
      })
      return
    }
    if (method === 'GET' || method === 'POST' || method === 'PATCH' || method === 'PUT' || method === 'DELETE') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] })
      })
      return
    }
    await route.continue()
  })

  await page.addInitScript(() => {
    localStorage.setItem('koopplus.saas.accessToken', 'e2e-token')
    localStorage.setItem('koopplus.saas.refreshToken', 'e2e-refresh')
    localStorage.setItem('koopplus.saas.tenantId', 't1')
    localStorage.setItem('koopplus.saas.lastActivityAt', String(Date.now()))
  })
}

async function assertNoHorizontalOverflow(page: Page, path: string, vp: string): Promise<void> {
  const result = await page.evaluate(() => {
    const doc = document.documentElement
    const body = document.body
    const scrollWidth = Math.max(doc.scrollWidth, body?.scrollWidth ?? 0)
    const clientWidth = window.innerWidth
    const offenders: string[] = []
    document.querySelectorAll('body *').forEach((el) => {
      const node = el as HTMLElement
      if (!node.getBoundingClientRect) return
      const rect = node.getBoundingClientRect()
      if (rect.width > clientWidth + 1 && rect.right > clientWidth + 2) {
        const tag = node.tagName.toLowerCase()
        const cls = typeof node.className === 'string' ? node.className.split(' ').slice(0, 2).join('.') : ''
        offenders.push(`${tag}${cls ? '.' + cls : ''}`)
      }
    })
    return { scrollWidth, clientWidth, ok: scrollWidth <= clientWidth + 1, offenders: offenders.slice(0, 8) }
  })
  expect(
    result.ok,
    `${path} @ ${vp}: scrollWidth=${result.scrollWidth} > innerWidth=${result.clientWidth}; örnek: ${result.offenders.join(', ')}`
  ).toBeTruthy()
}

for (const vp of VIEWPORTS) {
  test.describe(`yatay taşma ${vp.name} (${vp.width}px)`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } })

    for (const path of APP_PATHS) {
      test(`${path}`, async ({ page }) => {
        await installApiMocks(page)
        await page.goto(path, { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(400)
        // Login sayfasında oturum varsa yönlenebilir; yine de taşma kontrolü yapılır
        await assertNoHorizontalOverflow(page, path, vp.name)
      })
    }
  })
}
