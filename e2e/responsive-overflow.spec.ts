import { test, expect, type Page } from '@playwright/test'

const VIEWPORTS = [
  { name: 'phone', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'wide', width: 1440, height: 900 }
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

const emptyPeriod = {
  enteredDue: 0,
  collectedPayment: 0,
  payerCount: 0,
  newlyDebtorMembers: 0,
  closedDebtAmount: 0,
  remainingDebtChange: 0
}

function buildMonthlySummary(count = 12) {
  const rows = []
  const now = new Date(2026, 10, 12) // Kasım 2026
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const year = d.getFullYear()
    const month = d.getMonth() + 1
    rows.push({
      year,
      month,
      label: `${String(month).padStart(2, '0')}.${year}`,
      enteredDue: 1000 + i,
      collectedPayment: 800 + i,
      periodBalance: 200,
      dueMemberCount: 3,
      payerCount: 2,
      activeMemberCount: 5,
      hasActivity: true
    })
  }
  return rows
}

const dashboardSummary = {
  totalMembers: 12,
  totalShareRatio: 12,
  totalPrincipal: 100000,
  totalPaid: 40000,
  totalRemainingDebt: 60000,
  activePeriodLabel: '11.2026',
  periodSummaries: {
    this_month: emptyPeriod,
    last_month: emptyPeriod,
    last_3_months: emptyPeriod,
    last_12_months: emptyPeriod,
    this_year: emptyPeriod
  },
  topDebtors: Array.from({ length: 8 }, (_, i) => ({
    partnerId: i + 1,
    partnerNo: String(100 + i),
    name: `Üye ${i + 1}`,
    remainingPrincipal: 1000 * (i + 1),
    remainingInterest: 100 * (i + 1),
    totalDebt: 1100 * (i + 1)
  })),
  recentPayments: [],
  monthlySummary: buildMonthlySummary(12),
  monthlySummaryStats: {
    totalEnteredDue: 12000,
    totalCollectedPayment: 9600,
    highestCollectionMonth: { label: '11.2026', value: 900 },
    highestActivityMonth: { label: '11.2026', value: 5 }
  },
  overdue: {
    memberCount: 0,
    dueCount: 0,
    principalTotal: 0,
    interestTotal: 0,
    members: []
  }
}

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
    if (url.includes('/api/dashboard/summary')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: dashboardSummary })
      })
      return
    }
    if (url.includes('/api/partners') && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { partners: [] } })
      })
      return
    }
    if (url.includes('/api/cash/summary')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { balance: 0 } })
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

  await page.addInitScript(
    ({ me, dashboard }) => {
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
        if (url.includes('/api/dashboard/summary')) {
          return new Response(JSON.stringify({ success: true, data: dashboard }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          })
        }
        if (url.includes('/api/partners')) {
          return new Response(JSON.stringify({ success: true, data: { partners: [] } }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          })
        }
        if (url.includes('/api/cash/summary')) {
          return new Response(JSON.stringify({ success: true, data: { balance: 0 } }), {
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
    },
    { me: mePayload, dashboard: dashboardSummary }
  )
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

/**
 * overflow-y: hidden/clip olan kart/panel/tabloda dikey içerik kesilmesin.
 * Bilinçli kaydırma alanları (modal, master-detail, picker listesi) hariç.
 */
async function assertNoClippedCardsOrTables(page: Page, path: string, vp: string): Promise<void> {
  const clipped = await page.evaluate(() => {
    const skipClosest =
      '.modal, .modal-overlay, .app-dialog, .app-dialog-overlay, .master-detail, .coop-switcher, .profile-menu, .interest-policy-member-picker__list, .member-import-table-wrap, .update-release-notes, .sidebar, .pf-nav, .nav-drawer'
    const selectors = [
      '.data-panel',
      '.stat-panel',
      '.table-wrap',
      '.dashboard-monthly-summary',
      '.dashboard__monthly-panel',
      '.dash-insight-card',
      '.aidat-dist-card',
      '.coop-card',
      '.pf-card'
    ]
    const nodes = new Set<Element>()
    for (const sel of selectors) {
      document.querySelectorAll(sel).forEach((el) => nodes.add(el))
    }
    const offenders: string[] = []
    for (const el of nodes) {
      const node = el as HTMLElement
      if (node.closest(skipClosest)) continue
      const style = window.getComputedStyle(node)
      const overflowY = style.overflowY
      if (overflowY !== 'hidden' && overflowY !== 'clip') continue
      if (style.textOverflow === 'ellipsis' && node.scrollHeight <= node.clientHeight + 2) continue
      if (node.clientHeight < 8) continue
      if (node.scrollHeight > node.clientHeight + 1) {
        const tag = node.tagName.toLowerCase()
        const cls =
          typeof node.className === 'string' ? node.className.trim().split(/\s+/).slice(0, 3).join('.') : ''
        offenders.push(`${tag}${cls ? '.' + cls : ''} ${node.scrollHeight}>${node.clientHeight}`)
      }
    }
    return offenders.slice(0, 15)
  })
  expect(clipped, `${path} @ ${vp}: dikey kesilen kart/tablo: ${clipped.join('; ')}`).toEqual([])
}

for (const vp of VIEWPORTS) {
  test.describe(`yatay taşma ${vp.name} (${vp.width}px)`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } })

    for (const path of APP_PATHS) {
      test(`${path}`, async ({ page }) => {
        await installApiMocks(page)
        await page.goto(path, { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(400)
        await assertNoHorizontalOverflow(page, path, vp.name)
        await assertNoClippedCardsOrTables(page, path, vp.name)
      })
    }
  })
}

test.describe('yönetim paneli 12 ay tablosu', () => {
  for (const vp of VIEWPORTS) {
    test(`12 ay satırı kesilmeden görünür @ ${vp.width}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await installApiMocks(page)
      await page.goto('/', { waitUntil: 'networkidle' })
      const panel = page.locator('.dashboard__monthly-panel')
      await expect(panel).toBeVisible({ timeout: 30_000 })
      const rows = panel.locator('.dashboard-monthly-table tbody tr')
      await expect(rows).toHaveCount(12)
      const wrap = panel.locator('.table-wrap--dashboard-monthly')
      const metrics = await wrap.evaluate((el) => {
        const style = window.getComputedStyle(el)
        const maxH = style.maxHeight
        const maxHNone = !maxH || maxH === 'none' || maxH === '0px'
        return {
          scrollHeight: el.scrollHeight,
          clientHeight: el.clientHeight,
          overflowY: style.overflowY,
          overflowX: style.overflowX,
          maxHNone
        }
      })
      expect(metrics.maxHNone, 'max-height sabit kesme olmamalı').toBeTruthy()
      expect(
        metrics.scrollHeight <= metrics.clientHeight + 1,
        `dikey kesilme: scrollHeight=${metrics.scrollHeight} clientHeight=${metrics.clientHeight} overflowY=${metrics.overflowY}`
      ).toBeTruthy()
      if (vp.width <= 375) {
        expect(['auto', 'scroll', 'overlay'].includes(metrics.overflowX)).toBeTruthy()
      }
    })
  }
})

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
            return t === 'none' || t.startsWith('matrix(1, 0, 0, 1, 0, 0)')
          })
        )
        .toBeTruthy()

      await page.locator('.nav-backdrop').click({ position: { x: 320, y: 200 }, force: true })
      await expect(sidebar).not.toHaveClass(/is-open/)
      await assertSidebarOffCanvas(page)
    })
  })
}
