import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFile,unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {PrismaClient} from '@prisma/client';
import * as h3 from 'h3';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {contractStatus,moscowToday,normalizeCounterparty} from '../../shared/utils/diagnostic-contracts';
import {matchesContract} from '../../shared/utils/diagnostic-contract-search';
import {parseContract} from '../../server/services/diagnostic/input';
import {decideAccess} from '../../shared/utils/access-decision';
const url=process.env.DIAGNOSTIC_TEST_DATABASE_URL||'';
if(!url||!new URL(url).pathname.endsWith('_diagnostic_test'))throw Error('Disposable *_diagnostic_test database required');
const db=new PrismaClient({datasources:{db:{url}}});
Object.assign(globalThis,h3,{diagnosticTestDb:db,getUserSession:async(e:any)=>({user:{id:Number(e.node.req.headers['x-test-user']||0)}}),useRuntimeConfig:()=>({adminLogins:['admin']})});
const generated:string[]=[];
async function handler(file:string){
 const result=await build({entryPoints:[file],bundle:true,write:false,platform:'node',format:'esm',packages:'external',alias:{'~~':process.cwd()},plugins:[{name:'test-db',setup(b){
 b.onResolve({filter:/(?:utils\/prisma|^\.\/prisma)$/},()=>({path:'db',namespace:'test'}));
 b.onResolve({filter:/domain-group-directory.service$/},()=>({path:'ad',namespace:'test'}));
 b.onResolve({filter:/usage-denied$/},()=>({path:'usage',namespace:'test'}));
 b.onLoad({filter:/.*/,namespace:'test'},args=>({loader:'js',contents:args.path==='db'?'export const prisma=globalThis.diagnosticTestDb;':args.path==='ad'?'export async function resolveDomainGroupIds(){return []} export async function directoryGroupUserIds(){return []}':'export function recordAuditedDenial(){}'}));
 }}]});
 const f=resolve('tests/access/.generated-'+generated.length+'.mjs');generated.push(f);await writeFile(f,result.outputFiles[0]!.text);return (await import(pathToFileURL(f).href)).default;
}
import {liveRoles,scopeChanges,roleOf} from '../../shared/access/live-policy';
test('Live department access: legacy grants, delegation, batch atomicity, inheritance and denies',async()=>{
 for(const id of [1,2,3,4,5])await db.user.create({data:{id,authType:'EXTERNAL',status:id===5?'DISABLED':'ACTIVE',login:id===1?'admin':'employee'+id,fullName:'Тест '+id}});
 const table1=await db.accessResource.create({data:{key:'lab.materials',name:'Материалы',type:'TABLE'}});
 const table2=await db.accessResource.create({data:{key:'lab.receipts',name:'Поступления',type:'TABLE'}});
 for(const key of ['admin.center','admin.users','system.audit-log','lab.event-journal','lab.incoming-control.edit-lock-override'])await db.accessResource.create({data:{key,name:key,type:'FEATURE'}});
 const diagnostic=await db.accessResource.findUniqueOrThrow({where:{key:'diagnostic.contracts'}});
 await db.spaceGroup.create({data:{id:1,name:'Лаборатория',users:{create:{userId:3}},permissions:{create:{resourceId:table1.id,action:'VIEW'}}}});
 await db.userPermission.create({data:{userId:3,resourceId:table1.id,action:'UPDATE'}});
 await db.userPermission.create({data:{userId:3,resourceId:diagnostic.id,action:'VIEW'}});
 await db.userPermissionDeny.create({data:{userId:3,resourceId:table1.id,action:'UPDATE'}});
 const app=h3.createApp(),router=h3.createRouter();
 for(const [route,method,file] of [['/metadata','get','departments.get.ts'],['/subjects','get','subjects.get.ts'],['/snapshot','get','department.get.ts'],['/plan','post','department-plan.post.ts'],['/apply','post','department-apply.post.ts']]) (router as any)[method](route,await handler('server/api/admin/access/'+file));
 router.get('/guard',await handler('server/api/admin/guard.get.ts'));
 router.get('/navigation',await handler('server/api/navigation.get.ts'));
 app.use(router);const server=createServer(h3.toNodeListener(app));server.listen(0,'127.0.0.1');await once(server,'listening');const port=(server.address() as any).port;
 async function call(path:string,method='GET',data?:any,user=1,extra:any={}){return fetch('http://127.0.0.1:'+port+path,{method,headers:{'x-test-user':String(user),'content-type':'application/json','x-space-access-change':'1',...extra},body:data===undefined?undefined:JSON.stringify(data)});}
 async function ok(r:Response){const d=await r.json();assert.equal(r.status,200,JSON.stringify(d));return d as any;}
 const request=(ids=[3],role=1,kind='user')=>({scope:'lab',kind,ids,rights:{...liveRoles[role]!.rights},denied:null});
 async function planApply(input:any,user=1){const p=await ok(await call('/plan','POST',input,user));await ok(await call('/apply','POST',{...input,revisions:Object.fromEntries(p.subjects.map((s:any)=>[s.id,s.revision]))},user));return p;}
 try{
 assert.equal((await call('/metadata','GET',undefined,0)).status,401);
 assert.equal((await call('/snapshot?scope=lab&kind=user&id=3','GET',undefined,4)).status,403);
 const before=await ok(await call('/snapshot?scope=lab&kind=user&id=3'));
 assert.equal(roleOf(before),'Индивидуальный набор');assert.equal(before.denied.length,1);assert.equal(before.data.some((r:any)=>r.key.startsWith('diagnostic')),false);
 const countBefore=await db.userPermission.count();await ok(await call('/plan','POST',request()));assert.equal(await db.userPermission.count(),countBefore);
 await planApply(request([2],3)); // Real delegated department administrator.
 assert.equal((await ok(await call('/metadata','GET',undefined,2))).scopes.length,1);
 assert.equal((await call('/guard?page=/admin/access','GET',undefined,2)).status,200);
 assert.equal((await call('/guard?page=/admin/users','GET',undefined,2)).status,403);
 const navigation=await ok(await call('/navigation','GET',undefined,2));assert.ok(navigation.tools.some((t:any)=>t.to==='/admin/access'));assert.ok(!navigation.tools.some((t:any)=>t.to==='/admin/structure?tab=groups'));
 assert.equal((await call('/subjects?scope=lab&kind=spaceGroup','GET',undefined,2)).status,200);
 assert.equal((await call('/subjects?scope=diagnostic&kind=user','GET',undefined,2)).status,403);
 assert.equal((await call('/plan','POST',{...request(),scope:'diagnostic'},2)).status,403);
 assert.equal((await call('/plan','POST',request([1]),2)).status,400);
 await db.department.create({data:{id:1,key:'laboratory',name:'Лаборатория'}});
 await db.domainGroup.create({data:{id:1,directoryObjectId:'test-domain-group',name:'Лабораторная группа AD',distinguishedName:'CN=test'}});
 await planApply(request([1],0,'department'),2);
 assert.equal(await db.departmentPermission.count({where:{departmentId:1,resourceId:table1.id,action:'VIEW'}}),1);
 await planApply(request([1],1,'domainGroup'),2);
 assert.equal(await db.domainGroupPermission.count({where:{domainGroupId:1,resourceId:table2.id,action:'UPDATE'}}),1);
 await planApply(request([1],1,'spaceGroup'),2);
 const inherited=await ok(await call('/snapshot?scope=lab&kind=user&id=3','GET',undefined,2));
 assert.equal(inherited.data.find((r:any)=>r.id===table2.id).actions.UPDATE.effectiveGranted,true);
 assert.equal(inherited.data.find((r:any)=>r.id===table1.id).actions.UPDATE.blockedBy,'PERSONAL_DENY');
 await planApply(request([3],0),2);assert.equal(await db.userPermission.count({where:{userId:3,resourceId:diagnostic.id}}),1);assert.equal(await db.userPermissionDeny.count({where:{userId:3}}),1);
 await planApply({...request([3],0),denied:['VIEW']},2);
 const denied=await ok(await call('/snapshot?scope=lab&kind=user&id=3'));assert.ok(denied.data.every((r:any)=>!r.actions.VIEW.effectiveGranted));
 await planApply({...request([3],0),denied:[]},2);assert.equal(await db.userPermissionDeny.count({where:{userId:3}}),0);
 // Stale batch must roll back every target, not just the one with a conflict.
 const input=request([3,4],1),p=await ok(await call('/plan','POST',input));const prior=await db.userPermission.findMany({where:{userId:3},orderBy:{id:'asc'}});
 await db.userPermission.create({data:{userId:4,resourceId:table2.id,action:'VIEW'}});
 assert.equal((await call('/apply','POST',{...input,revisions:Object.fromEntries(p.subjects.map((s:any)=>[s.id,s.revision]))})).status,409);
 assert.deepEqual(await db.userPermission.findMany({where:{userId:3},orderBy:{id:'asc'}}),prior);
 assert.equal((await call('/plan','POST',request([5]))).status,400);
 assert.equal((await call('/plan','POST',request(),1,{'sec-fetch-site':'cross-site'})).status,403);
 // Audit failure must roll back grants and personal denies together.
 const batch={...request([4],3),denied:['DELETE']};const pb=await ok(await call('/plan','POST',batch));
 const existing=await db.userPermission.findMany({where:{userId:4}});
 await db.$executeRawUnsafe(`CREATE FUNCTION reject_access_audit() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'test audit failure'; END; $$ LANGUAGE plpgsql`);
 await db.$executeRawUnsafe(`CREATE TRIGGER reject_access_audit BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION reject_access_audit()`);
 assert.equal((await call('/apply','POST',{...batch,revisions:Object.fromEntries(pb.subjects.map((s:any)=>[s.id,s.revision]))})).status,500);
 assert.deepEqual(await db.userPermission.findMany({where:{userId:4}}),existing);assert.equal(await db.userPermissionDeny.count({where:{userId:4}}),0);
 await db.$executeRawUnsafe('DROP TRIGGER reject_access_audit ON audit_logs');
 assert.ok(await db.auditLog.findFirst({where:{resourceKey:'lab.access-admin',category:'ADMIN',actorUserId:2}}));
 // Revocation of the delegated role is effective immediately.
 const manager=await db.accessResource.findUniqueOrThrow({where:{key:'lab.access-admin'}});await db.userPermission.deleteMany({where:{userId:2,resourceId:manager.id}});
 assert.equal((await call('/plan','POST',request(),2)).status,403);
 }finally{server.close();await db.$disconnect();for(const f of generated)await unlink(f).catch(()=>{});}
});
