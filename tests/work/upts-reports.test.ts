import {migrateUptsStorage,migratePendingUptsStorage} from '../../server/services/upts-storage-migration';
import {storageRoot} from '../../server/services/storage/paths';
import test from 'node:test';
import {documentFolderName,openProjectFile} from '../../server/services/work/file-storage';
import {Readable} from 'node:stream';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile, rm, lstat, rename, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { build } from 'esbuild';
import { PrismaClient } from '@prisma/client';
import ExcelJS from 'exceljs';
import unzipper from 'unzipper';
import * as h3 from 'h3';
import { taskSummary, filterUpts } from '../../shared/utils/upts';

const url = process.env.WORK_TEST_DATABASE_URL || '';
if (!url || !new URL(url).pathname.endsWith('_work_test'))
  throw new Error('Use a disposable *_work_test database');
const storage = process.env.WORK_PROJECT_FILES_ROOT || '';
if (!storage.includes('space-project-files-test-') || !storageRoot.includes('space-upts-common-test-'))
  throw new Error('Use disposable space-project-files-test- storage');
const db = new PrismaClient({ datasources: { db: { url } } });
const deliveries:any[]=[];let failMail=true;
Object.assign(globalThis,h3,{workTestDb:db,testSendMail:async(mail:any)=>{if(failMail)throw Error('test SMTP unavailable');deliveries.push(mail);return {accepted:[mail.to]};},useRuntimeConfig:()=>({adminLogins:['admin'],smtp:{host:'mock.invalid',from:'space@example.invalid'},siteUrl:'https://space.example.invalid'})});
process.env.LAB_EXPORT_ROOT=resolve(storage,'..','space-exports-test-'+Date.now());
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
          b.onResolve({filter:/^nodemailer$/},()=>({path:'smtp',namespace:'test'}));
          b.onResolve({filter:/chat\/notify$/},()=>({path:'notify',namespace:'test'}));
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
              args.path === 'smtp'?'export default {createTransport:()=>({sendMail:globalThis.testSendMail,close(){}})}':args.path === 'notify'?'export async function notifyDialog(){}':args.path === 'db'
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
    'tests/work/.upts-reports-test-' + generated.length + '.mjs',
  );
  generated.push(filename);
  await writeFile(filename, out.outputFiles[0]!.text);
  return (await import(pathToFileURL(filename).href)).default;
}

