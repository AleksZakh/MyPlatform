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
    'tests/work/.upts-export-test-' + generated.length + '.mjs',
  );
  generated.push(filename);
  await writeFile(filename, out.outputFiles[0]!.text);
  return (await import(pathToFileURL(filename).href)).default;
}
test('UPTS document filters, ZIP relative links, integrity, access and audit',async()=>{
 const app=h3.createApp({debug:false}),router=h3.createRouter(),server=createServer(h3.toNodeListener(app));
 try{
  const dep=await db.department.create({data:{key:'upts',name:'УПТС'}});
  await db.user.createMany({data:[2,3,4,6,7].map(id=>({id,login:'export-'+id,fullName:'Сотрудник '+id,email:`export${id}@example.invalid`,status:'ACTIVE',authType:'EXTERNAL',departmentId:[2,3,7].includes(id)?dep.id:null}))});
  await db.spaceGroup.create({data:{name:'УПТС'}});
  const routes=[['/contracts','upts/contracts/index.post','post'],['/upts','upts/index.get','get'],['/files/:id','work/projects/[id]/files/index.post','post'],['/preview','upts/exports/preview.get','get'],['/exports','upts/exports/index.post','post'],['/exports','upts/exports/index.get','get'],['/exports/:id','upts/exports/[id]/index.get','get'],['/exports/:id/confirm','upts/exports/[id]/confirm.post','post'],['/exports/:id/cancel','upts/exports/[id]/cancel.post','post'],['/exports/:id/download','upts/exports/[id]/download.get','get'],['/events','upts/events.get','get']];
  for(const [url,file,method]of routes)(router as any)[method!](url,await handler('server/api/'+file+'.ts'));
  const entry=resolve('tests/work/.upts-export-worker-entry.ts');generated.push(entry);await writeFile(entry,"export {runUptsExports as default} from '../../server/services/upts-export';");const tick=await handler(entry);
  app.use(router);server.listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+(server.address() as any).port;
  const request=(url:string,user=2,method='GET',body?:unknown)=>fetch(base+url,{method,headers:{'x-test-user':String(user),'x-space-work':'1','content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  const ok=async(r:Response)=>{const b=await r.text();assert.equal(r.status,200,b);return JSON.parse(b)};
  const input={number:'A-1',name:'Объект 1',counterparty:'',signedDate:null,dueDate:null,contractType:'OTHER',templateId:null,templateVersion:null,objectDetails:{road:'М-1',curatorId:2,engineerId:3,stageCount:1,otherDescription:'Тест'},manualWorks:['Работа'],workStages:[1]};
  const c1=await ok(await request('/contracts',2,'POST',{...input,clientKey:randomUUID()}));
  const c2=await ok(await request('/contracts',2,'POST',{...input,number:'B-2',name:'Объект 2',clientKey:randomUUID(),objectDetails:{...input.objectDetails,road:'М-4'}}));
  async function upload(c:any,type:string,name:string,scope='SHARED'){
   return ok(await fetch(base+'/files/'+c.projectId,{method:'POST',headers:{'x-test-user':'2','x-space-work':'1','content-type':'application/octet-stream','x-file-contract':String(c.id),'x-document-type':encodeURIComponent(type),'x-file-key':randomUUID(),'x-file-name':encodeURIComponent(name),'x-file-size':'7','x-file-scope':scope},body:'drawing'}));
  }
  const f1=await upload(c1,'Схема','схема №1.pdf'),f2=await upload(c1,'Чертёж','чертёж.pdf');await upload(c2,'Межевой план','план.pdf');await upload(c1,'Секрет','private.pdf','PRIVATE');
  const snap=await ok(await request('/upts?documentType='+encodeURIComponent('Схема')));assert.deepEqual(snap.projects.flatMap((p:any)=>p.upts.contracts.map((c:any)=>c.id)),[c1.id]);assert(snap.tasks.every((t:any)=>t.uptsContractId===c1.id));
  const preview=await ok(await request('/preview?q='+encodeURIComponent('М-1')));assert.equal(preview.documents,2);assert.deepEqual(preview.types.map((t:any)=>t.name).sort(),['Схема','Чертёж']);
  const typed=await ok(await request('/preview?documentType='+encodeURIComponent('Межевой план')));assert.equal(typed.documents,1);assert.equal(typed.objects,1);
  assert.equal((await request('/preview',4)).status,403);
  const options={registry:true,types:['Схема','Чертёж'],requestId:randomUUID()};
  assert.equal((await request('/exports',2,'POST',{...options,types:['Секрет']})).status,422);
  assert.equal((await request('/exports',2,'POST',{registry:false,types:[],requestId:randomUUID()})).status,400);
  const j=await ok(await request('/exports?q='+encodeURIComponent('М-1'),2,'POST',options));assert.equal(j.status,'PREPARED');assert.equal(j.documents,2);assert.equal(j.objects,1);
  assert.equal((await ok(await request('/exports?q='+encodeURIComponent('М-1'),2,'POST',options))).id,j.id,'retry is idempotent');
  assert.equal((await request('/exports/'+j.id,7)).status,404);
  await ok(await request('/exports/'+j.id+'/confirm',2,'POST',{}));await Promise.all([tick(),tick()]);const ready=await ok(await request('/exports/'+j.id));assert.equal(ready.status,'READY',ready.error);
  const download=await request('/exports/'+j.id+'/download');assert.equal(download.status,200);const zip=await unzipper.Open.buffer(Buffer.from(await download.arrayBuffer()));assert.equal(zip.files.length,3);
  const registry=zip.files.find(f=>f.path==='Реестр.xlsx')!;assert(registry);const book=new ExcelJS.Workbook();await book.xlsx.load(await registry.buffer());const sheet=book.worksheets[0]!;assert.equal(sheet.rowCount,3);
  for(let i=2;i<=3;i++){const cell=sheet.getRow(i).getCell(4).value as {text:string;hyperlink:string};assert(cell.hyperlink);const target=decodeURIComponent(cell.hyperlink.replace(/^\.\//,''));const file=zip.files.find(f=>f.path===target);assert(file,'relative hyperlink resolves inside ZIP');assert.equal((await file!.buffer()).toString(),'drawing');assert(target.startsWith('Документы/Объект A-1 ['));}
  const journal=await ok(await request('/events'));assert(journal.items.some((r:any)=>r.action==='EXPORT_DOWNLOAD'));assert(journal.items.every((r:any)=>!r.note?.includes('private.pdf')));
  assert.equal((await request('/events',4)).status,403);assert.equal(await db.auditLog.count({where:{resourceKey:'upts.exports',action:'EXPORT_DOWNLOAD'}}),1);
  const registryOnly=await ok(await request('/exports?documentType='+encodeURIComponent('Межевой план'),2,'POST',{registry:true,types:[],requestId:randomUUID()}));
  await ok(await request('/exports/'+registryOnly.id+'/confirm',2,'POST',{}));await tick();
  const registryZip=await unzipper.Open.buffer(Buffer.from(await (await request('/exports/'+registryOnly.id+'/download')).arrayBuffer()));assert.deepEqual(registryZip.files.map(f=>f.path),['Реестр.xlsx']);
  const registryBook=new ExcelJS.Workbook();await registryBook.xlsx.load(await registryZip.files[0]!.buffer());assert.equal(registryBook.worksheets[0]!.rowCount,2);assert.equal(typeof registryBook.worksheets[0]!.getRow(2).getCell(4).value,'string');
  // Revoking object access invalidates existing exports as well as future previews.
  await db.workProject.update({where:{id:c1.projectId},data:{ownerId:7,scope:'PRIVATE'}});await db.workProjectMember.deleteMany({where:{projectId:c1.projectId,userId:2}});
  assert.equal((await request('/exports/'+j.id+'/download')).status,403);assert.equal((await ok(await request('/events'))).items.some((r:any)=>r.entityType==='UptsContract'&&r.entityId===c1.id),false);
  await db.workProject.update({where:{id:c1.projectId},data:{ownerId:2,scope:'UPTS_ALL'}});
  const cancel=await ok(await request('/exports',2,'POST',{registry:true,types:[],requestId:randomUUID()}));await ok(await request('/exports/'+cancel.id+'/cancel',2,'POST',{}));await tick();assert.equal((await ok(await request('/exports/'+cancel.id))).status,'CANCELLED');
  // A damaged file produces a visible failure, never a partially successful ZIP.
  const bad=await db.workProjectFile.findUniqueOrThrow({where:{id:f1.id}});await writeFile(resolve(storageRoot,bad.storagePath!),'damaged');
  const broken=await ok(await request('/exports',2,'POST',{registry:true,types:['Схема'],requestId:randomUUID()}));await ok(await request('/exports/'+broken.id+'/confirm',2,'POST',{}));await tick();assert.equal((await ok(await request('/exports/'+broken.id))).status,'FAILED');assert.equal((await request('/exports/'+broken.id+'/download')).status,409);
  assert(await db.auditLog.count({where:{action:'EXPORT_FAILED',resourceKey:'upts.exports'}}));
  await db.workProjectFile.createMany({data:Array.from({length:501},()=>({id:randomUUID(),clientKey:randomUUID(),contractId:c2.id,projectId:c2.projectId,ownerId:2,scope:'SHARED',name:'limit.pdf',size:7,sha256:'a'.repeat(64),storageKey:randomUUID(),documentType:'Лимит'}))});
  assert.equal((await request('/exports',2,'POST',{registry:true,types:['Лимит'],requestId:randomUUID()})).status,422);

  await db.workProjectFile.update({where:{id:f2.id},data:{deletedAt:new Date()}});assert.equal((await request('/exports/'+j.id+'/download')).status,409);
 }finally{server.closeAllConnections();server.close();await db.$disconnect();for(const f of generated)await rm(f,{force:true});await rm(storage,{recursive:true,force:true});await rm(storageRoot,{recursive:true,force:true});await rm(process.env.LAB_EXPORT_ROOT!,{recursive:true,force:true});}
});
