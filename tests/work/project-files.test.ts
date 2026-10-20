import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile,writeFile,unlink,lstat,readdir,symlink,rm }  from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { PrismaClient } from '@prisma/client';
import * as h3 from 'h3';
import {createServer,request as httpRequest} from 'node:http';import {once} from 'node:events';
import { timeBucket, shiftDay, portalToday } from '../../shared/utils/work-board';
import { taskInput } from '../../server/services/work/input';
const url=process.env.WORK_TEST_DATABASE_URL||'';
if(!url||!new URL(url).pathname.endsWith('_work_test'))throw new Error('Disposable *_work_test database required');
const db=new PrismaClient({datasources:{db:{url}}});Object.assign(globalThis,h3,{workTestDb:db});
const generated:string[]=[];
Object.assign(globalThis,{workTestDirectory:new Map(),workTestMails:[],workTestAdGroupIds:[],workTestMailFail:false});

async function handler(file:string,exportName='default'){const out=await build({entryPoints:[file],bundle:true,write:false,platform:'node',format:'esm',packages:'external',plugins:[{name:'test-context',setup(b){
 b.onResolve({filter:/chat-invitation-mail$/},()=>({path:'mail',namespace:'team-test'}));
 b.onResolve({filter:/ad-directory.service$/},()=>({path:'directory',namespace:'team-test'}));
 b.onResolve({filter:/domain-group-directory.service$/},()=>({path:'groups',namespace:'team-test'}));
 b.onLoad({filter:/.*/,namespace:'team-test'},args=>({loader:'js',contents:args.path==='mail'?`export async function sendChatInvitationEmail(...args){if(globalThis.workTestMailFail)throw new Error('SMTP unavailable');globalThis.workTestMails.push(args);}`:args.path==='groups'?`export async function directoryGroupUserIds(){return globalThis.workTestAdGroupIds;} export async function resolveDomainGroupIds(){if(globalThis.workTestGroupFail)throw new Error('AD unavailable');return globalThis.workTestActorGroups||[];}`:`export async function findDomainUser(login){return globalThis.workTestDirectory.get(login)||null;}`}));
 b.onResolve({filter:/access-control.service$/},()=>({path:'auth',namespace:'test'}));b.onResolve({filter:/utils\/prisma$/},()=>({path:'db',namespace:'test'}));
 b.onLoad({filter:/.*/,namespace:'test'},args=>({loader:'js',contents:args.path==='db'?'export const prisma=globalThis.workTestDb;':`
 export async function getAccessActor(e){const id=Number(e.node.req.headers['x-test-user']);if(!id)throw Object.assign(new Error('auth'),{statusCode:401});const user=await globalThis.workTestDb.user.findUnique({where:{id},include:{department:true}});if(!user||user.status!=='ACTIVE')throw Object.assign(new Error('inactive'),{statusCode:403});return {user,isSystemAdmin:id===1};}
 export async function requirePermission(e,key,action){const a=await getAccessActor(e);if(![1,2].includes(a.user.id))throw Object.assign(new Error('denied'),{statusCode:403});return {userId:a.user.id};}
 `}));}}]});const fileOut=resolve('tests/work/.files-test-'+generated.length+'.mjs');generated.push(fileOut);await writeFile(fileOut,out.outputFiles[0]!.text);return (await import(pathToFileURL(fileOut).href))[exportName];}

