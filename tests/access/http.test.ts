// Isolated fixture only: no .env loading, corporate credentials, or existing database.
import ActiveDirectory from 'activedirectory2'
import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createServer, type Server } from 'node:http'
import { createApp, createRouter, getCookie, getRequestHeader, getRequestURL, toNodeListener } from 'h3'
import { PGlite } from '@electric-sql/pglite'
import { PGLiteSocketServer } from '@electric-sql/pglite-socket'
import type { PrismaClient } from '@prisma/client'
import type { AccessChange, AccessSnapshot } from '../../shared/types/access-management'

let db: PGlite
let socket: PGLiteSocketServer
let http: Server
let prisma: PrismaClient
let base: string
let databasePort: number
let adUnavailable = false, groupMember = true, sessionFailure = false, directoryMissing = false
const userGuid = '12345678-1234-5678-90ab-1234567890ab'
const groupGuid = 'abcdefab-1234-5678-90ab-1234567890ab'
const fakeGroup = { objectGUID: groupGuid, cn: 'Лаборатория AD', dn: 'CN=Lab,OU=Groups,DC=example,DC=test', groupType: -2147483646 }
const ldapFilters: string[] = []
const originalFind = ActiveDirectory.prototype.find
const originalFindUser = ActiveDirectory.prototype.findUser

const priorDatabaseUrl = process.env.DATABASE_URL

