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
    'tests/work/.upts-objects-test-' + generated.length + '.mjs',
  );
  generated.push(filename);
  await writeFile(filename, out.outputFiles[0]!.text);
  return (await import(pathToFileURL(filename).href)).default;
}
test('UPTS object card, work kinds matrix, role/result snapshots and protected access',async()=>{
 const app=h3.createApp({debug:false}),router=h3.createRouter(),server=createServer(h3.toNodeListener(app));
 try{
  const dep=await db.department.create({data:{key:'upts',name:'УПТС'}});
  await db.user.createMany({data:[2,3,4,6].map(id=>({id,login:'object-'+id,status:'ACTIVE',authType:'EXTERNAL',departmentId:[2,3].includes(id)?dep.id:null}))});
  const routes=[['/stage-works/:contractId','upts/contracts/[contractId]/works.get','get'],['/lib','upts/library/index.get','get'],['/works/:workId','upts/library/works/[workId].put','put'],['/templates','upts/library/templates.post','post'],['/contracts','upts/contracts/index.post','post'],['/contracts/:contractId/works','upts/contracts/[contractId]/works.post','post'],['/upts','upts/index.get','get'],['/export','upts/export.get','get'],['/projects/:id/contracts/:contractId','upts/projects/[id]/contracts/[contractId].put','put']];
  for(const [path,file,method]of routes)(router as any)[method!](path,await handler('server/api/'+file+'.ts'));
  app.use(router);server.listen(0,'127.0.0.1');await once(server,'listening');
  const base='http://127.0.0.1:'+(server.address() as any).port;
  const request=(path:string,user=2,method='GET',body?:unknown)=>fetch(base+path,{method,headers:{'x-test-user':String(user),'x-space-work':'1','content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  async function ok(r:Response){const text=await r.text();assert.equal(r.status,200,text);return JSON.parse(text);}
  const lib=await ok(await request('/lib'));
  const template=lib.templates.find((t:any)=>t.workKindKey==='LAND_DIVISION');
  assert.deepEqual(template.items.map((i:any)=>i.work.name),['Кадастровая съемка','Запрос сведений ЕГРН','Подготовка схемы на КПТ','Выпуск распоряжения ФДА об утверждении схемы','Подготовка МП','Подача в РР и получение выписки','Выпуск распоряжения ФДА о предоставлении в аренду ГК','Подготовка комплекта на предоставление в аренду ГК','Регистрация договора аренды','Подготовка акта закрытия работ']);
  const counts={LAND:[10,10,6,3,3,3,4],OKS:[7,7,6,3,4,3,4],ZOUIT:[6,6],IPE:[4],MARKS:[2]};
  for(const [type,numbers]of Object.entries(counts))assert.deepEqual(lib.templates.filter((t:any)=>t.contractType===type&&t.active).map((t:any)=>t.items.length),numbers);
  assert(lib.templates.filter((t:any)=>t.active).every((t:any)=>t.workKindKey));
  assert(!lib.templates.some((t:any)=>t.active&&t.contractType==='OTHER'));
  const details={workStartDate:'2026-11-01',stageCount:3,basisContractNumber:'УРИ-2023-857',basisContractDate:'2023-04-28',road:'М-12',stage:'Этап 2',rightHolders:['Организация А','Организация Б'],region:'Московская область',dealType:'Аренда',sourceCadastralNumber:'50:01:0000000:1',sourceArea:'1200,5',rightKind:'Собственность',permittedUses:['Автомобильные дороги'],accountingType:'Первичный учёт',kuvdEntries:[{number:'КУВД-1',date:'2026-11-05'},{number:'КУВД-2',date:null}],curatorId:2,engineerId:3,workKindKey:'LAND_DIVISION',otherDescription:''};
  const body={workStages:[1,1,2,2,2,3,3,3,3,3],clientKey:randomUUID(),number:'УСЛ-1',name:'Участок у развязки',counterparty:'',signedDate:null,dueDate:null,contractType:'LAND',objectDetails:details,templateId:template.id,templateVersion:template.version,manualWorks:[]};
  assert.equal((await request('/contracts',2,'POST',{...body,objectDetails:{...details,workKindKey:'OKS_DIVISION'}})).status,400);
  assert.equal((await request('/contracts',2,'POST',{...body,objectDetails:{...details,engineerId:4}})).status,400);
  assert.equal((await request('/contracts',2,'POST',{...body,objectDetails:{...details,sourceArea:'-1'}})).status,400);
  assert.equal((await request('/contracts',2,'POST',{...body,objectDetails:{...details,kuvdEntries:[{number:'X',date:'2026-02-31'}]}})).status,400);
  assert.equal((await request('/contracts',2,'POST',{...body,objectDetails:{...details,basisContractDate:'2026-02-31'}})).status,400);
  for(const stageCount of [0,-1,1.5,'3',2147483648])assert.equal((await request('/contracts',2,'POST',{...body,objectDetails:{...details,stageCount}})).status,400);
  assert.equal((await request('/contracts',2,'POST',{...body,objectDetails:{...details,workStartDate:'2026-02-31'}})).status,400);
  assert.equal((await request('/contracts',2,'POST',{...body,dueDate:'2026-10-31'})).status,400);
  assert.equal((await request('/contracts',2,'POST',{...body,workStages:[1]})).status,400);
  assert.equal((await request('/contracts',2,'POST',{...body,workStages:body.workStages.map(()=>4)})).status,400);
  const c=await ok(await request('/contracts',2,'POST',body));assert.deepEqual(c.objectDetails,details);
  const auditCount=await db.auditLog.count();assert.equal((await ok(await request('/contracts',2,'POST',body))).id,c.id);assert.equal(await db.auditLog.count(),auditCount);
  assert.equal((await request('/contracts',2,'POST',{...body,workStages:body.workStages.map(()=>1)})).status,409);
  const tasks=await db.workTask.findMany({where:{uptsContractId:c.id},orderBy:{id:'asc'}});assert.equal(tasks.length,10);
  assert.deepEqual(tasks[2]!.uptsWorkMeta,{stageNumber:2,definitionId:template.items[2].workId,workKindKey:'LAND_DIVISION',responsibleRole:'ENGINEER',expectedResult:'схема на КПТ'});
  assert(tasks.every(t=>t.assigneeId===null),'No automatic assignments or completion logic in this UI phase');
  const snapshot=await ok(await request('/upts?q='+encodeURIComponent('М-12')));assert.equal(snapshot.projects[0].upts.contracts[0].id,c.id);assert.equal(snapshot.tasks.length,10);assert.equal(snapshot.tasks[2].uptsWorkMeta.expectedResult,'схема на КПТ');
  assert.equal((await request('/upts',4)).status,403);
  const stageRows=await ok(await request('/stage-works/'+c.id));assert.equal(stageRows.tasks.length,10);assert.equal(stageRows.tasks[2].uptsWorkMeta.stageNumber,2);
  assert.equal((await request('/stage-works/'+c.id,3)).status,403);
  assert.equal((await request('/stage-works/'+c.id,4)).status,403);
  const path=`/projects/${c.projectId}/contracts/${c.id}`;
  const edit={...body,version:c.version};delete (edit as any).templateId;delete (edit as any).templateVersion;delete (edit as any).manualWorks;delete (edit as any).workStages;
  assert.equal((await request(path,3,'PUT',edit)).status,403,'Department visibility does not grant editing');
  assert.equal((await request(path,2,'PUT',{...edit,dueDate:'2026-10-31'})).status,400);
  const withoutDetails={...edit,dueDate:'2026-10-31'};delete (withoutDetails as any).objectDetails;
  assert.equal((await request(path,2,'PUT',withoutDetails)).status,400);
  const updated=await ok(await request(path,2,'PUT',{...edit,taskStages:[{id:tasks[0]!.id,version:tasks[0]!.version,stageNumber:3},{id:tasks[1]!.id,version:tasks[1]!.version,stageNumber:2}],objectDetails:{...details,stage:'Этап 3',curatorId:3,engineerId:2}}));assert.equal(updated.objectDetails.stage,'Этап 3');
  assert.equal((await request(path,2,'PUT',edit)).status,409);
  assert.equal(((await db.workTask.findUniqueOrThrow({where:{id:tasks[0]!.id}})).uptsWorkMeta as any).stageNumber,3);
  assert.equal((await request(path,2,'PUT',{...edit,version:updated.version,taskStages:[{id:tasks[0]!.id,version:tasks[0]!.version,stageNumber:2}]})).status,409);
  assert.equal((await request(path,2,'PUT',{...edit,version:updated.version,objectDetails:{...details,stageCount:2}})).status,400);
  assert.equal((await request(path,2,'PUT',{...edit,version:updated.version,taskStages:[{id:999999,version:1,stageNumber:1}]})).status,400);
  assert.equal((await db.uptsContract.findUniqueOrThrow({where:{id:c.id}})).version,updated.version,'Failed assignments must not partially save');
  const taskAudit=await db.auditLog.findFirstOrThrow({where:{entityType:'WorkTask',entityId:tasks[0]!.id,action:'UPDATE'}});assert.equal((taskAudit.afterData as any).uptsWorkMeta.stageNumber,3);

  const audit=await db.auditLog.findFirstOrThrow({where:{entityType:'UptsContract',entityId:c.id,action:'UPDATE'}});assert.equal((audit.afterData as any).objectDetails.stage,'Этап 3');
  // Optional details omitted by an older client never erase the new card.
  const legacy={...edit,version:updated.version};delete (legacy as any).objectDetails;
  const preserved=await ok(await request(path,2,'PUT',legacy));assert.equal(preserved.objectDetails.stage,'Этап 3');
  const w=template.items[2].work;
  await ok(await request('/works/'+w.id,2,'PUT',{clientKey:randomUUID(),version:w.version,name:w.name,contractType:'LAND',active:true,responsibleRole:'CURATOR',expectedResult:'Уточнённый результат'}));
  assert.equal((await db.workTask.findUniqueOrThrow({where:{id:tasks[2]!.id}})).uptsWorkMeta && ((await db.workTask.findUniqueOrThrow({where:{id:tasks[2]!.id}})).uptsWorkMeta as any).expectedResult,'схема на КПТ','Existing work keeps the source snapshot');
  const badTemplate={clientKey:randomUUID(),name:'Неверная связка',contractType:'LAND',active:true,workKindKey:'OKS_DIVISION',workIds:[w.id]};assert.equal((await request('/templates',2,'POST',badTemplate)).status,400);
  const apply={workStages:[2],clientKey:randomUUID(),contractVersion:preserved.version,templateId:null,templateVersion:null,manualWorks:[],workKindKey:'LAND_DIVISION',selectedWorks:[{id:w.id,version:w.version+1}]};
  assert.equal((await request(`/contracts/${c.id}/works`,2,'POST',{...apply,workStages:[4]})).status,400);
  await ok(await request(`/contracts/${c.id}/works`,2,'POST',apply));
  await ok(await request(`/contracts/${c.id}/works`,2,'POST',apply));
  assert.equal((await request(`/contracts/${c.id}/works`,2,'POST',{...apply,workStages:[1]})).status,409);

  const last=await db.workTask.findFirstOrThrow({where:{uptsContractId:c.id},orderBy:{id:'desc'}});assert.equal((last.uptsWorkMeta as any).expectedResult,'Уточнённый результат');
  const other=await ok(await request('/contracts',2,'POST',{...body,workStages:[1],clientKey:randomUUID(),number:'ИНОЕ',contractType:'OTHER',objectDetails:{road:'М-4',stage:'Подготовка',otherDescription:'Сопровождение обращения',workKindKey:null},templateId:null,templateVersion:null,manualWorks:['Подготовить ответ']}));assert.equal(await db.workTask.count({where:{uptsContractId:other.id}}),1);
  const current=await db.uptsContract.findUniqueOrThrow({where:{id:c.id}});
  const stageTasks=await db.workTask.findMany({where:{uptsContractId:c.id}});
  const reduced=await ok(await request(path,2,'PUT',{...edit,version:current.version,objectDetails:{...current.objectDetails as any,stageCount:2},taskStages:stageTasks.filter(t=>(t.uptsWorkMeta as any)?.stageNumber>2).map(t=>({id:t.id,version:t.version,stageNumber:2}))}));
  assert.equal(reduced.objectDetails.stageCount,2);assert.equal(reduced.objectDetails.stage,'Этап 3','Road construction stage must remain independent');
  assert((await db.workTask.findMany({where:{uptsContractId:c.id}})).every(t=>(t.uptsWorkMeta as any)?.stageNumber<=2));
  assert.equal(((await db.workTask.findUniqueOrThrow({where:{id:last.id}})).uptsWorkMeta as any).stageNumber,2);
  const wb=new ExcelJS.Workbook();await wb.xlsx.load(Buffer.from(await(await request('/export?contractId='+c.id)).arrayBuffer()) as any);assert.equal(wb.worksheets.length,6);assert(wb.getWorksheet('Объекты')!.getRow(2).values.includes('М-12'));assert(wb.getWorksheet('Участки и сооружения'));assert(wb.getWorksheet('Задачи')!.getRow(1).values.includes('Ответственная роль'));assert(wb.getWorksheet('Задачи')!.getRow(1).values.includes('Этап работ'));
 }finally{server.closeAllConnections();server.close();await db.$disconnect();for(const f of generated)await rm(f,{force:true});}
});
