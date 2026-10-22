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
 const f=resolve('tests/diagnostic/.generated-'+generated.length+'.mjs');generated.push(f);await writeFile(f,result.outputFiles[0]!.text);return (await import(pathToFileURL(f).href)).default;
}
const body=(extra:any={})=>({number:'ТЕСТ-001',date:'2026-10-22',counterpartyId:1,direction:'INCOME',...extra});
test('Dates, optional values, exact decimals and permissions',()=>{
 assert.equal(contractStatus('2026-10-23',null,'2026-10-22'),'PLANNED');
 assert.equal(contractStatus('2026-10-22',null,'2026-10-22'),'ACTIVE');
 assert.equal(contractStatus('2026-10-22','2026-10-22','2026-10-22'),'COMPLETED');
 assert.equal(contractStatus('2026-10-20','2026-10-21','2026-10-22'),'COMPLETED');
 assert.equal(moscowToday(new Date('2026-10-22T21:01:00Z')),'2026-10-23');
 assert.equal(parseContract(body()).hours,null);assert.equal(parseContract(body({hours:''})).hours,null);
 assert.equal(parseContract(body({hours:'0'})).hours,'0');
 assert.equal(parseContract(body({amount:'1234567890123456.78'})).amount,'1234567890123456.78');
 for(const bad of [{direction:''},{date:'2026-02-30'},{amount:-1},{hours:'abc'},{stages:1.5},{finish:'2026-10-21'}])assert.throws(()=>parseContract(body(bad)));
 assert.equal(normalizeCounterparty('ООО «Тест»'),normalizeCounterparty('ооо "Тест"'));
 assert.notEqual(normalizeCounterparty('Мостоотряд-1'),normalizeCounterparty('Мостоотряд-10'));
 assert.equal(decideAccess({userActive:true,resourceActive:true,systemAdmin:false,direct:true,departmentActive:true,departmentGranted:true,spaceGroupGranted:true,personalDenied:true}).allowed,false);
});
test('HTTP CRUD, live rights, catalogs, audit atomicity, versions, links, trash',async()=>{
 for(const id of [1,2,3])await db.user.create({data:{id,authType:'EXTERNAL',status:'ACTIVE',login:id===1?'admin':'employee'+id,fullName:'Тест '+id}});
 const resource=await db.accessResource.findUniqueOrThrow({where:{key:'diagnostic.contracts'}});
 await db.accessResource.create({data:{key:'admin.users',name:'Admin'}});
 await db.accessResource.create({data:{key:'system.audit-log',name:'Journal'}});
 await db.spaceGroup.create({data:{id:1,name:'ОДИС',users:{create:{userId:2}},permissions:{create:['VIEW','CREATE','UPDATE','DELETE'].map(action=>({resourceId:resource.id,action:action as any}))}}});
 const app=h3.createApp(),router=h3.createRouter();
 for(const [route,method,file] of [
 ['/contracts','get','contracts/index.get.ts'],['/contracts','post','contracts/index.post.ts'],['/contracts/:id','get','contracts/[id].get.ts'],['/contracts/:id','put','contracts/[id].put.ts'],['/contracts/:id','delete','contracts/[id].delete.ts'],['/contracts/:id/restore','post','contracts/[id]/restore.post.ts'],
 ['/catalog','get','catalog.get.ts'],['/counterparties','post','counterparties.post.ts'],['/project-types','post','project-types.post.ts']
 ])(router as any)[method](route,await handler('server/api/diagnostic/'+file));
 router.get('/restrictions/:id',await handler('server/api/admin/users/[id]/diagnostic-restrictions.get.ts'));
 router.put('/restrictions/:id',await handler('server/api/admin/users/[id]/diagnostic-restrictions.put.ts'));
 router.get('/journal',await handler('server/api/admin/audit-log/index.get.ts'));
 app.use(router);const server=createServer(h3.toNodeListener(app));server.listen(0,'127.0.0.1');await once(server,'listening');
 const port=(server.address() as any).port;
 async function call(path:string,method='GET',data?:any,user=2,headers:any={}){return fetch('http://127.0.0.1:'+port+path,{method,headers:{'x-test-user':String(user),'content-type':'application/json','x-space-diagnostic':'1','x-space-access-change':'1',...headers},body:data===undefined?undefined:JSON.stringify(data)});}
 async function ok(r:Response){const data=await r.json();assert.equal(r.status,200,JSON.stringify(data));return data as any;}
 try{
 assert.equal((await call('/contracts','GET',undefined,3)).status,403);
 assert.equal((await call('/contracts','GET',undefined,0)).status,401);
 assert.ok(await db.auditLog.findFirst({where:{category:'ACCESS',result:'DENIED',actorUserId:3,resourceKey:'diagnostic.contracts'}}));
 const party=await ok(await call('/counterparties','POST',{name:'ООО «Тест»'}));assert.equal(party.id,1);
 const same=await ok(await call('/counterparties','POST',{name:'ооо "Тест"'}));assert.equal(party.id,same.id);
 assert.equal((await call('/contracts','POST',body(),2,{'x-space-diagnostic':'0'})).status,403);
 assert.equal((await call('/contracts','POST',body({direction:''}))).status,400);
 const catalog=await ok(await call('/catalog'));assert.equal(catalog.projectTypes.length,8);assert.deepEqual(catalog.supervisors.map((s:any)=>s.id),[2]);
 assert.equal((await call('/contracts','POST',body({supervisorId:3}))).status,400);
 const planned=await ok(await call('/contracts','POST',body({date:'2099-01-01',direction:'INTERNAL',number:'Future'})));assert.equal(planned.status,'PLANNED');
 let a=await ok(await call('/contracts','POST',body({supervisorId:2,note:'Описание'})));
 assert.equal(a.amount,null);assert.equal(a.hours,null);assert.equal(a.buildings,0);assert.equal(a.note,'Описание');
 assert.equal((await ok(await call('/contracts/'+a.id))).number,a.number);
 assert.ok(await db.auditLog.findFirst({where:{entityType:'DiagnosticContract',entityId:a.id,action:'CREATE',actorUserId:2}}));
 await db.auditLog.create({data:{category:'DATA',result:'SUCCESS',action:'CREATE',actorEmail:'test',entityType:'SamplingTest',entityId:999}});
 const journal=await ok(await call('/journal?category=DATA&module=diagnostic','GET',undefined,1));assert.ok(journal.data.length);assert.ok(journal.data.every((r:any)=>r.resourceKey==='diagnostic.contracts'));
 const lab=await ok(await call('/journal?category=DATA&module=lab','GET',undefined,1));assert.equal(lab.data.length,1);
 let updated=await ok(await call('/contracts/'+a.id,'PUT',{...a,amount:'123456.78',hours:'0'}));
 assert.equal(updated.hours,'0');assert.equal(updated.amount,'123456.78');
 assert.equal((await call('/contracts/'+a.id,'PUT',a)).status,409);
 a=updated;
 await db.diagnosticContractStructure.create({data:{contractId:a.id,legacyStructureId:'structure-1'}});
 assert.equal((await ok(await call('/contracts/'+a.id))).buildings,1);
 const expense=await ok(await call('/contracts','POST',body({number:'ТЕСТ-002',direction:'EXPENSE',relatedContractId:a.id})));
 assert.equal((await call('/contracts/'+a.id,'DELETE',{version:a.version})).status,409);
 assert.equal((await call('/contracts/'+a.id,'PUT',{...a,direction:'EXPENSE'})).status,409);
 assert.equal((await call('/contracts/'+a.id,'PUT',{...a,relatedContractId:a.id})).status,400);
 const count=await db.diagnosticContract.count();
 await db.$executeRawUnsafe("CREATE FUNCTION fail_diagnostic_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.\"entityType\"='DiagnosticContract' THEN RAISE EXCEPTION 'test audit failure'; END IF; RETURN NEW; END $$");
 await db.$executeRawUnsafe('CREATE TRIGGER test_audit_failure BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION fail_diagnostic_audit()');
 assert.equal((await call('/contracts','POST',body({number:'Rollback'}))).status,500);
 assert.equal(await db.diagnosticContract.count(),count);
 await db.$executeRawUnsafe('DROP TRIGGER test_audit_failure ON audit_logs');
 let restrictions=await ok(await call('/restrictions/2','GET',undefined,1));
 restrictions=await ok(await call('/restrictions/2','PUT',{...restrictions,actions:['UPDATE']},1));
 assert.equal((await call('/contracts/'+a.id,'PUT',a)).status,403);assert.equal((await call('/contracts')).status,200);
 await ok(await call('/restrictions/2','PUT',{...restrictions,actions:['VIEW']},1));
 assert.equal((await call('/contracts')).status,403);
 await db.userPermissionDeny.deleteMany();
 await ok(await call('/contracts/'+expense.id,'DELETE',{version:expense.version}));
 assert.equal((await call('/contracts/'+expense.id)).status,404);
 const trash=await ok(await call('/contracts?trash=1'));assert.equal(trash.length,1);
 await ok(await call('/contracts/'+expense.id+'/restore','POST',{version:trash[0].version}));
 assert.equal((await call('/contracts/'+expense.id)).status,200);
 await db.spaceGroupUser.delete({where:{groupId_userId:{groupId:1,userId:2}}});
 assert.equal((await call('/contracts')).status,403);
 }finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));await db.$disconnect();for(const f of generated)await unlink(f);}
});
