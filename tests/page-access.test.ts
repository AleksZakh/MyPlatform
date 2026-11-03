import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { resolve } from 'node:path';

test('Page gate: allowed, denied, query navigation, expired session, unavailable check', async () => {
  const result = await build({
    entryPoints: [resolve('app/middleware/resource-access.global.ts')],
    bundle: true, write: false, format: 'esm', platform: 'node',
    define: { 'import.meta.server': 'true' },
    alias: { '~~': resolve('.') },
  });
  const calls: { url: string; options: any }[] = [];
  let response: any = { allowed: true }, failure: number | null = null;
  const names = ['$fetch', 'defineNuxtRouteMiddleware', 'useRequestHeaders', 'navigateTo'] as const;
  const previous = Object.fromEntries(names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  Object.assign(globalThis, {
    defineNuxtRouteMiddleware: (fn: unknown) => fn,
    useRequestHeaders: () => ({ cookie: 'session=test' }),
    navigateTo: (target: unknown) => ({ redirect: target }),
    $fetch: async (url: string, options: any) => {
      calls.push({ url, options });
      if (failure) throw { statusCode: failure };
      return response;
    },
  });
  try {
    const gate = (await import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0]!.text).toString('base64'))).default;
    const route = (path: string, query = {}) => ({ path, fullPath: path, query });
    assert.equal(await gate(route('/departments/diagnostic')), undefined);
    assert.equal(calls[0]!.options.headers.cookie, 'session=test');
    response = { allowed: false };
    assert.deepEqual(await gate(route('/departments/diagnostic', { module: 'works' })), { redirect: '/access-denied' });
    assert.equal(calls.at(-1)!.options.query.resource, 'diagnostic.works');
    assert.deepEqual(await gate(route('/departments/upts')), { redirect: '/access-denied' });
    assert.equal(calls.at(-1)!.url, '/api/upts/access');
    failure = 401;
    assert.equal((await gate(route('/departments/upts'))).redirect.path, '/login');
    failure = 403;
    assert.deepEqual(await gate(route('/departments/upts')), { redirect: '/access-denied' });
    failure = 503;
    const unavailable = await gate(route('/departments/diagnostic'));
    assert.equal(unavailable.redirect.path, '/access-denied');
    assert.equal(unavailable.redirect.query.reason, 'unavailable');
    const count = calls.length;
    assert.equal(await gate(route('/access-denied')), undefined);
    assert.equal(await gate(route('/projects')), undefined);
    assert.equal(calls.length, count);
  } finally {
    for (const name of names) {
      if (previous[name]) Object.defineProperty(globalThis, name, previous[name]);
      else delete (globalThis as any)[name];
    }
  }
});

test('Admin guard rejects unrelated center viewers before rendering protected tools', async () => {
  const result = await build({
    entryPoints: [resolve('server/api/admin/guard.get.ts')], bundle:true, write:false, format:'esm', platform:'node',
    alias:{'~~':resolve('.')},
    plugins:[{name:'guard-auth',setup(b){
      b.onResolve({filter:/^@prisma\/client$/},()=>({path:'enum',namespace:'mock'}));
      b.onResolve({filter:/(access-control\.service|department-access-guard)$/},()=>({path:'auth',namespace:'mock'}));
      b.onLoad({filter:/.*/,namespace:'mock'},args=>({loader:'js',contents:args.path==='enum'?'export const AccessAction={VIEW:"VIEW"};':`
        export async function getAccessActor(e){return {isSystemAdmin:e.context.admin};}
        export async function requirePermission(){return {userId:1};}
        export async function requireDepartmentManager(e,scope){if(!e.context.admin && e.context.scope!==scope)throw {statusCode:403};}
      `}));
    }}],
  });
  const guard=(await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0]!.text).toString('base64'))).default;
  const event=(page:string,context:any={})=>({path:'/api/admin/guard?page='+encodeURIComponent(page),context});
  for(const page of ['/admin/access','/admin/access-roles','/admin/files','/admin/structure','/admin/registration-requests/5','/admin/export-settings']) {
    await assert.rejects(()=>guard(event(page)),(e:any)=>e.statusCode===403);
    assert.equal((await guard(event(page,{admin:true}))).allowed,true);
  }
  assert.equal((await guard(event('/admin/access',{scope:'diagnostic'}))).allowed,true);
  assert.equal((await guard(event('/admin'))).allowed,true);
});
