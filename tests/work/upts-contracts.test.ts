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
    'tests/work/.upts-contracts-test-' + generated.length + '.mjs',
  );
  generated.push(filename);
  await writeFile(filename, out.outputFiles[0]!.text);
  return (await import(pathToFileURL(filename).href)).default;
}
test('UPTS contracts, typed library, templates, retries, permissions, audit and Excel', async()=>{
 const app=h3.createApp({debug:false}),router=h3.createRouter(),server=createServer(h3.toNodeListener(app));
 try{
  const dep=await db.department.create({data:{key:'upts',name:'УПТС'}});
  await db.user.createMany({data:[2,3,4,6].map(id=>({id,login:'upts-'+id,status:'ACTIVE',authType:'EXTERNAL',departmentId:[2,3].includes(id)?dep.id:null}))});
  const routes=[
   ['/lib','upts/library/index.get','get'],['/works','upts/library/works.post','post'],['/works/:workId','upts/library/works/[workId].put','put'],
   ['/templates','upts/library/templates.post','post'],['/templates/:templateId','upts/library/templates/[templateId].put','put'],
   ['/contracts','upts/contracts/index.post','post'],['/contracts/:contractId/works','upts/contracts/[contractId]/works.post','post'],
   ['/upts','upts/index.get','get'],['/export','upts/export.get','get'],['/tasks','work/tasks/index.post','post'],['/tasks/:id','work/tasks/[id].put','put'],
   ['/projects/:id/contracts','upts/projects/[id]/contracts.get','get'],
   ['/projects/:id/contracts/:contractId','upts/projects/[id]/contracts/[contractId].put','put'],
  ];
  for(const [path,file,method]of routes)(router as any)[method!](path,await handler('server/api/'+file+'.ts'));
  app.use(router);server.listen(0,'127.0.0.1');await once(server,'listening');
  const base='http://127.0.0.1:'+(server.address() as any).port;
  const request=(path:string,user=2,method='GET',body?:unknown)=>fetch(base+path,{method,headers:{'x-test-user':String(user),'x-space-work':'1','content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  async function ok(r:Response){const text=await r.text();assert.equal(r.status,200,text);return JSON.parse(text);}
  let lib=await ok(await request('/lib'));assert.equal(lib.works.length,18);assert.equal(lib.templates.length,5);assert(lib.canManage);
  assert.equal((await request('/lib',0)).status,401);assert.equal((await request('/lib',4)).status,403);assert.equal((await ok(await request('/lib',3))).canManage,false);
  const workBody={clientKey:randomUUID(),name:'Проверка комплекта',contractType:'LAND',active:true};
  assert.equal((await request('/works',3,'POST',workBody)).status,403);
  const w=await ok(await request('/works',2,'POST',workBody));assert.equal((await ok(await request('/works',2,'POST',workBody))).id,w.id);
  assert.equal((await request('/works',2,'POST',{...workBody,clientKey:randomUUID()})).status,409);
  const land=lib.templates.find((t:any)=>t.contractType==='LAND'),oks=lib.templates.find((t:any)=>t.contractType==='OKS');
  const templateBody={clientKey:randomUUID(),name:'Проверка и оформление',contractType:'LAND',active:true,workIds:[w.id,land.items[0].workId]};
  const template=await ok(await request('/templates',2,'POST',templateBody));assert.deepEqual(template.items.map((i:any)=>i.workId),templateBody.workIds);
  assert.equal((await request('/templates',2,'POST',{...templateBody,clientKey:randomUUID(),name:'Смешанный',workIds:[w.id,oks.items[0].workId]})).status,400);
  const create={clientKey:randomUUID(),number:'УПТС-1',name:'Участок автодороги',counterparty:'',projectId:null,contractType:'LAND',signedDate:null,dueDate:'2026-12-01',templateId:land.id,templateVersion:land.version,manualWorks:[]};
  assert.equal((await request('/contracts',2,'POST',{...create,templateId:oks.id})).status,400);assert.equal(await db.workProject.count(),0);
  const c=await ok(await request('/contracts',2,'POST',create));assert.equal((await ok(await request('/contracts',2,'POST',create))).id,c.id);
  assert.equal(await db.workProject.count(),1);assert.equal(await db.workTask.count({where:{uptsContractId:c.id}}),7);
  assert((await lstat(resolve(storage,String(c.projectId),'contracts',String(c.id),'shared'))).isDirectory());
  assert.equal((await request(`/projects/${c.projectId}/contracts`,4)).status,404);
  assert.equal((await ok(await request(`/projects/${c.projectId}/contracts`))).length,1);
  const memberSnapshot=await ok(await request('/upts',3));assert.equal(memberSnapshot.projects.length,0,'Module membership is not blanket project access');
  const application={clientKey:randomUUID(),contractVersion:c.version,templateId:template.id,templateVersion:template.version,manualWorks:[]};
  assert.equal((await request(`/contracts/${c.id}/works`,3,'POST',application)).status,404);
  await db.workProject.update({where:{id:c.projectId},data:{scope:'TEAM',members:{create:{userId:3,role:'OBSERVER'}}}});
  assert.equal((await request(`/contracts/${c.id}/works`,3,'POST',application)).status,403);
  assert.equal((await ok(await request(`/contracts/${c.id}/works`,2,'POST',application))).created,2);
  const auditCount=await db.auditLog.count();assert.equal((await ok(await request(`/contracts/${c.id}/works`,2,'POST',application))).created,2);assert.equal(await db.auditLog.count(),auditCount);
  assert.equal(await db.workTask.count({where:{uptsContractId:c.id}}),9);
  assert.equal((await request(`/contracts/${c.id}/works`,2,'POST',{...application,clientKey:randomUUID()})).status,409,'stale contract version');
  const savedWork=await ok(await request('/works/'+w.id,2,'PUT',{...workBody,version:w.version,name:'Проверка результата'}));
  assert.equal(savedWork.version,2);assert.equal(await db.workTask.count({where:{title:'Проверка комплекта',uptsContractId:c.id}}),1,'Existing tasks keep original titles');
  assert.equal((await request(`/contracts/${c.id}/works`,2,'POST',{...application,clientKey:randomUUID(),contractVersion:2})).status,409,'work rename invalidates template preview');
  const legacy=await db.workTask.create({data:{clientKey:randomUUID(),projectId:c.projectId,creatorId:2,title:'Старая задача',visibility:'PROJECT'}});
  const other=await ok(await request('/contracts',2,'POST',{...create,clientKey:randomUUID(),number:'ИНОЕ-2',name:'Эксперимент',projectId:c.projectId,contractType:'OTHER',templateId:null,templateVersion:null,manualWorks:['Ручная работа']}));
  const snap=await ok(await request('/upts?contractId='+c.id));assert.equal(snap.projects[0].upts.contracts.length,1);assert.equal(snap.tasks.length,9);assert(snap.tasks.every((t:any)=>t.uptsContractId===c.id));
  assert.equal((await ok(await request('/upts?q='+encodeURIComponent('ИНОЕ-2')))).tasks.length,1);
  const empty=await ok(await request('/contracts',2,'POST',{...create,clientKey:randomUUID(),number:'ПУСТО-3',name:'Без работ',projectId:c.projectId,templateId:null,templateVersion:null}));
  assert.equal((await ok(await request('/upts?q='+encodeURIComponent('ПУСТО-3')))).projects[0].upts.contracts[0].id,empty.id,'Search includes contracts without tasks');
  const body={clientKey:randomUUID(),version:legacy.version,title:legacy.title,description:'',kind:'TASK',status:'TODO',priority:'NORMAL',visibility:'PROJECT',projectId:c.projectId,departmentId:null,assigneeId:null,participantIds:[],plannedDate:null,startDate:null,dueDate:null,blockedReason:'',uptsContractId:c.id};
  const linked=await ok(await request('/tasks/'+legacy.id,2,'PUT',body));assert.equal(linked.uptsContractId,c.id);
  const p2=await db.workProject.create({data:{clientKey:randomUUID(),name:'Other',ownerId:2,scope:'PRIVATE',upts:{create:{}}}});
  assert.equal((await request('/tasks',2,'POST',{...body,projectId:p2.id})).status,400,'Cross-project contract rejected');
  const buffer=Buffer.from(await(await request('/export?contractId='+other.id)).arrayBuffer());const wb=new ExcelJS.Workbook();await wb.xlsx.load(buffer as any);assert.equal(wb.getWorksheet('Договоры')!.rowCount,2);assert.equal(wb.getWorksheet('Задачи')!.rowCount,2);assert(wb.getWorksheet('Договоры')!.getRow(2).values.includes('Иное'));
  assert(await db.auditLog.count({where:{entityType:'UptsContract',action:'CREATE'}})>=3);
  assert.equal(await db.auditLog.count({where:{entityType:'UptsContract',action:'APPLY'}}),1);
  assert.equal(await db.auditLog.count({where:{entityType:'UptsWorkDefinition',action:'UPDATE'}}),1);
  const workEvent=await db.auditLog.findFirstOrThrow({where:{entityType:'UptsWorkDefinition',action:'UPDATE'}});
  assert.equal((workEvent.changes as any).name.before,'Проверка комплекта');
  assert.equal((workEvent.changes as any).name.after,'Проверка результата');
  const latestTemplate=await db.uptsWorkTemplate.findUniqueOrThrow({where:{id:template.id}});
  await ok(await request('/templates/'+template.id,2,'PUT',{...templateBody,version:latestTemplate.version,active:false}));
  assert.equal((await request(`/contracts/${c.id}/works`,2,'POST',{...application,clientKey:randomUUID(),contractVersion:2,templateVersion:latestTemplate.version+1})).status,400);
  assert(await db.auditLog.count({where:{entityType:'UptsWorkTemplate',action:'ARCHIVE'}}));
  await db.workProject.update({where:{id:c.projectId},data:{archivedAt:new Date()}});
  assert.equal((await request(`/contracts/${c.id}/works`,2,'POST',{...application,clientKey:randomUUID(),contractVersion:2})).status,403);
  await db.user.update({where:{id:2},data:{departmentId:null}});assert.equal((await request('/lib')).status,403,'Membership revocation takes effect');
 }finally{server.closeAllConnections();server.close();await db.$disconnect();for(const f of generated)await rm(f,{force:true});}
});