before(async () => {
  // Socket listens on loopback and uses an OS-selected port.
  db = await PGlite.create()
  await db.exec(await readFile(new URL('./fixture-schema.sql', import.meta.url), 'utf8'))
  socket = new PGLiteSocketServer({ db, host: '127.0.0.1', port: 0 })
  await socket.start()
  databasePort = Number(socket.getServerConn().split(':').at(-1))
  process.env.DATABASE_URL = `postgresql://postgres:postgres@127.0.0.1:${databasePort}/postgres?connection_limit=1&sslmode=disable`
  Object.assign(globalThis, {
    getUserSession: async (event: Parameters<typeof getCookie>[0]) => {
      const id = Number(getCookie(event, 'access-test-session'))
      return Number.isSafeInteger(id) && id > 0 ? { user: { id } } : {}
    },
    useRuntimeConfig: () => ({ adminLogins: ' ROOT ; second ', ad: {
      url: 'ldap://127.0.0.1:1', baseDN: 'OU=Users,DC=example,DC=test', groupsBaseDN: 'OU=Groups,DC=example,DC=test',
      username: 'fixture', password: 'fixture', timeout: 500,
    } }), getRequestURL, getRequestHeader,
    setUserSession: async () => { if (sessionFailure) throw new Error('fixture session unavailable') },
  })
  ActiveDirectory.prototype.find = function (options: any, cb: any) {
    ldapFilters.push(options.filter)
    if (adUnavailable) { cb(new Error('fixture offline')); return }
    const nested = options.filter.includes('1.2.840.113556.1.4.1941')
    const rawGuid = Buffer.from('abefcdab3412785690ab1234567890ab', 'hex')
    let parsed: any
    options.entryParser({ ...fakeGroup, objectGUID: 'incorrect-default-SID' }, { objectGUID: rawGuid }, (value: any) => { parsed = value })
    cb(null, { groups: nested && !groupMember ? [] : [parsed] })
  } as any
  ActiveDirectory.prototype.findUser = function (_login: any, cb: any) {
    if (adUnavailable) { cb(new Error('fixture offline')); return }
    cb(null, directoryMissing ? null : { objectGUID: userGuid, sAMAccountName: 'worker', displayName: 'Worker',
      dn: 'CN=Worker,OU=Users,DC=example,DC=test', userAccountControl: 512 })
  } as any
  prisma = (await import('../../server/utils/prisma')).prisma
  await prisma.department.createMany({ data: [
    { id: 1, key: 'lab', name: 'Лаборатория' }, { id: 2, key: 'other', name: 'Другой отдел' },
    { id: 3, key: 'disabled', name: 'Отключённый отдел', isActive: false },
  ] })
  await prisma.user.createMany({ data: [
    { id: 1, authType: 'DOMAIN', status: 'ACTIVE', login: 'root', fullName: 'Администратор' },
    { id: 2, authType: 'DOMAIN', status: 'ACTIVE', login: 'reviewer', fullName: 'Наблюдатель' },
    { id: 3, authType: 'DOMAIN', status: 'ACTIVE', login: 'worker', fullName: 'Анна Смирнова', departmentId: 1 },
    { id: 4, authType: 'EXTERNAL', status: 'BLOCKED', email: 'blocked@example.test', departmentId: 1 },
  ] })
  await prisma.accessResource.createMany({ data: [
    { id: 1, key: 'admin.users', name: 'Сотрудники', type: 'SECTION' },
    { id: 2, key: 'admin.center', name: 'AdminCenter', type: 'SECTION' },
    { id: 3, key: 'lab.sampling-tests', name: 'Реестр проб', type: 'TABLE' },
    { id: 4, key: 'lab.materials', name: 'Материалы', type: 'TABLE' },
    { id: 5, key: 'disabled.table', name: 'Отключённая таблица', type: 'TABLE', isActive: false },
    { id: 6, key: 'unknown.feature', name: 'Новая функция', type: 'FEATURE' },
    { id: 7, key: 'admin.department-permissions', name: 'Права отделов', type: 'FEATURE' },
    { id: 8, key: 'admin.department-mapping', name: 'Сопоставление отделов', type: 'FEATURE' },
  ] })
  await prisma.userPermission.createMany({ data: [
    { userId: 2, resourceId: 1, action: 'VIEW' },
    { userId: 2, resourceId: 7, action: 'UPDATE' }, { userId: 2, resourceId: 8, action: 'UPDATE' },
  ] })
  const router = createRouter()
  router.get('/api/admin/users/:id/access', (await import('../../server/api/admin/users/[id]/access.get')).default)
  router.put('/api/admin/users/:id/access', (await import('../../server/api/admin/users/[id]/access.put')).default)
  router.get('/api/admin/departments/:id/permissions', (await import('../../server/api/admin/departments/[id]/permissions.get')).default)
  router.put('/api/admin/departments/:id/permissions', (await import('../../server/api/admin/departments/[id]/permissions.put')).default)
  router.get('/api/admin/access/subjects', (await import('../../server/api/admin/access/subjects.get')).default)
  router.get('/api/admin/domain-groups/search', (await import('../../server/api/admin/domain-groups/search.get')).default)
  router.post('/api/admin/domain-groups', (await import('../../server/api/admin/domain-groups/index.post')).default)
  router.get('/api/admin/domain-groups/:id/permissions', (await import('../../server/api/admin/domain-groups/[id]/permissions.get')).default)
  router.put('/api/admin/domain-groups/:id/permissions', (await import('../../server/api/admin/domain-groups/[id]/permissions.put')).default)
  router.post('/api/auth/kerberos', (await import('../../server/api/auth/kerberos.post')).default)
  router.get('/api/access/check', (await import('../../server/api/access/check.get')).default)
  const app = createApp({ debug: false })
  app.use(router)
  http = createServer(toNodeListener(app))
  await new Promise<void>(resolve => http.listen(0, '127.0.0.1', resolve))
  const address = http.address()
  assert.ok(address && typeof address !== 'string')
  base = `http://127.0.0.1:${address.port}`
}, { timeout: 60000 })

after(async () => {
  ActiveDirectory.prototype.find = originalFind
  ActiveDirectory.prototype.findUser = originalFindUser
  if (http) await new Promise<void>(resolve => { http.closeAllConnections(); http.close(() => resolve()) })
  if (prisma) await prisma.$disconnect()
  if (socket) await socket.stop()
  if (db) await db.close()
  if (priorDatabaseUrl === undefined) delete process.env.DATABASE_URL
  else process.env.DATABASE_URL = priorDatabaseUrl
})

