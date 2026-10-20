import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { PrismaClient } from '@prisma/client';
import * as h3 from 'h3';
import { createServer } from 'node:http';
import { once } from 'node:events';

test('dashboard aggregates follow user-view and system-admin boundaries', async () => {
  const url=process.env.WORK_TEST_DATABASE_URL||'';
  if(!url || !new URL(url).pathname.endsWith('_work_test'))throw new Error('Disposable *_work_test database required');
  const db=new PrismaClient({datasources:{db:{url}}});
  Object.assign(globalThis,{dashboardTestDb:db});
  const output=resolve('tests/statistics/.dashboard-test.mjs');const server=createServer();
  try {
    const built=await build({entryPoints:['server/api/admin/dashboard.get.ts'],bundle:true,write:false,platform:'node',format:'esm',packages:'external',plugins:[{name:'context',setup(b){
      b.onResolve({filter:/utils\/prisma$/},()=>({path:'db',namespace:'test'}));
      b.onResolve({filter:/access-control.service$/},()=>({path:'auth',namespace:'test'}));
      b.onLoad({filter:/.*/,namespace:'test'},a=>({loader:'js',contents:a.path==='db'?'export const prisma=globalThis.dashboardTestDb;':`export async function requirePermission(e,key,action){const id=Number(e.node.req.headers['x-test-user']);if(!id)throw Object.assign(new Error('Unauthorized'),{statusCode:401});if(![1,2,3].includes(id)||key==='admin.users'&&id===3)throw Object.assign(new Error('Forbidden'),{statusCode:403});return {userId:id,isSystemAdmin:id===1};}`}));
    }}]});
    await writeFile(output,built.outputFiles[0]!.text);const handler=(await import(pathToFileURL(output).href)).default;
    await db.user.createMany({data:[{login:'admin',status:'ACTIVE'},{login:'limited',status:'ACTIVE'},{login:'blocked',status:'BLOCKED'},{login:'pending',status:'PENDING_ACTIVATION'},{login:'disabled',status:'DISABLED'}].map(u=>({...u,status:u.status as any,authType:'DOMAIN' as const}))});
    await db.spaceGroup.createMany({data:[{name:'Active',isActive:true},{name:'Disabled',isActive:false}]});
    await db.department.createMany({data:[{key:'on',name:'Active',isActive:true},{key:'off',name:'Disabled',isActive:false}]});
    await db.registrationRequest.createMany({data:[{fullName:'Applicant',organization:'Test',position:'Tester',email:'one@example.test',status:'PENDING_REVIEW'},{fullName:'Other',organization:'Test',position:'Tester',email:'two@example.test',status:'EMAIL_PENDING'}]});
    const app=h3.createApp({debug:false});app.use('/dashboard',handler);server.on('request',h3.toNodeListener(app));server.listen(0,'127.0.0.1');await once(server,'listening');
    const base='http://127.0.0.1:'+(server.address() as any).port;
    const call=(id:number)=>fetch(base+'/dashboard',{headers:{'x-test-user':String(id)}});
    assert.equal((await call(0)).status,401);assert.equal((await call(4)).status,403);
    const response=await call(1);assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'private, no-store');
    const all=await response.json();assert.deepEqual(all.users,{total:5,active:2,pending:1,blocked:1,disabled:1});
    assert.deepEqual(all.structure,{groups:2,activeGroups:1,departments:1});assert.deepEqual(all.requests,{pending:1});
    assert.ok(!JSON.stringify(all).includes('example.test'));assert.ok(!Object.hasOwn(all,'activity'));
    const delegated=await (await call(2)).json();assert.equal(delegated.users.total,5);assert.equal(delegated.structure,null);assert.equal(delegated.requests,null);
    const minimal=await (await call(3)).json();assert.equal(minimal.users,null);assert.equal(minimal.structure,null);assert.equal(minimal.requests,null);
  } finally { server.closeAllConnections();server.close();await db.$disconnect();await unlink(output).catch(()=>{}); }
});
