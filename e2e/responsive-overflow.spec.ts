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
    if (url.includes('/api/cooperatives')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            current_id: 't1',
            cooperatives: [
              {
                id: 't1',
                name: 'Demo Kooperatif E2E',
                status: 'ACTIVE',
                relative_path: 't1',
                created_at: '2026-01-01T00:00:00.000Z',
                last_opened_at: null,
                origin: 'created'
              }
            ]
          }
        })
      })
      return
    }
    if (url.includes('/api/settings')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: {} })
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
        body: JSON.stringify({ success: true, data: {} })
      })
      return
    }
    await route.continue()
  })

  await page.addInitScript((me) => {
    localStorage.setItem('koopplus.saas.tenantId', 't1')
    localStorage.setItem('koopplus.saas.lastActivityAt', String(Date.now()))
    const originalFetch = window.fetch.bind(window)
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
      if (url.includes('/api/auth/refresh')) {
        return new Response(JSON.stringify({ success: true, data: { token: 'e2e-token' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }
      if (url.includes('/api/auth/me')) {
        return new Response(JSON.stringify(me), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }
      if (url.includes('/api/cooperatives')) {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              current_id: 't1',
              cooperatives: [
                {
                  id: 't1',
                  name: 'Demo Kooperatif E2E',
                  status: 'ACTIVE',
                  relative_path: 't1',
                  created_at: '2026-01-01T00:00:00.000Z',
                  last_opened_at: null,
                  origin: 'created'
                }
              ]
            }
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }
      if (url.includes('/api/')) {
        return new Response(JSON.stringify({ success: true, data: {} }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }
      return originalFetch(input, init)
    }
  }, mePayload)
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

const DRAWER_VIEWPORTS = [
  { name: 'phone', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 }
] as const

async function assertSidebarOffCanvas(page: Page): Promise<void> {
  const sidebar = page.locator('#app-sidebar')
  await expect(sidebar).not.toHaveClass(/is-open/)
  const visible = await sidebar.evaluate((el) => {
    const s = window.getComputedStyle(el)
    return s.visibility !== 'hidden' && s.transform.includes('matrix(1, 0, 0, 1, 0, 0)')
  })
  expect(visible, 'kapalı menü görünür/transform sıfır olmamalı').toBeFalsy()
}

for (const vp of DRAWER_VIEWPORTS) {
  test.describe(`mobil menü çekmece ${vp.name} (${vp.width}px)`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } })

    test('sol menü varsayılan gizli; ☰ ile açılıp kapanır', async ({ page }) => {
      await installApiMocks(page)
      await page.goto('/', { waitUntil: 'networkidle' })
      await expect(page.locator('.app-shell, .pf-shell')).toBeVisible({ timeout: 30_000 })
      const sidebar = page.locator('#app-sidebar')
      await expect(sidebar).toBeAttached({ timeout: 15_000 })
      const menuBtn = page.locator('.nav-menu-btn')
      await expect(menuBtn).toBeVisible()
      await expect(sidebar).not.toHaveClass(/is-open/)
      await assertSidebarOffCanvas(page)

      await menuBtn.click()
      await expect(sidebar).toHaveClass(/is-open/)
      await expect(sidebar).toBeVisible()
      await expect
        .poll(async () =>
          sidebar.evaluate((el) => {
            const t = window.getComputedStyle(el).transform
            // translate3d(0,0,0) → matrix(1, 0, 0, 1, 0, 0) veya none
            return t === 'none' || t.startsWith('matrix(1, 0, 0, 1, 0, 0)')
          })
        )
        .toBeTruthy()

      // Backdrop ile kapat (hamburger üst katmanda kalmayabilir)
      await page.locator('.nav-backdrop').click({ position: { x: 320, y: 200 }, force: true })
      await expect(sidebar).not.toHaveClass(/is-open/)
      await assertSidebarOffCanvas(page)
    })
  })
}
