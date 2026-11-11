/**
 * İzleyici: yazma kapalı; yedek (admin-only) kapalı.
 * PDF/Excel backend SESSION olduğu için İzleyici oturumuyla açıktır.
 */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { canSeeAdminOnly, canWriteMembers } from './roles'

describe('VIEWER dışa aktarma erişimi', () => {
  it('yazma ve yedekleme (admin-only) kapalı; PERSONEL yazabilir', () => {
    assert.equal(canWriteMembers('VIEWER'), false)
    assert.equal(canSeeAdminOnly('VIEWER'), false)
    assert.equal(canWriteMembers('STAFF'), true)
    assert.equal(canSeeAdminOnly('ADMIN'), true)
  })
})
