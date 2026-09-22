import { test } from 'node:test'
import assert from 'node:assert/strict'
import { decideAccess, normalizeAdminLogins, isSystemAdminLogin } from '../../shared/utils/access-decision'
import { parseAccessId, parseAccessMutation } from '../../server/services/access-input'

const base = { userActive: true, resourceActive: true, systemAdmin: false, direct: false, departmentActive: true, departmentGranted: false }
for (const [name, patch, allowed, sources] of [
  ['default deny', {}, false, []],
  ['personal grant', { direct: true }, true, ['USER']],
  ['department grant', { departmentGranted: true }, true, ['DEPARTMENT']],
  ['both sources', { direct: true, departmentGranted: true }, true, ['USER', 'DEPARTMENT']],
  ['inactive department', { departmentGranted: true, departmentActive: false }, false, []],
  ['personal survives disabled department', { direct: true, departmentGranted: true, departmentActive: false }, true, ['USER']],
  ['inactive resource beats admin', { resourceActive: false, systemAdmin: true }, false, []],
  ['blocked account beats admin', { userActive: false, systemAdmin: true }, false, []],
  ['bootstrap admin', { systemAdmin: true }, true, ['SYSTEM_ADMIN']],
  ['legacy permission cannot delegate', { direct: true, systemAdminOnly: true }, false, []],
] as const) {
  test(name, () => { const result = decideAccess({ ...base, ...patch }); assert.equal(result.allowed, allowed); assert.deepEqual(result.sources, sources) })
}
test('admin configuration normalizes separators, case and arrays', () => {
  assert.deepEqual([...normalizeAdminLogins(' Root;ADMIN, other\nroot ')], ['root', 'admin', 'other'])
  assert.equal(isSystemAdminLogin(' ROOT ', ['root', 2, null]), true)
  assert.equal(isSystemAdminLogin(null, ['root']), false)
})
test('only valid positive database IDs are accepted', () => {
  assert.equal(parseAccessId('17'), 17)
  for (const value of ['1e2', '01', '-1', 0, true, [], 2_147_483_648]) assert.throws(() => parseAccessId(value))
})
test('strict mutation validation rejects duplicated permissions and string booleans', () => {
  const valid = { revision: 'a'.repeat(64), changes: [{ resourceId: 3, action: 'VIEW', granted: true }] }
  assert.deepEqual(parseAccessMutation(valid), valid)
  assert.throws(() => parseAccessMutation({ ...valid, changes: [...valid.changes, ...valid.changes] }))
  assert.throws(() => parseAccessMutation({ ...valid, changes: [{ resourceId: 3, action: 'VIEW', granted: 'false' }] }))
  assert.throws(() => parseAccessMutation({ ...valid, revision: '' }))
  assert.throws(() => parseAccessMutation({ ...valid, changes: [{ resourceId: 3, action: 'GRANT_ADMIN', granted: true }] }))
})
