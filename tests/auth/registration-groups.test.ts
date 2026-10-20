import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { build } from 'esbuild';
import { PrismaClient } from '@prisma/client';
import * as h3 from 'h3';

const url = process.env.WORK_TEST_DATABASE_URL || '';
if (!url || !new URL(url).pathname.endsWith('_work_test')) throw new Error('Disposable *_work_test database required');
const db = new PrismaClient({ datasources: { db: { url } } });
const mails: any[] = [], outputs: URL[] = [];
Object.assign(globalThis, h3, {
 registrationTestDb: db, registrationTestMails: mails,
 requireAdmin: async (e: h3.H3Event) => {
  if (h3.getHeader(e, 'x-test-admin') !== '1') throw h3.createError({ statusCode: 403 });
  return { login: 'test-admin' };
 },
});
async function handler(file: string) {
 const out = await build({ entryPoints: [file], bundle: true, write: false, platform: 'node', format: 'esm', packages: 'external', plugins: [{ name: 'registration-test', setup(b) {
  b.onResolve({ filter: /utils\/prisma$/ }, () => ({ path: 'db', namespace: 'stub' }));
  b.onResolve({ filter: /utils\/mailer$/ }, () => ({ path: 'mail', namespace: 'stub' }));
  b.onLoad({ filter: /.*/, namespace: 'stub' }, a => ({ contents: a.path === 'db' ? 'export const prisma = globalThis.registrationTestDb;' : 'export async function sendVerificationEmail(v){globalThis.registrationTestMails.push({kind:"verify",...v});} export async function sendActivationEmail(v){globalThis.registrationTestMails.push({kind:"activate",...v});}' }));
 } }] });
 const fileOut = new URL(`./.registration-${outputs.length}.mjs`, import.meta.url); outputs.push(fileOut);
 await writeFile(fileOut, out.outputFiles[0]!.text); return (await import(fileOut.href)).default;
}
test('registration groups: public catalogue, validation, approval, membership and legacy requests', async () => {
 const server = createServer();
 try {
  const sql = await readFile(new URL('../../prisma/migrations/20261020140000_registration_groups/migration.sql', import.meta.url), 'utf8');
  for (const statement of sql.split(';').filter(s => s.trim())) await db.$executeRawUnsafe(statement);
  const app = h3.createApp({ debug: false }), router = h3.createRouter();
  const routes = [
   ['/groups', 'public/registration-resources.get', 'get'],
   ['/register', 'auth/register-request.post', 'post'],
   ['/requests', 'admin/registration-requests/index.get', 'get'],
   ['/requests/:id', 'admin/registration-requests/[id].get', 'get'],
   ['/requests/:id/review', 'admin/registration-requests/[id]/review.post', 'post'],
   ['/requests/:id/provision', 'admin/registration-requests/[id]/provision.post', 'post'],
  ];
  for (const [path, file, method] of routes) (router as any)[method!](path, await handler('server/api/' + file + '.ts'));
  app.use(router); server.on('request', h3.toNodeListener(app)); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = 'http://127.0.0.1:' + (server.address() as any).port;
  const request = (path: string, body?: unknown, admin = false) => fetch(base + path, { method: body === undefined ? 'GET' : 'POST', headers: { 'content-type': 'application/json', 'x-test-admin': admin ? '1' : '0' }, body: body === undefined ? undefined : JSON.stringify(body) });
  async function ok(r: Response) { const text = await r.text(); assert.equal(r.status, 200, text); return JSON.parse(text); }
  const g1 = await db.spaceGroup.create({ data: { name: 'Лаборатория' } });
  const g2 = await db.spaceGroup.create({ data: { name: 'ОДИС' } });
  const off = await db.spaceGroup.create({ data: { name: 'Отключённая', isActive: false } });
  const resource = await db.accessResource.create({ data: { key: 'test.secret-table', name: 'Не показывать таблицу' } });
  const catalogue = await ok(await request('/groups'));
  assert.deepEqual(catalogue.data, [{ id: g1.id, name: g1.name }, { id: g2.id, name: g2.name }]);
  const body = { fullName: 'Тестовый пользователь', organization: 'Компания', position: 'Инженер', email: 'test@example.test', groupIds: [g1.id, g2.id] };
  for (const groupIds of [[], [off.id], [999999], ['1'], [2147483648]]) assert.equal((await request('/register', { ...body, groupIds })).status, 400);
  assert.equal((await request('/register', { ...body, email: 'employee@avtodor-eng.ru' })).status, 400);
  assert.equal((await request('/register', { ...body, groupIds: undefined, resourceIds: [resource.id] })).status, 400);
  const created = await ok(await request('/register', { ...body, groupIds: [g1.id, g1.id, g2.id] }));
  assert.equal(created.groupsCount, 2);
  const row = await db.registrationRequest.findUniqueOrThrow({ where: { id: created.requestId }, include: { requestedGroups: true, requestedResources: true } });
  assert.equal(row.status, 'EMAIL_PENDING'); assert.equal(row.requestedGroups.length, 2); assert.equal(row.requestedResources.length, 0);
  assert.equal(await db.user.count({ where: { email: body.email } }), 0);
  assert.equal(row.verificationTokenHash, createHash('sha256').update(mails[0].token).digest('hex'));
  assert.equal((await request('/register', body)).status, 409);
  const decisions = { targets: [{ kind: 'GROUP', id: g1.id, approved: true }, { kind: 'GROUP', id: g2.id, approved: false }] };
  const route = '/requests/' + row.id;
  assert.equal((await request(route)).status, 403);
  assert.equal((await request(route + '/review', decisions)).status, 403);
  assert.equal((await request(route + '/review', decisions, true)).status, 409, 'Email must be verified first');
  await db.registrationRequest.update({ where: { id: row.id }, data: { status: 'PENDING_REVIEW', emailVerifiedAt: new Date() } });
  const detail = await ok(await request(route, undefined, true));
  assert.equal(detail.data.targets.length, 2); assert.equal(detail.data.targets[0].kind, 'GROUP');
  const list = await ok(await request('/requests', undefined, true)); assert.equal(list.data[0].resourcesCount, 2);
  assert.equal((await request(route + '/review', { targets: [decisions.targets[0]] }, true)).status, 400);
  assert.equal((await request(route + '/review', { targets: [decisions.targets[0], decisions.targets[0]] }, true)).status, 400);
  assert.equal((await request(route + '/review', { targets: [decisions.targets[0], { kind: 'RESOURCE', id: resource.id, approved: true }] }, true)).status, 400);
  await db.spaceGroup.update({ where: { id: g1.id }, data: { isActive: false } });
  assert.equal((await request(route + '/review', decisions, true)).status, 409);
  await db.spaceGroup.update({ where: { id: g1.id }, data: { isActive: true } });
  assert.equal((await ok(await request(route + '/review', decisions, true))).status, 'PARTIALLY_APPROVED');
  assert.equal((await request(route + '/review', decisions, true)).status, 409);
  assert.equal((await request(route + '/provision', {})).status, 403);
  await db.spaceGroup.update({ where: { id: g1.id }, data: { isActive: false } });
  assert.equal((await request(route + '/provision', {}, true)).status, 409);
  assert.equal(await db.user.count({ where: { email: body.email } }), 0);
  await db.spaceGroup.update({ where: { id: g1.id }, data: { isActive: true } });
  const provisioned = await ok(await request(route + '/provision', {}, true));
  assert.equal(provisioned.groupsCount, 1); assert.equal(provisioned.permissionsCount, 0);
  const account = await db.user.findUniqueOrThrow({ where: { id: provisioned.userId }, include: { spaceGroups: true, permissions: true } });
  assert.equal(account.authType, 'EXTERNAL'); assert.equal(account.status, 'PENDING_ACTIVATION');
  assert.deepEqual(account.spaceGroups.map(g => g.groupId), [g1.id]); assert.equal(account.permissions.length, 0);
  assert.equal(mails[1].kind, 'activate');
  assert.equal((await request(route + '/provision', {}, true)).status, 409);
  // Older requests for individual resources remain reviewable and retain VIEW-only grants.
  const legacy = await db.registrationRequest.create({ data: { fullName: 'Старая заявка', organization: 'Компания', position: 'Инженер', email: 'legacy@example.test', status: 'PENDING_REVIEW', emailVerifiedAt: new Date(), requestedResources: { create: { resourceId: resource.id } } } });
  const oldRoute = '/requests/' + legacy.id;
  assert.equal((await ok(await request(oldRoute, undefined, true))).data.targets[0].kind, 'RESOURCE');
  await ok(await request(oldRoute + '/review', { targets: [{ kind: 'RESOURCE', id: resource.id, approved: true }] }, true));
  const oldUser = await ok(await request(oldRoute + '/provision', {}, true));
  assert.equal(oldUser.groupsCount, 0); assert.equal(oldUser.permissionsCount, 1);
  assert.equal((await db.userPermission.findFirstOrThrow({ where: { userId: oldUser.userId } })).action, 'VIEW');
 } finally {
  server.close(); server.closeAllConnections(); await db.$disconnect();
  for (const f of outputs) await unlink(f).catch(() => {});
 }
});