test('project files: private isolation, project access, uploads, trash, archive, revocation and storage', async () => {
 const storage=process.env.WORK_PROJECT_FILES_ROOT!;
 assert.ok(storage && storage.includes('space-project-files-test-'),'Disposable storage required');
 const app=h3.createApp({debug:false}),router=h3.createRouter(),server=createServer(h3.toNodeListener(app));
 try {
  await db.department.createMany({data:[{id:1,key:'it',name:'IT'},{id:2,key:'lab',name:'Lab'}]});
  await db.user.createMany({data:[{id:1,login:'admin',departmentId:2},{id:2,login:'owner',departmentId:1},{id:3,login:'member',departmentId:1},{id:4,login:'stranger',departmentId:2},{id:5,login:'observer',departmentId:2},{id:6,login:'manager',departmentId:1}].map(u=>({...u,status:'ACTIVE',authType:'DOMAIN'})) as any});
  const routes=[['/projects','projects/index.post','post'],['/projects/:id','projects/[id].put','put'],['/projects/:id/files','projects/[id]/files/index.get','get'],['/projects/:id/files','projects/[id]/files/index.post','post'],['/projects/:id/files/:fileId','projects/[id]/files/[fileId].get','get'],['/projects/:id/files/:fileId','projects/[id]/files/[fileId].head','head'],['/projects/:id/files/:fileId','projects/[id]/files/[fileId].patch','patch']];
  for(const[route,file,method]of routes)(router as any)[method!](route,await handler('server/api/work/'+file+'.ts'));
  app.use(router);server.listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+(server.address() as any).port;
  async function request(path:string,user=2,method='GET',body?:unknown){return fetch(base+path,{method,headers:{'x-test-user':String(user),'x-space-work':'1','content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});}
  async function ok(r:Response){const text=await r.text();assert.equal(r.status,200,text);return JSON.parse(text);}
  const input={clientKey:randomUUID(),name:'Проект с файлами',description:'',color:'#2563eb',scope:'TEAM',departmentId:null,groupId:null,startDate:null,dueDate:null};
  let p=await ok(await request('/projects',2,'POST',input));const route='/projects/'+p.id+'/files';
  assert.ok((await lstat(storage+'/'+p.id+'/shared')).isDirectory());assert.ok((await lstat(storage+'/'+p.id+'/private')).isDirectory());
  await db.workProjectMember.createMany({data:[{projectId:p.id,userId:3,role:'MEMBER'},{projectId:p.id,userId:5,role:'OBSERVER'},{projectId:p.id,userId:6,role:'MANAGER'}]});
  function upload(user=3,scope='SHARED',name='Чертёж.pdf',body='file-data',key=randomUUID(),extra:Record<string,string>={}){return fetch(base+route,{method:'POST',headers:{'x-test-user':String(user),'x-space-work':'1','content-type':'application/octet-stream','x-file-name':encodeURIComponent(name),'x-file-scope':scope,'x-file-key':key,'x-file-size':String(Buffer.byteLength(body)),...extra},body});}
  assert.equal((await request(route,0)).status,401);
  for(const user of [1,4])assert.equal((await request(route,user)).status,404);
  assert.equal((await upload(5)).status,403);assert.equal((await upload(3,'SHARED','a','abc',randomUUID(),{'x-space-work':'0'})).status,403);
  assert.equal((await upload(3,'SHARED','../escape')).status,400);
  assert.equal((await upload(3,'SHARED','empty','')).status,400);
  assert.equal((await upload(3,'SHARED','big','x'.repeat(1025))).status,413);
  assert.equal((await upload(3,'SHARED','size','abc',randomUUID(),{'x-file-size':'5'})).status,400);
  const key=randomUUID(),shared=await ok(await upload(3,'SHARED','Общие документы.pdf','file-data',key));
  assert.equal((await ok(await upload(3,'SHARED','Общие документы.pdf','file-data',key))).id,shared.id);
  assert.equal(await db.workProjectFile.count(),1);
  assert.equal((await upload(6,'SHARED','Общие документы.pdf','file-data',key)).status,409);
  const personal=await ok(await upload(3,'PRIVATE','Секрет.html','<script>private</script>'));
  const observerPrivate=await ok(await upload(5,'PRIVATE','Наблюдения.txt'));
  assert.ok(observerPrivate.id);
  for(const user of [2,5,6]){
   assert.equal((await request(route+'/'+personal.id,user)).status,404);
   assert.equal((await request(route+'/'+personal.id,user,'HEAD')).status,404);
   assert.equal((await request(route+'/'+personal.id,user,'PATCH',{version:1,deleted:true})).status,404);
   const files=await ok(await request(route+'?scope=PRIVATE',user));assert.ok(files.items.every((f:any)=>f.ownerId===user));
  }
  let response=await request(route+'/'+personal.id,3);assert.equal(response.status,200);assert.equal(await response.text(),'<script>private</script>');
  assert.equal(response.headers.get('content-type'),'application/octet-stream');assert.match(response.headers.get('content-disposition')||'',/^attachment;/);assert.match(response.headers.get('cache-control')||'',/no-store/);assert.equal(response.headers.get('x-content-type-options'),'nosniff');
  for(const user of [2,3,5,6]){response=await request(route+'/'+shared.id,user);assert.equal(response.status,200);assert.equal(await response.text(),'file-data');}
  response=await request(route+'/'+shared.id,5,'HEAD');assert.equal(response.status,200);assert.equal(response.headers.get('content-length'),'9');assert.equal(await response.text(),'');
  const files=await ok(await request(route,5));assert.equal(files.total,1);assert.equal(files.items[0].storageKey,undefined);assert.equal(files.items[0].sha256,undefined);assert.equal(files.canUpload,false);
  assert.equal((await request(route+'/'+shared.id,5,'PATCH',{version:1,deleted:true})).status,403);
  let trashed=await ok(await request(route+'/'+shared.id,6,'PATCH',{version:1,deleted:true}));assert.ok(trashed.deletedAt);
  assert.equal((await request(route+'/'+shared.id,3)).status,404);assert.equal((await ok(await request(route+'?trash=1',3))).total,1);
  assert.equal((await request(route+'/'+shared.id,3,'PATCH',{version:1,deleted:false})).status,409);
  await ok(await request(route+'/'+shared.id,3,'PATCH',{version:trashed.version,deleted:false}));
  const record=await db.workProjectFile.findUniqueOrThrow({where:{id:personal.id}});
  const path=storage+'/'+p.id+'/private/3/'+record.storageKey;assert.equal(await readFile(path,'utf8'),'<script>private</script>');
  p=await ok(await request('/projects/'+p.id,2,'PUT',{...input,name:'Переименованный проект',version:p.version}));assert.equal(await readFile(path,'utf8'),'<script>private</script>');
  await db.workProject.update({where:{id:p.id},data:{archivedAt:new Date()}});
  assert.equal((await upload(3,'PRIVATE')).status,403);assert.equal((await request(route+'/'+personal.id,3)).status,200);assert.equal((await request(route+'/'+personal.id,3,'PATCH',{version:1,deleted:true})).status,403);
  await db.workProject.update({where:{id:p.id},data:{archivedAt:null}});
  await db.workProjectMember.delete({where:{projectId_userId:{projectId:p.id,userId:3}}});
  assert.equal((await request(route+'/'+personal.id,3)).status,404);assert.equal((await request(route+'/'+shared.id,3)).status,404);
  assert.equal((await request(route+'/'+personal.id,2)).status,404);
  await db.workProjectMember.create({data:{projectId:p.id,userId:3,role:'MEMBER'}});
  // Archive while body is in flight: authorization is rechecked before commit.
  const slowKey=randomUUID();
  const slowResponse=new Promise<number>((resolve,reject)=>{
   const req=httpRequest(base+route,{method:'POST',headers:{'x-test-user':'3','x-space-work':'1','content-type':'application/octet-stream','x-file-name':'slow.txt','x-file-key':slowKey,'x-file-scope':'PRIVATE','x-file-size':'6','content-length':'6'}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode!));});
   req.on('error',reject);req.write('abc');
   (async()=>{
    const folder=storage+'/'+p.id+'/private/3';
    const before=await readdir(folder);let observed=false;
    for(let attempt=0;attempt<100;attempt++){
     const names=await readdir(folder);
     if(names.length>before.length){observed=true;break;}
     await new Promise(r=>setTimeout(r,10));
    }
    assert.ok(observed,'Upload reached disk before archive');
    await db.workProject.update({where:{id:p.id},data:{archivedAt:new Date()}});req.end('def');
   })().catch(e=>{req.destroy();reject(e);});
  });
  assert.equal(await slowResponse,403);assert.equal(await db.workProjectFile.count({where:{clientKey:slowKey}}),0);
  await db.workProject.update({where:{id:p.id},data:{archivedAt:null}});
  // Different projects never share URLs or metadata, even for the same owner.
  const p2=await ok(await request('/projects',2,'POST',{...input,clientKey:randomUUID()}));
  assert.equal((await request('/projects/'+p2.id+'/files/'+shared.id,2)).status,404);
  // Department readers get shared documents, never someone else's private documents or write access.
  await db.workProject.update({where:{id:p.id},data:{scope:'DEPARTMENT',departmentId:1}});
  await db.workProjectMember.delete({where:{projectId_userId:{projectId:p.id,userId:3}}});
  assert.equal((await request(route+'/'+shared.id,3)).status,200);assert.equal((await upload(3)).status,403);
  // A symlink can never make an unrelated file downloadable.
  await unlink(path);await symlink('/etc/hostname',path);assert.equal((await request(route+'/'+personal.id,3)).status,404);
  const logs=await db.auditLog.findMany({where:{entityType:'WorkProjectFile'}});assert.ok(logs.length>=5);assert.ok(!JSON.stringify(logs).includes('Секрет.html'));
  assert.equal((await lstat(storage+'/'+p.id+'/shared')).mode&0o007,0);
 }finally{server.closeAllConnections();server.close();await db.$disconnect();await Promise.all(generated.map(p=>unlink(p).catch(()=>{})));}
});
