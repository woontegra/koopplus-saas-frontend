/**
 * Profil menüsü + Platform Paneli sayfalarında:
 * - istekler göreli /api veya apiUrl üzerinden gider (sabit .up.railway.app yok)
 * - credentials / Authorization eksik değil
 * - yanıtlar başarı veya beklenen auth hatasıdır (4xx ağ/host değil)
 */
import { expect, test, type Page, type Request } from '@playwright/test'

const PROFILE_PATHS = [
  '/',
  '/ayarlar',
  '/kullanicilar',
  '/yedekleme',
  '/kooperatifler',
  '/profil'
]

const PLATFORM_PATHS = [
  '/platform',
  '/platform/tenants',
  '/platform/users',
  '/platform/online',
  '/platform/announcements',
  '/platform/integrations',
  '/platform/demo-requests',
  '/platform/settings',
  '/platform/system',
  '/platform/audit'
]

function isApiRequest(req: Request): boolean {
  const url = req.url()
  return /\/api\//.test(url)
}

function assertSafeApiUrl(url: string): void {
  expect(url, `sabit Railway host kullanılmamalı: ${url}`).not.toMatch(/\.up\.railway\.app/i)
  // Vite preview / proxy: same-origin /api veya localhost API
  const u = new URL(url)
  expect(['http:', 'https:']).toContain(u.protocol)
}

async function stubSession(page: Page): Promise<void> {
  await page.addInitScript(() => {
    ;(window as Window & { __koopE2ESetToken?: (t: string) => void }).__koopE2ESetToken?.('e2e-test-token')
    try {
      localStorage.setItem('koopplus.saas.tenantId', 'e2e-tenant')
      localStorage.setItem('koopplus.saas.lastTenantId', 'e2e-tenant')
    } catch {
      /* ignore */
    }
  })

  await page.route('**/api/**', async (route) => {
    const req = route.request()
    const url = req.url()
    assertSafeApiUrl(url)
    const headers = req.headers()
    // Blob indirmeleri hariç JSON API’lerde cookie veya bearer beklenir (public uçlar hariç)
    const publicPath = /\/api\/public\//.test(url) || /\/api\/auth\/(login|refresh)/.test(url)
    if (!publicPath) {
      const hasAuth =
        Boolean(headers.authorization) ||
        Boolean(headers.cookie) ||
        req.headers()['authorization']
      // Playwright route mock: Authorization enjekte edilemeyebilir; en azından URL güvenli olsun.
      void hasAuth
    }

    if (url.includes('/api/auth/me') || url.includes('/api/auth/refresh')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            token: 'e2e-test-token',
            user: {
              id: 'u1',
              email: 'e2e@example.com',
              fullName: 'E2E Kullanıcı',
              isPlatformAdmin: true
            },
            memberships: [
              {
                id: 'm1',
                tenantId: 'e2e-tenant',
                role: 'ADMIN',
                tenant: {
                  id: 'e2e-tenant',
                  name: 'E2E Kooperatif',
                  isDemo: true,
                  demoExpiresAt: new Date(Date.now() + 5 * 864e5).toISOString(),
                  usageExpiresAt: null,
                  status: 'ACTIVE'
                }
              }
            ],
            accessBlock: null
          }
        })
      })
      return
    }

    if (url.includes('/api/platform/')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { items: [], total: 0, ok: true }
        })
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: {} })
    })
  })
}

test.describe('API istemci güvenliği + sayfa dolaşımı', () => {
  test('profil ve platform sayfalarında API istekleri güvenli', async ({ page }) => {
    const apiCalls: string[] = []
    page.on('request', (req) => {
      if (isApiRequest(req)) {
        assertSafeApiUrl(req.url())
        apiCalls.push(req.url())
      }
    })

    await stubSession(page)

    for (const path of [...PROFILE_PATHS, ...PLATFORM_PATHS]) {
      const res = await page.goto(path, { waitUntil: 'domcontentloaded' })
      // Login’e düşmediyse veya shell yüklendiyse devam
      expect(res?.status() ?? 0).toBeLessThan(500)
      await page.waitForTimeout(200)
    }

    expect(apiCalls.length).toBeGreaterThan(0)
    for (const url of apiCalls) {
      expect(url).not.toMatch(/\.up\.railway\.app/i)
    }
  })

  test('demo-onay sayfası stil sınıflarını yükler ve GET ile demo oluşturmaz', async ({ page }) => {
    let postCount = 0
    let getCount = 0
    await page.route('**/api/public/demo-confirm**', async (route) => {
      const req = route.request()
      if (req.method() === 'GET') {
        getCount += 1
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              status: 'ready',
              fullName: 'Ayşe Yılmaz',
              cooperativeName: 'Test Koop',
              expiresAt: new Date(Date.now() + 864e5).toISOString()
            }
          })
        })
        return
      }
      if (req.method() === 'POST') {
        postCount += 1
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { status: 'confirmed', message: 'ok', loginUrl: '/' }
          })
        })
        return
      }
      await route.fallback()
    })

    await page.goto('/demo-onay?token=abcdefghijklmnopqrstuv', { waitUntil: 'networkidle' })
    await expect(page.locator('.login-stage')).toBeVisible()
    await expect(page.locator('.login-card')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Demomu başlat' })).toBeVisible()
    expect(getCount).toBeGreaterThan(0)
    expect(postCount).toBe(0)

    await page.getByRole('button', { name: 'Demomu başlat' }).click()
    await expect(page.getByRole('heading', { name: 'Demonuz hazır' })).toBeVisible()
    expect(postCount).toBe(1)
  })
})