async function request(path: string, actor = 1, body?: unknown, headers: Record<string, string> = {}) {
  const response = await fetch(base + path, { method: body === undefined ? 'GET' : 'PUT',
    headers: { cookie: `access-test-session=${actor}`, ...(body === undefined ? {} : { 'content-type': 'application/json', 'x-space-access-change': '1' }), ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  return { status: response.status, data: await response.json() }
}
const userPath = '/api/admin/users/3/access'
const departmentPath = '/api/admin/departments/1/permissions'
async function snapshot(path = userPath): Promise<AccessSnapshot> {
  const response = await request(path)
  assert.equal(response.status, 200, JSON.stringify(response.data))
  return response.data
}
async function change(path: string, changes: AccessChange[]) {
  const view = await snapshot(path)
  return request(path, 1, { revision: view.revision, changes })
}
function cell(view: AccessSnapshot, id = 3, action: 'VIEW' | 'CREATE' | 'UPDATE' | 'DELETE' = 'VIEW') {
  return view.data.find(row => row.id === id)!.actions[action]
}
const check = (action = 'VIEW', actor = 3, key = 'lab.sampling-tests') => request(`/api/access/check?resource=${key}&action=${action}`, actor)

test('HTTP: authentication and reader authorization', async () => {
  assert.equal((await request(userPath, 0)).status, 401)
  assert.equal((await request(userPath, 3)).status, 403)
  const read = await request(userPath, 2)
  assert.equal(read.status, 200)
  assert.equal(read.data.canManage, false)
  assert.equal(cell(read.data).effectiveGranted, false)
})
test('HTTP + SQL: a department grant reaches the actual permission guard', async () => {
  assert.equal((await change(departmentPath, [{ resourceId: 3, action: 'VIEW', granted: true }])).status, 200)
  const view = await snapshot()
  assert.equal(cell(view).directGranted, false)
  assert.equal(cell(view).inheritedGranted, true)
  assert.equal(cell(view).effectiveGranted, true)
  assert.deepEqual((await check()).data.sources, ['DEPARTMENT'])
})
test('HTTP + SQL: personal rights add to department rights', async () => {
  assert.equal((await change(userPath, [{ resourceId: 3, action: 'UPDATE', granted: true }, { resourceId: 3, action: 'VIEW', granted: true }])).status, 200)
  assert.deepEqual((await check()).data.sources, ['USER', 'DEPARTMENT'])
  assert.deepEqual((await check('UPDATE')).data.sources, ['USER'])
})
test('HTTP + SQL: revoking personal VIEW retains inherited access', async () => {
  const result = await change(userPath, [{ resourceId: 3, action: 'VIEW', granted: false }])
  assert.equal(result.status, 200)
  assert.equal(cell(result.data).directGranted, false)
  assert.equal(cell(result.data).effectiveGranted, true)
  assert.deepEqual((await check()).data.sources, ['DEPARTMENT'])
})
test('HTTP + SQL: revoking department VIEW returns 403 without a new login', async () => {
  assert.equal((await change(departmentPath, [{ resourceId: 3, action: 'VIEW', granted: false }])).status, 200)
  assert.equal((await check()).status, 403)
  assert.equal((await check('UPDATE')).status, 200)
  assert.ok(await prisma.auditLog.count({ where: { category: 'ADMIN', targetUserId: 3 } }) > 0)
})
test('HTTP: legacy management grant does not permit new or indirect delegation', async () => {
  const view = await snapshot()
  assert.equal((await request(userPath, 2, { revision: view.revision, changes: [{ resourceId: 4, action: 'VIEW', granted: true }] })).status, 403)
  assert.equal((await check('UPDATE', 2, 'admin.department-permissions')).status, 403)
  assert.equal((await check('UPDATE', 2, 'admin.department-mapping')).status, 403)
})
test('HTTP: header, strict body and duplicate changes are validated', async () => {
  const view = await snapshot()
  const item = { resourceId: 4, action: 'VIEW', granted: true }
  assert.equal((await request(userPath, 1, { revision: view.revision, changes: [item] }, { 'x-space-access-change': '' })).status, 403)
  assert.equal((await request(userPath, 1, { revision: view.revision, changes: [item] }, { 'sec-fetch-site': 'cross-site' })).status, 403)
  assert.equal((await request(userPath, 1, { revision: view.revision, changes: [item, item] })).status, 400)
  assert.equal((await request(userPath, 1, { revision: view.revision, changes: [{ ...item, granted: 'false' }] })).status, 400)
})
test('HTTP + SQL: stale versions do not overwrite another administrator', async () => {
  const old = await snapshot()
  assert.equal((await change(userPath, [{ resourceId: 4, action: 'VIEW', granted: true }])).status, 200)
  assert.equal((await request(userPath, 1, { revision: old.revision, changes: [{ resourceId: 4, action: 'VIEW', granted: false }] })).status, 409)
  assert.equal(cell(await snapshot(), 4).directGranted, true)
})
test('HTTP + SQL: invalid batch grants are rejected atomically', async () => {
  assert.equal((await change(userPath, [
    { resourceId: 4, action: 'DELETE', granted: true }, { resourceId: 6, action: 'CREATE', granted: true },
  ])).status, 400)
  assert.equal(cell(await snapshot(), 4, 'DELETE').directGranted, false)
})
test('HTTP + SQL: audit failure rolls back the grant', async () => {
  await db.exec(`CREATE FUNCTION fail_test_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.category = 'ADMIN' THEN RAISE EXCEPTION 'fixture audit failure'; END IF; RETURN NEW; END $$;
    CREATE TRIGGER fail_test_audit BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION fail_test_audit();`)
  try {
    assert.equal((await change(userPath, [{ resourceId: 4, action: 'DELETE', granted: true }])).status, 500)
    assert.equal(cell(await snapshot(), 4, 'DELETE').directGranted, false)
  } finally { await db.exec('DROP TRIGGER fail_test_audit ON audit_logs; DROP FUNCTION fail_test_audit();') }
})
test('HTTP + SQL: blocked employees keep assignments but cannot use them', async () => {
  await prisma.user.update({ where: { id: 3 }, data: { status: 'BLOCKED' } })
  const view = await snapshot()
  assert.equal(cell(view, 3, 'UPDATE').directGranted, true)
  assert.equal(cell(view, 3, 'UPDATE').effectiveGranted, false)
  assert.equal((await check('UPDATE')).status, 403)
  await prisma.user.update({ where: { id: 3 }, data: { status: 'ACTIVE' } })
})
test('HTTP + SQL: disabling a department removes inheritance but retains personal grants', async () => {
  await change(departmentPath, [{ resourceId: 3, action: 'VIEW', granted: true }])
  await prisma.department.update({ where: { id: 1 }, data: { isActive: false } })
  assert.equal((await check()).status, 403)
  assert.equal((await check('UPDATE')).status, 200)
  assert.equal(cell(await snapshot()).inheritedGranted, false)
  await prisma.department.update({ where: { id: 1 }, data: { isActive: true } })
})
test('HTTP + SQL: changing membership changes inherited access', async () => {
  await prisma.user.update({ where: { id: 3 }, data: { departmentId: 2 } })
  assert.equal((await check()).status, 403)
  assert.equal((await check('UPDATE')).status, 200)
  await prisma.user.update({ where: { id: 3 }, data: { departmentId: 1 } })
})
test('HTTP + SQL: inactive resources can be cleaned up, never used or newly granted', async () => {
  await prisma.accessResource.update({ where: { id: 4 }, data: { isActive: false } })
  assert.equal((await check('VIEW', 1, 'lab.materials')).status, 403)
  assert.equal((await change(userPath, [{ resourceId: 4, action: 'CREATE', granted: true }])).status, 400)
  assert.equal((await change(userPath, [{ resourceId: 4, action: 'VIEW', granted: false }])).status, 200)
})
test('HTTP + SQL: no-op does not create audit noise', async () => {
  const count = await prisma.auditLog.count({ where: { category: 'ADMIN' } })
  assert.equal((await change(userPath, [{ resourceId: 3, action: 'UPDATE', granted: true }])).status, 200)
  assert.equal(await prisma.auditLog.count({ where: { category: 'ADMIN' } }), count)
})
test('HTTP: subject search covers Space departments and registered employees', async () => {
  const result = await request('/api/admin/access/subjects?kind=department')
  assert.equal(result.status, 200)
  assert.equal(result.data.items.length, 3)
  const users = await request('/api/admin/access/subjects?kind=user&search=worker')
  assert.equal(users.data.items[0].id, 3)
})
test('HTTP: disabled bootstrap admin cannot mutate', async () => {
  const view = await snapshot()
  await prisma.user.update({ where: { id: 1 }, data: { status: 'BLOCKED' } })
  try {
    assert.equal((await request(userPath, 1, { revision: view.revision, changes: [{ resourceId: 3, action: 'DELETE', granted: true }] })).status, 403)
  } finally { await prisma.user.update({ where: { id: 1 }, data: { status: 'ACTIVE' } }) }
})

let groupPath = ''
test('groups: directory search is admin-only; import ignores untrusted client name', async () => {
  await prisma.user.update({ where: { id: 1 }, data: { status: 'ACTIVE' } })
  await prisma.user.update({ where: { id: 3 }, data: { directoryObjectId: userGuid } })
  assert.equal((await request('/api/admin/domain-groups/search?search=Lab', 2)).status, 403)
  const found = await request('/api/admin/domain-groups/search?search=Lab')
  assert.equal(found.status, 200); assert.equal(found.data.items[0].directoryObjectId, groupGuid)
  const result = await fetch(base + '/api/admin/domain-groups', { method: 'POST',
    headers: { cookie: 'access-test-session=1', 'content-type': 'application/json', 'x-space-access-change': '1' },
    body: JSON.stringify({ directoryObjectId: groupGuid, name: 'Untrusted browser name' }),
  })
  assert.equal(result.status, 200)
  const body = await result.json(); assert.equal(body.item.name, fakeGroup.cn)
  groupPath = `/api/admin/domain-groups/${body.item.id}/permissions`
  assert.equal((await request('/api/admin/access/subjects?kind=domainGroup')).data.items.length, 1)
})
test('groups: LDAP filter metacharacters are escaped and GUID bytes use AD order', async () => {
  const { escapeLdapFilter, guidLdapFilter } = await import('../../server/services/domain-group-directory.service')
  assert.equal(escapeLdapFilter('a*(x)\\'), 'a\\2a\\28x\\29\\5c')
  assert.equal(guidLdapFilter(userGuid), '\\78\\56\\34\\12\\34\\12\\78\\56\\90\\ab\\12\\34\\56\\78\\90\\ab')
  assert.throws(() => guidLdapFilter('*)(objectClass=*)'))
})
test('groups: nested membership grants real API access and is visible in matrix', async () => {
  const result = await change(groupPath, [{ resourceId: 3, action: 'CREATE', granted: true }])
  assert.equal(result.status, 200)
  assert.deepEqual((await check('CREATE')).data.sources, ['DOMAIN_GROUP'])
  const c = cell(await snapshot(), 3, 'CREATE')
  assert.equal(c.directGranted, false); assert.equal(c.domainGroups[0].name, fakeGroup.cn); assert.equal(c.effectiveGranted, true)
  assert.ok(ldapFilters.some(f => f.includes('member:1.2.840.113556.1.4.1941:=')))
  assert.ok(await prisma.auditLog.count({ where: { entityType: 'DomainGroupPermission' } }) > 0)
})
test('groups: removal from AD takes effect on next request without login', async () => {
  groupMember = false
  assert.equal((await check('CREATE')).status, 403)
  assert.equal(cell(await snapshot(), 3, 'CREATE').effectiveGranted, false)
  groupMember = true
})
test('groups: directory failure cannot authorize; personal access still works', async () => {
  adUnavailable = true
  assert.equal((await check('CREATE')).status, 503)
  assert.equal((await check('UPDATE')).status, 200)
  const view = await snapshot(); assert.ok(view.directoryWarning); assert.equal(cell(view, 3, 'CREATE').effectiveGranted, false)
  adUnavailable = false
})
test('groups: a replaced AD identity does not inherit rights of previous account', async () => {
  await prisma.user.update({ where: { id: 3 }, data: { directoryObjectId: '00000000-1234-5678-90ab-1234567890ab' } })
  assert.equal((await check('CREATE')).status, 403)
  await prisma.user.update({ where: { id: 3 }, data: { directoryObjectId: userGuid } })
})
test('groups: disabled group and resource override membership; reader cannot grant', async () => {
  const group = await prisma.domainGroup.findUniqueOrThrow({ where: { directoryObjectId: groupGuid } })
  await prisma.domainGroup.update({ where: { id: group.id }, data: { isActive: false } })
  assert.equal((await check('CREATE')).status, 403)
  await prisma.domainGroup.update({ where: { id: group.id }, data: { isActive: true } })
  await prisma.accessResource.update({ where: { id: 3 }, data: { isActive: false } })
  assert.equal((await check('CREATE')).status, 403)
  await prisma.accessResource.update({ where: { id: 3 }, data: { isActive: true } })
  const view = await snapshot(groupPath)
  assert.equal((await request(groupPath, 2, { revision: view.revision, changes: [{ resourceId: 3, action: 'DELETE', granted: true }] })).status, 403)
})
test('groups: revoking a group grant removes access immediately', async () => {
  assert.equal((await change(groupPath, [{ resourceId: 3, action: 'CREATE', granted: false }])).status, 200)
  assert.equal((await check('CREATE')).status, 403)
})
async function kerberos(headers: Record<string, string> = {}) {
  const res = await fetch(base + '/api/auth/kerberos', { method: 'POST', headers })
  return { status: res.status, stage: res.headers.get('x-space-auth-stage'), data: await res.json() }
}
test('Kerberos: missing proxy identity reports proxy stage, not invalid password', async () => {
  const res = await kerberos(); assert.equal(res.status, 401); assert.equal(res.stage, 'proxy')
  assert.ok(res.data.data.requestId)
})
test('Kerberos: directory failures are distinct from denied Space account', async () => {
  adUnavailable = true
  const unavailable = await kerberos({ 'x-remote-user': 'worker' }); assert.equal(unavailable.status, 503); assert.equal(unavailable.stage, 'directory')
  adUnavailable = false; directoryMissing = true
  assert.equal((await kerberos({ 'x-remote-user': 'worker' })).status, 403)
  directoryMissing = false
  await prisma.user.update({ where: { id: 3 }, data: { status: 'BLOCKED' } })
  const blocked = await kerberos({ 'x-remote-user': 'worker' }); assert.equal(blocked.status, 403); assert.equal(blocked.stage, 'account')
  await prisma.user.update({ where: { id: 3 }, data: { status: 'ACTIVE' } })
})
test('Kerberos: session creation failure is observable; successful response retains DB user ID', async () => {
  sessionFailure = true
  const failed = await kerberos({ 'x-remote-user': 'worker' }); assert.equal(failed.status, 500); assert.equal(failed.stage, 'session')
  sessionFailure = false
  const success = await kerberos({ 'x-remote-user': 'worker' }); assert.equal(success.status, 200); assert.equal(success.stage, 'complete')
  assert.equal(success.data.user.id, 3); assert.equal(success.data.user.authMethod, 'KERBEROS')
})
