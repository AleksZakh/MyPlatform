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
import { usagePage } from '../../shared/usage';
const url=process.env.WORK_TEST_DATABASE_URL||'';
if(!url||!new URL(url).pathname.endsWith('_work_test'))throw new Error('Disposable *_work_test database required');
const db=new PrismaClient({datasources:{db:{url}}});Object.assign(globalThis,{statisticsTestDb:db});

test('statistics: authenticated identity, allowlist, permissions, dedupe, retention and nonblocking retry', async()=>{
 const output=resolve('tests/statistics/.usage-test.mjs');const server=createServer();
 try{
 const compiled=await build({stdin:{contents:`export {default as collect} from './server/api/statistics/events.post'; export {default as report} from './server/api/admin/statistics/index.get'; export * from './server/services/usage';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,platform:'node',format:'esm',packages:'external',plugins:[{name:'isolated-context',setup(b){
 b.onResolve({filter:/domain-group-directory.service$/},()=>({path:'groups',namespace:'isolated'}));
 b.onResolve({filter:/utils\/prisma$/},()=>({path:'db',namespace:'isolated'}));b.onResolve({filter:/access-control.service$/},()=>({path:'auth',namespace:'isolated'}));b.onLoad({filter:/.*/,namespace:'isolated'},a=>({loader:'js',contents:a.path==='db'?`export const prisma=new Proxy(globalThis.statisticsTestDb,{get(t,k){const v=Reflect.get(t,k);return k==='usageEvent'?new Proxy(v,{get(d,p){if(p==='createMany'&&globalThis.statFail)return async()=>{throw new Error('DB offline')};return Reflect.get(d,p);}}):v;}});`:a.path==='groups'?'export async function resolveDomainGroupIds(){return [];}':`export async function getAccessActor(e){const id=Number(e.node.req.headers['x-test-user']);if(!id)throw Object.assign(new Error('auth'),{statusCode:401});const user=await globalThis.statisticsTestDb.user.findUnique({where:{id}});if(!user||user.status!=='ACTIVE')throw Object.assign(new Error('inactive'),{statusCode:403});return {user,isSystemAdmin:true};} export async function requirePermission(e,key,action){const actor=await getAccessActor(e);if(key!=='system.usage-statistics'||action!=='VIEW'||actor.user.id!==1)throw Object.assign(new Error('denied'),{statusCode:403});return actor;}`}));
 }}]});await writeFile(output,compiled.outputFiles[0]!.text);const m=await import(pathToFileURL(output).href);
 await db.user.createMany({data:[{id:1,login:'zakharov_av',fullName:'Администратор',status:'ACTIVE',authType:'DOMAIN'},{id:2,login:'sender',fullName:'Отправитель',status:'ACTIVE',authType:'DOMAIN'},{id:3,login:'recipient',fullName:'Получатель',status:'ACTIVE',authType:'DOMAIN'},{id:4,login:'another-admin',status:'ACTIVE',authType:'DOMAIN'},{id:5,login:'ZAKHAROV_AV',status:'ACTIVE',authType:'EXTERNAL'}]});
 await db.usageEvent.create({data:{id:'expired',actorId:2,kind:'PAGE',target:'/',source:'CLIENT',occurredAt:new Date(Date.now()-100*86400000)}});
 const app=h3.createApp({debug:false}),router=h3.createRouter();app.use(h3.defineEventHandler(e=>{if(e.node.req.headers['x-revoked'])e.context.externalSessionRevoked=true;}));router.post('/events',m.collect);router.get('/report',m.report);app.use(router);server.on('request',h3.toNodeListener(app));server.listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+(server.address() as any).port;
 async function send(events:any[],user=2,extra:Record<string,string>={}){return fetch(base+'/events',{method:'POST',headers:{'x-test-user':String(user),'x-space-work':'1','content-type':'application/json',...extra},body:JSON.stringify({events})});}
 const page={id:randomUUID(),kind:'PAGE',target:'/library?token=SECRET'};
 assert.equal((await send([page],0)).status,401);assert.equal((await send([page],2,{'x-revoked':'1'})).status,401);
 assert.equal((await send([page],2,{'x-space-work':'0'})).status,403);
 assert.equal((await send([{...page,actorId:1}])).status,400);
 assert.equal((await send([{...page,kind:'LOGIN'}])).status,400);
 assert.equal((await send(Array.from({length:26},()=>page))).status,400);
 assert.equal((await send([page],1)).status,200);assert.equal(m.usageHealth().pending,0,'Owner browser events excluded');
 assert.equal((await send([page])).status,200);
 assert.equal((await send([page])).status,200);
 await send([{id:randomUUID(),kind:'CLICK',target:'constructor'},{id:randomUUID(),kind:'VIDEO_PLAY',target:'-'.repeat(36)}]);
 assert.equal(m.usageHealth().pending,1);assert.equal(await db.usageEvent.count(),1,'collector never waits for insert');
 m.recordUsage({id:'message:10',actorId:2,recipientId:3,kind:'MESSAGE',target:'conversation:7'});
 m.recordUsage({id:'message:10',actorId:2,recipientId:3,kind:'MESSAGE',target:'conversation:7'});
 await m.flushUsage();assert.equal(m.usageHealth().pending,0);assert.equal(await db.usageEvent.count(),2);assert.equal(await db.usageEvent.count({where:{id:'expired'}}),0);
 const stored=await db.usageEvent.findMany();assert.ok(!JSON.stringify(stored).includes('SECRET'));assert.ok(stored.every(e=>e.actorId===2));
 assert.equal((await fetch(base+'/report',{headers:{'x-test-user':'2'}})).status,403);
 assert.equal((await fetch(base+'/report?kind=constructor',{headers:{'x-test-user':'1'}})).status,400);
 let response=await fetch(base+'/report',{headers:{'x-test-user':'1'}});assert.equal(response.status,200,await response.clone().text());let report=await response.json();assert.equal(report.summary.events,2);assert.equal(report.summary.users,1);assert.equal(report.items.find((e:any)=>e.kind==='MESSAGE').recipientName,'Получатель');assert.equal(report.items.find((e:any)=>e.kind==='PAGE').targetLabel,'Библиотека');assert.equal(report.items.find((e:any)=>e.kind==='PAGE').source,'CLIENT');assert.match(report.daily[0].day,/^\d{2}\.\d{2}\.\d{4}$/);
 response=await fetch(base+'/report?actorId=3',{headers:{'x-test-user':'1'}});assert.equal((await response.json()).summary.events,0);
 // A database outage cannot reject a business action: record only queues, flush retries later.
 Object.assign(globalThis,{statFail:true});
 assert.doesNotThrow(()=>m.recordUsage({id:'message:11',actorId:2,kind:'MESSAGE',target:'conversation:7'}));await m.flushUsage();assert.equal(m.usageHealth().pending,1);assert.ok(m.usageHealth().lastErrorAt);
 Object.assign(globalThis,{statFail:false});await m.flushUsage();assert.equal(m.usageHealth().pending,0);assert.equal(await db.usageEvent.count(),3);
 // Existing owner activity must be invisible in every report, even with actorId forced.
 await db.usageEvent.create({data:{id:'owner-legacy',actorId:1,kind:'LOGIN',target:'kerberos',source:'SERVER'}});
 for(const kind of ['LOGIN','LOGOUT','MESSAGE','MAIL','DOCUMENT','VIDEO'])m.recordUsage({actorId:1,kind,target:'owner-only'});
 await m.flushUsage();assert.equal(await db.usageEvent.count({where:{actorId:1}}),1,'New owner events never persisted');
 response=await fetch(base+'/report',{headers:{'x-test-user':'1'}});report=await response.json();assert.equal(report.summary.events,3);assert.equal(report.summary.logins,0);assert.ok(report.items.every((e:any)=>e.actorId!==1));assert.ok(report.popular.every((e:any)=>e.target!=='kerberos'));assert.equal(report.daily.reduce((n:number,d:any)=>n+d.events,0),3);
 response=await fetch(base+'/report?actorId=1',{headers:{'x-test-user':'1'}});report=await response.json();assert.equal(report.summary.events,0);assert.equal(report.items.length,0);assert.equal(report.daily.length,0);assert.equal(report.popular.length,0);
 for(const id of [2,4,5])assert.equal((await fetch(base+'/report',{headers:{'x-test-user':String(id)}})).status,403,'Other admins and external logins cannot read statistics');
 assert.equal((await fetch(base+'/report',{headers:{'x-test-user':'1','x-revoked':'1'}})).status,401);
 const count=m.usageHealth().pending;process.env.SPACE_STATISTICS_ENABLED='0';m.recordUsage({actorId:2,kind:'PAGE',target:'/'});assert.equal(m.usageHealth().pending,count);delete process.env.SPACE_STATISTICS_ENABLED;
 for(let i=0;i<130;i++)m.recordUsage({actorId:3,kind:'PAGE',target:'/',source:'CLIENT'});assert.equal(m.usageHealth().pending,120);assert.ok(m.usageHealth().dropped>=10);
 assert.equal(usagePage('/profile?secret=hidden'),'/profile');assert.equal(usagePage('/reset-password?token=secret'),null);assert.equal(usagePage('/departments/lab'),'/departments/lab');
 }finally{server.closeAllConnections();server.close();await db.$disconnect();await unlink(output).catch(()=>{});}
});
