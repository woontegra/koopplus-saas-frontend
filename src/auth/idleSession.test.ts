import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  IDLE_TIMEOUT_MS,
  IDLE_WARNING_MS,
  idleExpiresAt,
  idleWarningAt,
  isIdleExpired,
  nextSilentRefreshAt,
  shouldShowIdleWarning
} from './idleSession'

describe('idleSession politikası', () => {
  it('60 dk idle ve 1 dk önce uyarı', () => {
    assert.equal(IDLE_TIMEOUT_MS, 60 * 60 * 1000)
    assert.equal(IDLE_WARNING_MS, 60 * 1000)
    const t0 = 1_000_000
    assert.equal(idleWarningAt(t0), t0 + IDLE_TIMEOUT_MS - IDLE_WARNING_MS)
    assert.equal(idleExpiresAt(t0), t0 + IDLE_TIMEOUT_MS)
  })

  it('uyarı penceresi yalnızca son 1 dakikada', () => {
    const t0 = 0
    assert.equal(shouldShowIdleWarning(t0, IDLE_TIMEOUT_MS - IDLE_WARNING_MS - 1), false)
    assert.equal(shouldShowIdleWarning(t0, IDLE_TIMEOUT_MS - IDLE_WARNING_MS), true)
    assert.equal(shouldShowIdleWarning(t0, IDLE_TIMEOUT_MS - 1), true)
    assert.equal(isIdleExpired(t0, IDLE_TIMEOUT_MS - 1), false)
    assert.equal(isIdleExpired(t0, IDLE_TIMEOUT_MS), true)
  })

  it('sessiz yenileme JWT exp’ten 60 sn önce', () => {
    const now = Date.now()
    const exp = Math.floor(now / 1000) + 900
    const header = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url')
    const payload = Buffer.from(JSON.stringify({ exp })).toString('base64url')
    const token = `${header}.${payload}.x`
    const at = nextSilentRefreshAt(token, now)
    assert.ok(at <= exp * 1000 - 60_000 + 1)
    assert.ok(at >= now + 5_000)
  })
})
