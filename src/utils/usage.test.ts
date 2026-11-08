import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { daysRemaining } from './usage.ts'

describe('daysRemaining (takvim günü, Europe/Istanbul)', () => {
  it('08.11.2026 → 08.11.2027 = 365', () => {
    const end = '2027-11-07T21:00:00.000Z' // 08.11.2027 00:00 TR
    assert.equal(daysRemaining(end, new Date('2026-11-07T21:00:00.000Z')), 365)
    assert.equal(daysRemaining(end, new Date('2026-11-08T08:00:00.000Z')), 365)
  })

  it('Math.ceil(ms) ile 366 çıkan senaryoda 365 döner', () => {
    const end = '2027-11-08T20:59:59.000Z'
    const now = new Date('2026-11-08T00:00:01.000Z')
    assert.equal(Math.ceil((new Date(end).getTime() - now.getTime()) / 86_400_000), 366)
    assert.equal(daysRemaining(end, now), 365)
  })
})
