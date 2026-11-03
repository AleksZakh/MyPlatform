import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { writeFile, rm } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { createApp, createRouter, toNodeListener, defineEventHandler } from 'h3';

test('UPTS page/API share admin, department, Space/AD membership and revoke on next request', async () => {
  const state: any = { user: { id: 1, login: 'employee', status: 'ACTIVE', authType: 'LOCAL', directoryObjectId: null, department: null }, groups: [], domain: [], ids: [], directoryFailure: false, lookups: 0 };
  const db: any = {
    user: { findUnique: async () => state.user },
    spaceGroupDomain: { count: async () => 0 },
    spaceGroup: { findMany: async ({ where }: any) => state.groups.filter((g: any) => {
      if (!g.isActive) return false;
      if (where.domainGroups) return g.linked.length > 0;
      const id = where.OR?.[0]?.users?.some?.userId;
      const ids = where.OR?.[1]?.domainGroups?.some?.domainGroup?.directoryObjectId?.in || [];
      return g.users.includes(id) || g.linked.some((guid: string) => ids.includes(guid) && state.domain.some((d: any) => d.directoryObjectId === guid && d.isActive));
    }) },
    domainGroup: { findMany: async ({ where }: any) => state.domain.filter((g: any) => g.isActive && (!where.directoryObjectId || where.directoryObjectId.in.includes(g.directoryObjectId))) },
    workProject: { findFirst: async ({ where }: any) => where.AND ? null : ({ id: 7, ownerId: 1, scope: 'TEAM', members: [], archivedAt: null }) },
  };
  Object.assign(globalThis, {
    __uptsTest: { state, db },
    getUserSession: async (event: any) => ({ user: { id: Number(event.node.req.headers['x-test-user'] || 1) } }),
    useRuntimeConfig: () => ({ adminLogins: ['admin'] }),
  });
  const filename = resolve('tests/.upts-access-bundle.mjs');
  const output = await build({ stdin: { contents: `
    export { default as gate } from './server/api/upts/access.get';
    export { default as version } from './server/api/app/version.get';
    export { uptsActor } from './server/services/upts-access';
    export { workActor } from './server/services/work/access';
    export { visibleProject } from './server/services/work/service';
    export { hasUptsMembership } from './server/services/upts-membership';
  `, resolveDir: process.cwd(), loader: 'ts' }, bundle: true, write: false, format: 'esm', platform: 'node', packages: 'external', plugins: [{ name: 'boundaries', setup(b) {
    b.onResolve({ filter: /utils\/prisma$/ }, () => ({ path: 'db', namespace: 'fixture' }));
    b.onResolve({ filter: /domain-group-directory\.service$/ }, () => ({ path: 'ad', namespace: 'fixture' }));
    b.onResolve({ filter: /utils\/auditLog$/ }, () => ({ path: 'audit', namespace: 'fixture' }));
    b.onResolve({ filter: /file-storage$/ }, () => ({ path: 'storage', namespace: 'fixture' }));
    b.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path }) => ({ loader: 'js', contents:
      path === 'db' ? 'export const prisma=globalThis.__uptsTest.db;' :
      path === 'ad' ? `export async function resolveDomainGroupIds(){const s=globalThis.__uptsTest.state;s.lookups++;if(s.directoryFailure)throw Error('AD offline');return s.ids;}` :
      path === 'audit' ? 'export async function auditDenied(){}; export async function writeAuditEvent(){};' :
      'export async function ensureProjectDirectory(){};' }));
  } }] });
  await writeFile(filename, output.outputFiles[0]!.text);
  const api = await import(pathToFileURL(filename).href);
  const app = createApp(), router = createRouter(), server = createServer(toNodeListener(app));
  router.get('/access', api.gate); router.get('/version', api.version);
  router.get('/data', defineEventHandler(async e => { await api.uptsActor(e); return { ok: true }; }));
  router.get('/project', defineEventHandler(async e => api.visibleProject(db, 7, await api.workActor(e))));
  app.use(router); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = 'http://127.0.0.1:' + (server.address() as any).port;
  const req = (path = '/access', id = 1) => fetch(base + path, { headers: { 'x-test-user': String(id) } });
  const allowed = async () => (await (await req()).json()).allowed;
  const group = (name = 'УПТС') => ({ name, isActive: true, users: [1], linked: [] });
  try {
    assert.equal((await req('/access', 0)).status, 401);
    assert.equal(await allowed(), false); assert.equal((await req('/data')).status, 403);
    state.user.login = 'admin'; assert.equal(await allowed(), true);
    assert.equal((await req('/data')).status, 200); assert.equal((await req('/project')).status, 200);
    state.user.status = 'DISABLED'; assert.equal((await req()).status, 403);
    state.user.status = 'ACTIVE'; state.user.login = 'employee';
    state.user.department = { key: 'upts', name: 'УПТС', isActive: true }; assert.equal(await allowed(), true);
    state.user.department.isActive = false; assert.equal(await allowed(), false); state.user.department = null;
    state.groups = [group()]; assert.equal(await allowed(), true);
    const response = await req(); assert.match(response.headers.get('cache-control')!, /no-store/);
    assert.equal((await req('/data')).status, 200); assert.equal((await req('/project')).status, 200);
    state.groups[0].users = []; assert.equal(await allowed(), false); assert.equal((await req('/project')).status, 404);
    state.groups = [group('Поддержка УПТС')]; assert.equal(await allowed(), false);
    state.groups = [group()]; state.groups[0].isActive = false; assert.equal(await allowed(), false);
    state.user.authType = 'DOMAIN'; state.user.directoryObjectId = 'user-guid';
    state.groups = [{ ...group(), users: [], linked: ['group-guid'] }];
    state.domain = [{ name: 'AD-engineers', isActive: true, directoryObjectId: 'group-guid' }];
    state.ids = ['group-guid']; assert.equal(await allowed(), true); assert.ok(state.lookups > 0);
    state.domain[0].isActive = false; assert.equal(await allowed(), false);
    state.groups = []; state.domain = [{ name: 'УПТС', isActive: true, directoryObjectId: 'group-guid' }];
    assert.equal(await allowed(), true);
    state.ids = []; assert.equal(await allowed(), false);
    state.directoryFailure = true; assert.equal((await req()).status, 503); assert.equal((await req('/data')).status, 503);
    state.groups = [group()]; assert.equal(await allowed(), true);
    state.groups = []; state.user.login = 'admin'; assert.equal(await allowed(), true);
    state.user.status = 'DISABLED'; assert.equal((await req('/version')).status, 403);
    state.user.status = 'ACTIVE'; state.user.login = 'employee';
    const version = await req('/version'); assert.equal(version.status, 200); assert.match(version.headers.get('cache-control')!, /no-store/);
    assert.equal((await version.json()).application, 'Space / MyPlatform');
    assert.equal((await req('/version', 0)).status, 401);
    assert.equal(await api.hasUptsMembership(db, { ...state.user, status: 'DISABLED' }, true), false);
    state.groups = [group()];
    assert.equal(await api.hasUptsMembership(db, { ...state.user, status: 'PENDING_ACTIVATION' }, false), false);
    assert.equal(await api.hasUptsMembership(db, { ...state.user, status: 'PENDING_ACTIVATION' }, false, [], true), true);
  } finally {
    server.closeAllConnections(); server.close(); await rm(filename, { force: true });
    delete (globalThis as any).__uptsTest;
  }
});
