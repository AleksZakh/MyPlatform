import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { writeFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { PrismaClient } from '@prisma/client';
import * as h3 from 'h3';
import { createServer } from 'node:http';
import { once } from 'node:events';

test('403 responses and client route denials: targets, owner exclusion, retry dedupe, report', async () => {
  const url=process.env.WORK_TEST_DATABASE_URL||'';
  if(!url || !new URL(url).pathname.endsWith('_work_test'))throw new Error('Disposable *_work_test database required');
  const db=new PrismaClient({datasources:{db:{url}}});
  Object.assign(globalThis,{deniedTestDb:db,defineNitroPlugin:(fn:any)=>fn});
  const output=resolve('tests/statistics/.denied-test.mjs');
  const server=createServer(); const hooks:Record<string,Function>={};
  try {
    const result=await build({stdin:{contents:`export { default as plugin } from './server/plugins/usage'; export { default as collect } from './server/api/statistics/events.post'; export { default as report } from './server/api/admin/statistics/index.get'; export {flushUsage,usageHealth} from './server/services/usage';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,platform:'node',format:'esm',packages:'external',plugins:[{name:'test-context',setup(b){
      b.onResolve({filter:/utils\/prisma$/},()=>({path:'db',namespace:'test'}));
      b.onResolve({filter:/access-control.service$/},()=>({path:'auth',namespace:'test'}));
      b.onResolve({filter:/domain-group-directory.service$/},()=>({path:'ad',namespace:'test'}));
      b.onLoad({filter:/.*/,namespace:'test'},a=>({loader:'js',contents:a.path==='db'?'export const prisma=globalThis.deniedTestDb;':a.path==='ad'?'export async function resolveDomainGroupIds(){return [];}':`export async function getAccessActor(e){if(!e.context.user)throw Object.assign(new Error('Unauthorized'),{statusCode:401});return {user:e.context.user,isSystemAdmin:false};} export async function requirePermission(){throw new Error('Not used');}`}));
    }}]});
    await writeFile(output,result.outputFiles[0]!.text); const m=await import(pathToFileURL(output).href);
    await db.user.createMany({data:[{id:1,login:'zakharov_av',authType:'DOMAIN',status:'ACTIVE'},{id:2,login:'employee',authType:'DOMAIN',status:'ACTIVE'}]});
    await db.accessResource.upsert({where:{key:'test.denied'},create:{key:'test.denied',name:'Тестовый раздел',type:'FEATURE'},update:{}});
    m.plugin({hooks:{hook:(name:string,fn:Function)=>{hooks[name]=fn;}}});
    const app=h3.createApp({debug:false,onAfterResponse:async e=>{await hooks.afterResponse!(e);}});
    app.use(h3.defineEventHandler(async e=>{const id=Number(h3.getHeader(e,'x-test-user'));e.context.user=id?await db.user.findUnique({where:{id}}):null;}));
    const router=h3.createRouter(); router.post('/api/statistics/events',m.collect);router.get('/api/admin/statistics',m.report);
    router.get('/api/admin/guard',h3.defineEventHandler(()=>{throw h3.createError({statusCode:403});}));
    router.get('/api/test/denied',h3.defineEventHandler(e=>{e.context.usageDeniedResource={key:'test.denied',action:'VIEW'};throw h3.createError({statusCode:403});}));
    router.get('/api/work/projects/:id/files/:file',h3.defineEventHandler(()=>{throw h3.createError({statusCode:403});}));
    router.get('/api/test/probe',h3.defineEventHandler(e=>{e.context.usageDeniedResource={key:'test.denied',action:'VIEW'};return {canManage:false};}));
    router.get('/api/test/failure',h3.defineEventHandler(()=>{throw h3.createError({statusCode:500});}));
    app.use(router); server.on('request',h3.toNodeListener(app));server.listen(0,'127.0.0.1');await once(server,'listening');
    const base='http://127.0.0.1:'+(server.address() as any).port;
    const call=(path:string,id=2,options:any={})=>fetch(base+path,{...options,headers:{'x-test-user':String(id),...options.headers}});
    assert.equal((await call('/api/test/probe')).status,200);
    assert.equal((await call('/api/test/failure')).status,500);
    assert.equal(m.usageHealth().pending,0);
    assert.equal((await call('/api/admin/guard?page=/admin/access?token=SECRET')).status,403);
    await call('/api/admin/guard?page=/admin/access?token=SECRET'); // one event within five seconds
    await call('/api/test/denied');
    await call('/api/test/denied',1); // excluded owner
    await call('/api/test/denied',0); // no employee identity
    await call('/api/work/projects/123/files/00000000-0000-4000-8000-000000000001?token=SECRET');
    const send=(target:string,extra={})=>call('/api/statistics/events',2,{method:'POST',headers:{'x-space-work':'1','content-type':'application/json'},body:JSON.stringify({events:[{id:randomUUID(),kind:'ACCESS_DENIED',target,...extra}]})});
    assert.equal((await send('/settings?secret=SECRET')).status,200);
    assert.equal((await send('/profile',{actorId:1})).status,400);
    assert.equal((await send('access:VIEW:test.denied')).status,200); // ignored: client cannot forge resource metadata
    await m.flushUsage();
    const rows=await db.usageEvent.findMany();assert.equal(rows.length,4);
    assert.ok(rows.every(e=>e.actorId===2 && e.kind==='ACCESS_DENIED'));
    assert.ok(!JSON.stringify(rows).includes('SECRET'));assert.ok(!JSON.stringify(rows).includes('00000000-0000'));
    assert.ok(rows.some(e=>e.target==='/admin/access' && e.source==='SERVER'));
    assert.ok(rows.some(e=>e.target==='GET /api/work/projects/:id/files/:id'));
    assert.ok(rows.some(e=>e.target==='/settings' && e.source==='CLIENT'));
    const response=await call('/api/admin/statistics?kind=ACCESS_DENIED',1);assert.equal(response.status,200);
    const report=await response.json();assert.equal(report.summary.denied,4);assert.equal(report.summary.events,4);assert.equal(report.summary.logins,0);
    assert.ok(report.items.some((e:any)=>e.targetLabel==='Тестовый раздел · Просмотр'));
    assert.equal((await call('/api/admin/statistics',2)).status,403);
  } finally {
    await hooks.close?.();server.closeAllConnections();server.close();await db.$disconnect();await unlink(output).catch(()=>{});
  }
});
