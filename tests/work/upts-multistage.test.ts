import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile, rm, lstat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { build } from 'esbuild';
import { PrismaClient } from '@prisma/client';
import ExcelJS from 'exceljs';
import * as h3 from 'h3';
import { taskSummary, filterUpts } from '../../shared/utils/upts';

const url = process.env.WORK_TEST_DATABASE_URL || '';
if (!url || !new URL(url).pathname.endsWith('_work_test'))
  throw new Error('Use a disposable *_work_test database');
const storage = process.env.WORK_PROJECT_FILES_ROOT || '';
if (!storage.includes('space-project-files-test-'))
  throw new Error('Use disposable space-project-files-test- storage');
const db = new PrismaClient({ datasources: { db: { url } } });
Object.assign(globalThis, h3, { workTestDb: db, useRuntimeConfig: () => ({ adminLogins: ['admin'] }) });
const generated: string[] = [];
async function handler(file: string) {
  const out = await build({
    entryPoints: [file],
    bundle: true,
    write: false,
    platform: 'node',
    format: 'esm',
    packages: 'external',
    plugins: [
      {
        name: 'upts-test-context',
        setup(b) {
          b.onResolve({filter:/chat\/invitations$/},()=>({path:'mail',namespace:'test'}));
          b.onResolve({filter:/invitation-mail$/},()=>({path:'mail',namespace:'test'}));
          b.onResolve({ filter: /domain-group-directory.service$/ }, () => ({
            path: 'groups',
            namespace: 'test',
          }));
          b.onResolve({ filter: /access-control.service$/ }, () => ({
            path: 'auth',
            namespace: 'test',
          }));
          b.onResolve({ filter: /(?:utils\/prisma|^\.\/prisma)$/ }, () => ({
            path: 'db',
            namespace: 'test',
          }));
          b.onLoad({ filter: /.*/, namespace: 'test' }, (args) => ({
            loader: 'js',
            contents:
              args.path === 'db'
                ? 'export const prisma=globalThis.workTestDb;'
                : args.path === 'mail'
                  ? 'export async function provisionInvitationContact(){throw new Error("No external calls in tests");} export async function inviteDomainContact(){throw new Error("No mail in tests");} export async function notifyActiveProjectInvite(){throw new Error("No mail in tests");}'
                : args.path === 'groups'
                  ? 'export async function resolveDomainGroupIds(){return [];} export async function directoryGroupUserIds(){return [];}'
                  : `
 export async function getAccessActor(e){const id=Number(e.node.req.headers['x-test-user']);if(!id)throw Object.assign(new Error('auth'),{statusCode:401});const user=await globalThis.workTestDb.user.findUnique({where:{id},include:{department:true}});if(!user||user.status!=='ACTIVE')throw Object.assign(new Error('inactive'),{statusCode:403});return {user,isSystemAdmin:id===6};}
 export async function requirePermission(e){const a=await getAccessActor(e);if(a.user.id!==2)throw Object.assign(new Error('denied'),{statusCode:403});return {userId:a.user.id};}
 `,
          }));
        },
      },
    ],
  });
  const filename = resolve(
    'tests/work/.upts-multistage-test-' + generated.length + '.mjs',
  );
  generated.push(filename);
  await writeFile(filename, out.outputFiles[0]!.text);
  return (await import(pathToFileURL(filename).href)).default;
}
test('UPTS stage batches: creation, append, atomic editing, schedules, identity and linear OKS',async()=>{
 const app=h3.createApp({debug:false}),router=h3.createRouter(),server=createServer(h3.toNodeListener(app));
 try{
  const dep=await db.department.create({data:{key:'upts',name:'УПТС'}});
  await db.user.createMany({data:[2,3,4,6].map(id=>({id,login:'object-'+id,status:'ACTIVE',authType:'EXTERNAL',departmentId:[2,3].includes(id)?dep.id:null}))});
  const routes=[['/overview/:contractId','upts/contracts/[contractId]/overview.get','get'],['/stage-works/:contractId','upts/contracts/[contractId]/works.get','get'],['/lib','upts/library/index.get','get'],['/works/:workId','upts/library/works/[workId].put','put'],['/templates','upts/library/templates.post','post'],['/contracts','upts/contracts/index.post','post'],['/contracts/:contractId/works','upts/contracts/[contractId]/works.post','post'],['/upts','upts/index.get','get'],['/export','upts/export.get','get'],['/projects/:id/contracts/:contractId','upts/projects/[id]/contracts/[contractId].put','put']];
  for(const [path,file,method]of routes)(router as any)[method!](path,await handler('server/api/'+file+'.ts'));
  app.use(router);server.listen(0,'127.0.0.1');await once(server,'listening');
  const base='http://127.0.0.1:'+(server.address() as any).port;
  const request=(path:string,user=2,method='GET',body?:unknown)=>fetch(base+path,{method,headers:{'x-test-user':String(user),'x-space-work':'1','content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  async function ok(r:Response){const text=await r.text();assert.equal(r.status,200,text);return JSON.parse(text);}
  const lib=await ok(await request('/lib'));

  const batch=(key:string,number:number,limit?:number)=>({stageNumber:number,workKindKey:key,startDate:'2026-11-17',endDate:'2026-12-01',selectedWorks:lib.templates.find((t:any)=>t.workKindKey===key).items.slice(0,limit).map((i:any)=>({id:i.work.id,version:i.work.version}))});
  const input={clientKey:randomUUID(),number:'STAGES',name:'Много этапов',counterparty:'',signedDate:null,dueDate:null,contractType:'LAND',objectDetails:{engineerId:3,curatorId:2},templateId:null,templateVersion:null,manualWorks:[],stageBatches:[batch('LAND_DIVISION',1),batch('LAND_CHANGE',2),batch('LAND_RIGHT',3)]};
  const c=await ok(await request('/contracts',2,'POST',input));assert.equal(c.objectDetails.stageCount,3);assert.equal(c.objectDetails.stages.length,3);
  const tasks=await db.workTask.findMany({where:{uptsContractId:c.id},orderBy:{id:'asc'}});assert.equal(tasks.length,19);assert(tasks.every(t=>t.assigneeId===3));
  assert.deepEqual(tasks.map(t=>(t.uptsWorkMeta as any).stageNumber),[...Array(10).fill(1),...Array(6).fill(2),...Array(3).fill(3)]);
  assert.deepEqual(tasks.map(t=>(t.uptsWorkMeta as any).workKindKey),[...Array(10).fill('LAND_DIVISION'),...Array(6).fill('LAND_CHANGE'),...Array(3).fill('LAND_RIGHT')]);
  const common=tasks.find(t=>(t.uptsWorkMeta as any).stageNumber===2&&tasks.some(a=>(a.uptsWorkMeta as any).stageNumber===1&&(a.uptsWorkMeta as any).definitionId===(t.uptsWorkMeta as any).definitionId));assert(common,'shared definitions in different kinds remain separate works');
  assert.equal((await ok(await request('/contracts',2,'POST',input))).id,c.id);assert.equal(await db.workTask.count({where:{uptsContractId:c.id}}),19);
  assert.equal((await request('/contracts',2,'POST',{...input,stageBatches:[batch('LAND_DIVISION',1)]})).status,409);
  for(const bad of [
    {stageBatches:[batch('LAND_DIVISION',2)]},
    {stageBatches:[batch('LAND_DIVISION',1),batch('LAND_CHANGE',1)]},
    {stageBatches:[{...batch('LAND_DIVISION',1),startDate:'2026-12-02'}]},
    {stageBatches:[{...batch('LAND_DIVISION',1),startDate:'2026-02-31'}]},
    {stageBatches:[batch('OKS_DIVISION',1)]},
    {stageBatches:[{...batch('LAND_DIVISION',1),selectedWorks:[]}]},
    {stageBatches:[{...batch('LAND_DIVISION',1),selectedWorks:[{id:batch('OKS_DIVISION',1).selectedWorks[0].id,version:1}]}]},
  ]){const before=await db.uptsContract.count();const r=await request('/contracts',2,'POST',{...input,clientKey:randomUUID(),...bad});assert([400,409].includes(r.status),await r.text());assert.equal(await db.uptsContract.count(),before);}
  await db.workTask.update({where:{id:tasks[0]!.id},data:{status:'DONE',uptsWorkMeta:{...tasks[0]!.uptsWorkMeta as any,resultText:'Сохранённый результат',completedAt:'2026-11-17T10:00:00Z'}}});
  const preserved=await db.workTask.findUniqueOrThrow({where:{id:tasks[0]!.id}});
  const apply={clientKey:randomUUID(),contractVersion:c.version,templateId:null,templateVersion:null,manualWorks:[],stageBatches:[batch('LAND_USE',4),batch('LAND_TECH_ERROR',5)]};
  assert.equal((await request(`/contracts/${c.id}/works`,3,'POST',apply)).status,403);
  await ok(await request(`/contracts/${c.id}/works`,2,'POST',apply));await ok(await request(`/contracts/${c.id}/works`,2,'POST',apply));
  assert.equal(await db.workTask.count({where:{uptsContractId:c.id}}),25);
  assert.deepEqual(await db.workTask.findUniqueOrThrow({where:{id:tasks[0]!.id}}),preserved);
  assert.equal((await request(`/contracts/${c.id}/works`,2,'POST',{...apply,clientKey:randomUUID()})).status,409);
  let current=await db.uptsContract.findUniqueOrThrow({where:{id:c.id}});assert.equal((current.objectDetails as any).stages[4].number,5);
  const edit={clientKey:current.clientKey,version:current.version,number:current.number,name:current.name,counterparty:'',signedDate:null,dueDate:null,contractType:'LAND',objectDetails:{...current.objectDetails as any,stages:(current.objectDetails as any).stages.map((s:any)=>({...s,startDate:'2026-11-18'}))},stageBatches:[batch('LAND_REGISTER_ERROR',6)]};
  const edited=await ok(await request(`/projects/${c.projectId}/contracts/${c.id}`,2,'PUT',edit));assert.equal(edited.objectDetails.stageCount,6);assert.equal(edited.objectDetails.stages[0].startDate,'2026-11-18');assert.equal(await db.workTask.count({where:{uptsContractId:c.id}}),29);
  assert.deepEqual(await db.workTask.findUniqueOrThrow({where:{id:tasks[0]!.id}}),preserved);
  assert.equal((await request(`/projects/${c.projectId}/contracts/${c.id}`,2,'PUT',edit)).status,409);assert.equal(await db.workTask.count({where:{uptsContractId:c.id}}),29);
  const before=await db.uptsContract.findUniqueOrThrow({where:{id:c.id}});
  const badEdit={...edit,version:before.version,number:'Не должен сохраниться',objectDetails:before.objectDetails,stageBatches:[{...batch('LAND_FORMATION',7),selectedWorks:[{...batch('LAND_FORMATION',7).selectedWorks[0],version:999}]}]};
  assert.equal((await request(`/projects/${c.projectId}/contracts/${c.id}`,2,'PUT',badEdit)).status,409);assert.deepEqual(await db.uptsContract.findUniqueOrThrow({where:{id:c.id}}),before);
  const overview=await ok(await request('/overview/'+c.id));assert.equal(overview.object.objectDetails.stages.length,6);assert.equal(overview.tasks[0].uptsWorkMeta.resultText,'Сохранённый результат');
  assert(await db.auditLog.count({where:{entityType:'UptsContract',entityId:c.id,action:'APPLY'}}));assert.equal(await db.uptsNotification.count({where:{task:{uptsContractId:c.id}}}),29);
  // Duplicate kinds are rejected in one request and against saved tasks/metadata.
  const duplicates={...input,clientKey:randomUUID(),stageBatches:[batch('LAND_DIVISION',1),batch('LAND_DIVISION',2)]};
  assert.equal((await request('/contracts',2,'POST',duplicates)).status,400);
  const fresh=await db.uptsContract.findUniqueOrThrow({where:{id:c.id}});
  const duplicateAppend={...apply,clientKey:randomUUID(),contractVersion:fresh.version,stageBatches:[batch('LAND_DIVISION',7)]};
  assert.equal((await request(`/contracts/${c.id}/works`,2,'POST',duplicateAppend)).status,400);
  assert.equal((await request(`/projects/${c.projectId}/contracts/${c.id}`,2,'PUT',{...edit,version:fresh.version,objectDetails:fresh.objectDetails,stageBatches:[batch('LAND_DIVISION',7)]})).status,400);
  assert.equal(await db.workTask.count({where:{uptsContractId:c.id}}),29);
  // Saved repeats from previous releases remain editable; only new repetitions are blocked.
  const legacyDetails={...fresh.objectDetails as any,stageCount:55,stages:[...(fresh.objectDetails as any).stages,{number:55,workKindKey:'LAND_DIVISION',startDate:null,endDate:null}]};
  await db.uptsContract.update({where:{id:c.id},data:{objectDetails:legacyDetails}});
  const {stageBatches:omitted,...legacyEdit}=edit;
  const kept=await ok(await request(`/projects/${c.projectId}/contracts/${c.id}`,2,'PUT',{...legacyEdit,version:fresh.version,objectDetails:legacyDetails}));assert.equal(kept.objectDetails.stageCount,55);
  // Legacy objects keep their original type and area; linear OKS uses a distinct value.
  const oks=await ok(await request('/contracts',2,'POST',{...input,clientKey:randomUUID(),number:'Линейный',contractType:'OKS',objectDetails:{engineerId:3,oksKind:'LINEAR',sourceLength:'12,5',sourceArea:'250'},stageBatches:[batch('OKS_FORMATION',1)]}));
  assert.equal(oks.contractType,'OKS');assert.equal(oks.objectDetails.sourceLength,'12,5');assert.equal(oks.objectDetails.sourceArea,'250');
  const {objectTypeName,objectMeasureLabel,objectMeasureValue}=await import('../../shared/utils/upts-object-stages');
  assert.equal(objectMeasureValue('OKS',oks.objectDetails),'12,5');assert.equal(objectMeasureLabel('OKS',oks.objectDetails),'Протяжённость, км');assert(objectTypeName('OKS',{}).includes('площ.'));assert.equal(objectMeasureValue('OKS',{sourceArea:'250'}),'250');
  const invalidLength=await request('/contracts',2,'POST',{...input,clientKey:randomUUID(),contractType:'OKS',objectDetails:{oksKind:'LINEAR',sourceLength:'-1'},stageBatches:[batch('OKS_FORMATION',1)]});assert.equal(invalidLength.status,400);
 }finally{server.closeAllConnections();server.close();await db.$disconnect();for(const f of generated)await rm(f,{force:true});await rm(storage,{recursive:true,force:true});}
});