import {newReport} from '../../shared/types/upts-reports';
import {resolveReport,parseReport,reportRows,reportResult} from '../../server/services/upts-reports-model';
test('report period and validated field allowlist',()=>{
 const c=newReport();c.period='month';assert.equal(resolveReport(c,new Date('2026-10-31T22:00:00Z')).filters.from,'2026-11-01');c.period='previousMonth';assert.equal(resolveReport(c,new Date('2027-01-01T00:00:00Z')).filters.to,'2026-12-31');
 const model={today:'2026-11-19',projects:[{id:1,upts:{contracts:[{id:1,number:'1',name:'М-1',objectDetails:{}}]}}],tasks:['DONE','CANCELLED','IN_PROGRESS'].map((status,i)=>({id:i+1,uptsContractId:1,assigneeId:null,status,title:'Работа '+i,uptsWorkMeta:{},dueDate:'2026-01-01'}))} as any;const rs=reportRows(model,[],new Map(),newReport());const totals=reportResult(rs,newReport(),new Date().toISOString());assert.equal(totals.workCount,2);assert.equal(totals.done,1);assert.equal(totals.overdue,1);assert.equal(totals.groups[0]!.percent,50);
 c.columns=['storagePath'];assert.throws(()=>parseReport(c));c.columns=['name'];c.filters.from='2026-02-30';assert.throws(()=>parseReport(c));
});
test('UPTS reports: source grain, templates, async snapshots, ZIP, permissions, limits and audit',async()=>{
 const app=h3.createApp({debug:false}),router=h3.createRouter(),server=createServer(h3.toNodeListener(app));
 try{
  const dep=await db.department.create({data:{key:'upts',name:'УПТС'}});
  await db.user.createMany({data:[2,3,4,6,7].map(id=>({id,login:'reports-'+id,fullName:id===3||id===7?'Однофамилец':'Сотрудник '+id,email:`reports${id}@example.invalid`,status:'ACTIVE',authType:'EXTERNAL',departmentId:[2,3,7].includes(id)?dep.id:null}))});
  await db.spaceGroup.create({data:{name:'УПТС'}});
  const routes=[['/contracts','upts/contracts/index.post','post'],['/files/:id','work/projects/[id]/files/index.post','post'],['/options','upts/reports/options.get','get'],['/preview','upts/reports/preview.post','post'],['/templates','upts/reports/templates/index.get','get'],['/templates','upts/reports/templates/index.post','post'],['/templates/:id','upts/reports/templates/[id].put','put'],['/templates/:id','upts/reports/templates/[id].delete','delete'],['/jobs','upts/reports/jobs/index.post','post'],['/jobs','upts/reports/jobs/index.get','get'],['/jobs/:id','upts/reports/jobs/[id].get','get'],['/jobs/:id/result','upts/reports/jobs/[id]/result.get','get'],['/jobs/:id/cancel','upts/reports/jobs/[id]/cancel.post','post'],['/jobs/:id/download','upts/reports/jobs/[id]/download.get','get'],['/events','upts/events.get','get']];
  for(const [url,file,method]of routes)(router as any)[method!](url,await handler('server/api/'+file+'.ts'));
  const entry=resolve('tests/work/.upts-reports-worker-entry.ts');generated.push(entry);await writeFile(entry,"export {runReports as default} from '../../server/services/upts-reports';");const tick=await handler(entry);
  app.use(router);server.listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+(server.address() as any).port;
  const request=(url:string,user=2,method='GET',body?:unknown)=>fetch(base+url,{method,headers:{'x-test-user':String(user),'x-space-work':'1','content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  const ok=async(r:Response)=>{const b=await r.text();assert.equal(r.status,200,b);return JSON.parse(b)};
  const input={number:'A-1',name:'Объект 1',counterparty:'',signedDate:null,dueDate:null,contractType:'OTHER',templateId:null,templateVersion:null,objectDetails:{road:'М-1',curatorId:2,engineerId:3,stageCount:2,otherDescription:'Тест'},manualWorks:['Первая работа','Вторая работа','Отменённая'],workStages:[1,2,2]};
  const c1=await ok(await request('/contracts',2,'POST',{...input,clientKey:randomUUID()}));
  const c2=await ok(await request('/contracts',2,'POST',{...input,number:'B-2',name:'Объект 2',clientKey:randomUUID(),manualWorks:['Закрытая работа'],workStages:[1]}));
  await db.workProject.update({where:{id:c2.projectId},data:{scope:'PRIVATE',ownerId:7}});await db.workProjectMember.deleteMany({where:{projectId:c2.projectId}});
  const tasks=await db.workTask.findMany({where:{uptsContractId:c1.id},orderBy:{id:'asc'}});
  await db.uptsContract.update({where:{id:c1.id},data:{objectDetails:{...input.objectDetails,stages:[{number:1,workKindKey:'LAND_DIVISION',startDate:'2026-11-01',endDate:'2026-11-10'},{number:2,workKindKey:'LAND_RIGHT',startDate:'2026-12-01',endDate:'2026-12-15'}]}}});
  await db.workTask.update({where:{id:tasks[0]!.id},data:{status:'DONE',assigneeId:3,uptsWorkMeta:{stageNumber:1,workKindKey:'LAND_DIVISION',completedAt:'2026-11-10',resultText:'=HYPERLINK("https://bad.invalid")'}}});
  await db.workTask.update({where:{id:tasks[1]!.id},data:{status:'IN_PROGRESS',assigneeId:7,dueDate:new Date('2000-01-01'),uptsWorkMeta:{stageNumber:2,workKindKey:'LAND_RIGHT'}}});
  // DB constraints allow only legacy statuses; omitted CANCELLED is covered by pure model tests.
  await db.workTask.update({where:{id:tasks[2]!.id},data:{deletedAt:new Date()}});
  async function upload(c:any,type:string,name:string,scope='SHARED',content:Buffer=Buffer.from('drawing')){return ok(await fetch(base+'/files/'+c.projectId,{method:'POST',headers:{'x-test-user':'2','x-space-work':'1','content-type':'application/octet-stream','x-file-contract':String(c.id),'x-document-type':encodeURIComponent(type),'x-file-key':randomUUID(),'x-file-name':encodeURIComponent(name),'x-file-size':String(content.length),'x-file-scope':scope},body:content as any}));}
  const f1=await upload(c1,'Схема','схема [#1]%.pdf'),f2=await upload(c1,'Схема','схема [#1]%.pdf'),f3=await upload(c1,'Чертёж','Чертёж.dwg');await upload(c1,'Иное','private.pdf','PRIVATE');
  await db.workProjectFile.updateMany({where:{id:{in:[f1.id,f2.id]}},data:{taskId:tasks[0]!.id,documentDate:new Date('2026-11-01')}});
  const config=newReport();const pre=await ok(await request('/preview',2,'POST',config));assert.equal(pre.total,2);assert.equal(pre.done,1);assert.equal(pre.workCount,2);assert.equal(pre.overdue,1);assert.equal(pre.rows.find((r:any)=>r.taskId===tasks[0]!.id).values.files,2,'documents do not multiply works');assert.equal(pre.objectCount,1,'private object excluded');
  assert.equal((await request('/preview',4,'POST',config)).status,403);assert.equal((await fetch(base+'/preview',{method:'POST',headers:{'x-test-user':'2','content-type':'application/json'},body:JSON.stringify(config)})).status,403);
  assert.equal((await request('/preview',2,'POST',{...config,columns:['storageKey']})).status,400);
  config.filters.from='2026-11-01';config.filters.to='2026-11-30';const dated=await ok(await request('/preview',2,'POST',config));assert.equal(dated.total,1);assert.equal(dated.rows[0].values.stage,1,'stage-specific date filter');config.filters.dateField='finish';assert.equal((await ok(await request('/preview',2,'POST',config))).total,1,'missing actual dates excluded');config.filters.from='';config.filters.to='';config.group='person';assert.equal((await ok(await request('/preview',2,'POST',config))).groups.length,2,'same names never merge people');
  const obj=newReport('objects');obj.filters.employeeId=3;const op=await ok(await request('/preview',2,'POST',obj));assert.equal(op.total,1);assert.equal(op.workCount,2,'object aggregates keep all tasks');
  const docs=newReport('documents');const dp=await ok(await request('/preview',2,'POST',docs));assert.equal(dp.total,3,'shared files including direct object documents');assert.equal(dp.rows.filter((r:any)=>r.taskId===null).length,1);docs.filters.documentType='Схема';assert.equal((await ok(await request('/preview',2,'POST',docs))).total,2);
  const privateTemplate=await ok(await request('/templates',2,'POST',{config,shared:false}));assert.equal((await ok(await request('/templates',3))).length,0);const shared=await ok(await request('/templates',2,'POST',{config,shared:true}));assert.equal((await ok(await request('/templates',3))).length,1);assert.equal((await request('/templates/'+shared.id,3,'PUT',{config,shared:true,version:shared.version})).status,403);const updated=await ok(await request('/templates/'+shared.id,2,'PUT',{config:{...config,name:'Новое название'},shared:true,version:shared.version}));assert.equal(updated.version,2);assert.equal((await request('/templates/'+shared.id,2,'PUT',{config,shared:true,version:1})).status,409);await ok(await request('/templates/'+privateTemplate.id,2,'DELETE',{version:1}));
  const options={config,attachments:false,requestId:randomUUID()};const job=await ok(await request('/jobs',2,'POST',options));assert.equal((await ok(await request('/jobs',2,'POST',options))).id,job.id);assert.equal((await request('/jobs/'+job.id,3)).status,404);await Promise.all([tick(),tick()]);assert.equal((await ok(await request('/jobs/'+job.id))).status,'READY');const notificationCount=await db.chatMessage.count({where:{body:{contains:'reportId='+job.id}}});assert.equal(notificationCount,1,'chat notification after ready');await tick();assert.equal(await db.chatMessage.count({where:{body:{contains:'reportId='+job.id}}}),1,'notification retry is idempotent');
  const xlsx=await request('/jobs/'+job.id+'/download');assert.equal(xlsx.status,200);const book=new ExcelJS.Workbook();await book.xlsx.load(Buffer.from(await xlsx.arrayBuffer()));assert(book.getWorksheet('Параметры'));const sheet=book.getWorksheet('Отчёт')!;assert.equal(sheet.rowCount,3);const formulaCell=sheet.getRow(2).values as any[];assert(formulaCell.some(v=>typeof v==='string'&&v.startsWith('=HYPERLINK')),'untrusted text stays string, not a formula');
  const frozen=await ok(await request('/jobs/'+job.id+'/result'));await db.workTask.update({where:{id:tasks[0]!.id},data:{title:'Изменено после среза'}});assert.deepEqual((await ok(await request('/jobs/'+job.id+'/result'))).rows,frozen.rows,'history uses frozen snapshot');
  const docJob=await ok(await request('/jobs',2,'POST',{config:docs,attachments:true,requestId:randomUUID()}));await tick();const ready=await ok(await request('/jobs/'+docJob.id));assert.equal(ready.status,'READY',ready.error);const zip=await unzipper.Open.buffer(Buffer.from(await (await request('/jobs/'+docJob.id+'/download?format=zip')).arrayBuffer()));const registry=zip.files.find(f=>f.path.endsWith('/Реестр.xlsx'))!;assert(registry);const zb=new ExcelJS.Workbook();await zb.xlsx.load(await registry.buffer());const zs=zb.getWorksheet('Документы')!;assert.equal(zs.rowCount,3);const folder=registry.path.slice(0,-'Реестр.xlsx'.length);const targets=[];for(let i=2;i<=3;i++){const cell=zs.getRow(i).getCell(3).value as {text:string;hyperlink:string};targets.push(cell.hyperlink);const file=zip.files.find(f=>f.path===folder+cell.hyperlink);assert(file,'relative link resolves');assert.equal((await file!.buffer()).toString(),'drawing');}assert.notEqual(targets[0],targets[1],'same filenames have distinct targets');assert(zip.files.every(f=>f.path.startsWith(folder)));assert.equal(zip.files.filter(f=>f.path.includes('/Документы/')).length,2,'exact filtered files only');
  const journal=await ok(await request('/events'));for(const action of ['REPORT_PREVIEW','REPORT_CREATE','REPORT_VIEW','REPORT_DOWNLOAD','REPORT_TPL_CREATE'])assert(journal.items.some((r:any)=>r.action===action),action);
  await db.workProject.update({where:{id:c1.projectId},data:{ownerId:7,scope:'PRIVATE'}});await db.workProjectMember.deleteMany({where:{projectId:c1.projectId,userId:2}});assert.equal((await request('/jobs/'+job.id+'/download')).status,403);assert.equal((await request('/jobs/'+docJob.id+'/result')).status,403);assert.equal((await ok(await request('/jobs'))).length,0);await db.workProject.update({where:{id:c1.projectId},data:{ownerId:2,scope:'UPTS_ALL'}});
  const cancel=await ok(await request('/jobs',2,'POST',{config,attachments:false,requestId:randomUUID()}));await ok(await request('/jobs/'+cancel.id+'/cancel',2,'POST',{}));await tick();assert.equal((await ok(await request('/jobs/'+cancel.id))).status,'CANCELLED');
  const file=await db.workProjectFile.findUniqueOrThrow({where:{id:f1.id}});await writeFile(resolve(storageRoot,file.storagePath!),'damaged');const bad=await ok(await request('/jobs',2,'POST',{config:docs,attachments:true,requestId:randomUUID()}));await tick();assert.equal((await ok(await request('/jobs/'+bad.id))).status,'FAILED');assert.equal((await request('/jobs/'+bad.id+'/download')).status,409);
  await db.workProjectFile.createMany({data:Array.from({length:501},()=>({id:randomUUID(),clientKey:randomUUID(),contractId:c1.id,projectId:c1.projectId,ownerId:2,scope:'SHARED',name:'limit.pdf',size:7,sha256:'a'.repeat(64),storageKey:randomUUID(),documentType:'Лимит'}))});docs.filters.documentType='Лимит';assert.equal((await request('/jobs',2,'POST',{config:docs,attachments:true,requestId:randomUUID()})).status,422);
  const storedPath=resolve(process.env.LAB_EXPORT_ROOT!,'upts-reports','jobs',job.id,'job.json');const stored=JSON.parse(await readFile(storedPath,'utf8'));stored.expiresAt=new Date(Date.now()-1000).toISOString();await writeFile(storedPath,JSON.stringify(stored));assert.equal((await request('/jobs/'+job.id+'/download')).status,410);await tick();const expired=(await ok(await request('/jobs'))).find((j:any)=>j.id===job.id);assert.equal(expired.status,'EXPIRED');assert.equal(expired.rows,2,'history keeps original row count');assert.equal((await ok(await request('/templates'))).length,1,'template survives report cleanup');
  await db.workProjectFile.update({where:{id:f2.id},data:{deletedAt:new Date()}});assert.equal((await request('/jobs/'+docJob.id+'/download')).status,409);
 }finally{server.closeAllConnections();server.close();await db.$disconnect();for(const f of generated)await rm(f,{force:true});await rm(storage,{recursive:true,force:true});await rm(storageRoot,{recursive:true,force:true});await rm(process.env.LAB_EXPORT_ROOT!,{recursive:true,force:true});}
});
