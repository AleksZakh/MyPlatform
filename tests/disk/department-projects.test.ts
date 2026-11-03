import test from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { build } from 'esbuild';
import { randomUUID } from 'node:crypto';
import { writeFile,rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createApp,createRouter,toNodeListener } from 'h3';
import { createServer } from 'node:http';
import { once } from 'node:events';
const url=process.env.WORK_TEST_DATABASE_URL;
if(url&&!new URL(url).pathname.endsWith('_work_test'))throw Error('Disposable *_work_test database required');
test('Department project browser respects project visibility, contract boundaries and private file ownership',{skip:!url},async()=>{
 const db=new PrismaClient({datasources:{db:{url}}});(globalThis as any).__catalogProjectDb=db;
 const file=resolve('tests/disk/.department-projects.mjs');const app=createApp(),router=createRouter(),server=createServer(toNodeListener(app));
 try{
  await db.user.createMany({data:[{id:1,login:'admin'},{id:2,login:'owner'},{id:3,login:'other'}].map(u=>({...u,status:'ACTIVE',authType:'EXTERNAL'}))});
  const p=await db.workProject.create({data:{clientKey:randomUUID(),name:'Проект УПТС',ownerId:2,scope:'TEAM',upts:{create:{projectType:'OTHER',status:'INTAKE',basis:'',initiator:''}}}});
  const contract=await db.uptsContract.create({data:{projectId:p.id,clientKey:randomUUID(),name:'Договор',number:'1',counterparty:''}});
  await db.workProjectFile.createMany({data:[{scope:'SHARED',ownerId:2,name:'shared.pdf'},{scope:'PRIVATE',ownerId:1,name:'mine.pdf'},{scope:'PRIVATE',ownerId:3,name:'private-other.pdf'}].map(f=>({...f,id:randomUUID(),clientKey:randomUUID(),projectId:p.id,contractId:contract.id,size:42,sha256:'0'.repeat(64),storageKey:randomUUID()}))});
  const out=await build({entryPoints:['server/api/admin/files/departments/projects.get.ts'],bundle:true,write:false,format:'esm',platform:'node',packages:'external',plugins:[{name:'fixtures',setup(b){
   b.onResolve({filter:/utils\/prisma$/},()=>({path:'db',namespace:'fixture'}));b.onResolve({filter:/access-control\.service$/},()=>({path:'auth',namespace:'fixture'}));b.onResolve({filter:/domain-group-directory\.service$/},()=>({path:'ad',namespace:'fixture'}));b.onResolve({filter:/utils\/auditLog$/},()=>({path:'audit',namespace:'fixture'}));
   b.onLoad({filter:/.*/,namespace:'fixture'},({path})=>({loader:'js',contents:path==='db'?'export const prisma=globalThis.__catalogProjectDb;':path==='auth'?`export async function getAccessActor(e){const id=Number(e.node.req.headers['x-user']);if(!id)throw Object.assign(Error('auth'),{statusCode:401});return {user:await globalThis.__catalogProjectDb.user.findUnique({where:{id},include:{department:true}}),isSystemAdmin:id===1};}export async function requirePermission(){}`:path==='ad'?'export async function resolveDomainGroupIds(){return [];}':'export async function writeAuditEvent(){};export async function auditDenied(){};'}));
  }}]});await writeFile(file,out.outputFiles[0]!.text);router.get('/projects',(await import(pathToFileURL(file).href)).default);app.use(router);server.listen(0,'127.0.0.1');await once(server,'listening');
  const base='http://127.0.0.1:'+(server.address() as any).port+'/projects?department=upts';const req=(extra='',user=1)=>fetch(base+extra,{headers:{'x-user':String(user)}});
  assert.equal((await req('',2)).status,403);assert.equal((await req('',0)).status,401);
  assert.deepEqual((await (await req()).json()).items,[]);assert.equal((await req('&projectId='+p.id)).status,404);
  await db.workProjectMember.create({data:{projectId:p.id,userId:1,role:'OBSERVER'}});
  assert.equal((await (await req()).json()).items.length,1);
  const folder=await (await req('&projectId='+p.id)).json();assert.equal(folder.items[0].kind,'contract');
  const files=await (await req('&projectId='+p.id+'&contractId='+contract.id)).json();assert.deepEqual(files.items.map((f:any)=>f.name).sort(),['mine.pdf','shared.pdf']);
  assert.equal((await req('&projectId='+p.id+'&contractId=999')).status,404);
  await db.workProjectMember.delete({where:{projectId_userId:{projectId:p.id,userId:1}}});assert.equal((await req('&projectId='+p.id)).status,404);
 }finally{server.closeAllConnections();server.close();await db.$disconnect();await rm(file,{force:true});delete (globalThis as any).__catalogProjectDb;}
});
