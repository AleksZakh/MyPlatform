import {migrateUptsStorage} from '../../server/services/upts-storage-migration';
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
    'tests/work/.upts-workflow-test-' + generated.length + '.mjs',
  );
  generated.push(filename);
  await writeFile(filename, out.outputFiles[0]!.text);
  return (await import(pathToFileURL(filename).href)).default;
}
test('UPTS assignments, 300 MiB documents, ordered completion, outbox retry and deletion',async()=>{
 const app=h3.createApp({debug:false}),router=h3.createRouter(),server=createServer(h3.toNodeListener(app));
 try{
  const dep=await db.department.create({data:{key:'upts',name:'УПТС'}});
  await db.user.createMany({data:[2,3,4,6,7,8,9].map(id=>({id,login:'workflow-'+id,fullName:id===3?'Гацаева Алёна Сергеевна':'Сотрудник '+id,email:`person${id}@example.invalid`,status:'ACTIVE',authType:'EXTERNAL',departmentId:[2,3,7,8,9].includes(id)?dep.id:null}))});
  const routes=[['/storage','admin/files/index.get','get'],['/storage-content','admin/files/content.get','get'],['/task-view/:id','work/tasks/[id].get','get'],['/defaults','upts/defaults.get','get'],['/contracts','upts/contracts/index.post','post'],['/upts','upts/index.get','get'],['/overview/:contractId','upts/contracts/[contractId]/overview.get','get'],['/assign/:contractId','upts/contracts/[contractId]/assign.post','post'],['/task/:taskId','upts/tasks/[taskId].put','put'],['/contracts/:contractId','upts/contracts/[contractId]/index.delete','delete'],['/files/:id','work/projects/[id]/files/index.post','post'],['/files/:id','work/projects/[id]/files/index.get','get'],['/files/:id/:fileId','work/projects/[id]/files/[fileId].get','get'],['/files/:id/:fileId','work/projects/[id]/files/[fileId].patch','patch']];
  for(const [path,file,method]of routes)(router as any)[method!](path,await handler('server/api/'+file+'.ts'));
  const worker=resolve('tests/work/.upts-worker-entry.ts');generated.push(worker);await writeFile(worker,"export {deliverUptsNotifications as default} from '../../server/services/upts-notifications';");const deliver=await handler(worker);
  app.use(router);server.listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+(server.address() as any).port;
  const request=(path:string,user=2,method='GET',body?:unknown)=>fetch(base+path,{method,headers:{'x-test-user':String(user),'x-space-work':'1','content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  async function ok(r:Response){const body=await r.text();assert.equal(r.status,200,body);return JSON.parse(body);}
  assert.deepEqual(await ok(await request('/defaults')),{curatorId:2,engineerId:3,warning:''});
  const input={clientKey:randomUUID(),number:'TEST',name:'Проверка процесса',counterparty:'',signedDate:null,dueDate:null,contractType:'OTHER',templateId:null,templateVersion:null,objectDetails:{curatorId:2,engineerId:3,stageCount:2,otherDescription:'Тест'},manualWorks:['Первая','Вторая','Третья'],workStages:[2,1,2]};
  const object=await ok(await request('/contracts',2,'POST',input));
  assert((await lstat(resolve(storageRoot,'upts',object.storageFolder))).isDirectory(),'object folder exists at creation');
  assert(object.createdAt,'new objects have a persistent creation timestamp');
  const roleObject=await ok(await request('/contracts',2,'POST',{...input,clientKey:randomUUID(),number:'ROLES',objectDetails:{...input.objectDetails,curatorId:8}}));
  const roleTask=await db.workTask.findFirstOrThrow({where:{uptsContractId:roleObject.id}});
  await db.workTask.update({where:{id:roleTask.id},data:{assigneeId:7}}); // Legacy assignee without project membership.
  const listFiles=(user:number)=>request(`/files/${roleObject.projectId}?contractId=${roleObject.id}&taskId=${roleTask.id}&scope=SHARED`,user);
  for(const user of [2,3,7,8]){assert.equal((await ok(await listFiles(user))).canUpload,true);assert.equal((await ok(await request('/task-view/'+roleTask.id,user))).canEdit,true);}
  assert.equal((await ok(await listFiles(9))).canUpload,false);assert.equal((await ok(await request('/task-view/'+roleTask.id,9))).canEdit,false);
  const roleUpload=(user:number)=>fetch(base+'/files/'+roleObject.projectId,{method:'POST',headers:{'x-test-user':String(user),'x-space-work':'1','content-type':'application/octet-stream','x-file-contract':String(roleObject.id),'x-file-task':String(roleTask.id),'x-document-type':encodeURIComponent('Чертёж'),'x-file-key':randomUUID(),'x-file-name':'scheme.pdf','x-file-size':'3','x-file-scope':'SHARED'},body:'pdf'});
  assert.equal((await ok(await roleUpload(8))).canManage,true);assert.equal((await ok(await roleUpload(7))).canManage,true);assert.equal((await roleUpload(9)).status,403);
  await db.workProjectMember.create({data:{projectId:roleObject.projectId,userId:8,role:'OBSERVER'}});
  assert.equal((await ok(await listFiles(8))).canUpload,false);assert.equal((await roleUpload(8)).status,403);
  let overview=await ok(await request('/overview/'+object.id,3));assert.equal(overview.canAssign,true);assert.deepEqual(overview.tasks.map((t:any)=>t.title),['Вторая','Первая','Третья']);assert(overview.tasks.every((t:any)=>t.assigneeId===3));
  assert.equal((await request('/overview/'+object.id,4)).status,403);
  const tasks=overview.tasks,first=tasks[0],second=tasks[1],third=tasks[2];
  const batch={assigneeId:7,tasks:[first,second].map(t=>({id:t.id,version:t.version}))};
  assert.equal((await request('/assign/'+object.id,8,'POST',batch)).status,403);
  assert.equal((await request('/assign/'+object.id,3,'POST',{...batch,assigneeId:4})).status,400);
  assert.equal((await request('/assign/'+object.id,3,'POST',{...batch,tasks:[batch.tasks[0],{...batch.tasks[1],version:999}]})).status,409);
  assert.equal((await db.workTask.findUniqueOrThrow({where:{id:first.id}})).assigneeId,3,'conflicting batch is atomic');
  await ok(await request('/assign/'+object.id,3,'POST',batch));
  assert(await db.workProjectMember.findFirst({where:{projectId:object.projectId,userId:7,role:'MEMBER'}}));
  const save=(t:any,resultText:string)=>({version:t.version,title:t.title,assigneeId:t.assigneeId,status:t.status,resultText});
  let f=await db.workTask.findUniqueOrThrow({where:{id:first.id}});
  assert.equal((await request('/task/'+first.id,8,'PUT',save(f,'Нельзя'))).status,403);
  assert.equal((await request('/task/'+first.id,7,'PUT',{...save(f,''),status:'DONE'})).status,400);
  const done=await ok(await request('/task/'+first.id,7,'PUT',save(f,'КУВД-2026-123')));assert.equal(done.status,'DONE');assert(done.uptsWorkMeta.completedAt);
  const started=await db.workTask.findUniqueOrThrow({where:{id:second.id}});assert.equal(started.status,'IN_PROGRESS');assert((started.uptsWorkMeta as any).startedAt);
  assert.equal(await db.uptsNotification.count({where:{eventKey:`start:${first.id}:${second.id}`}}),1);
  await ok(await request('/task/'+first.id,7,'PUT',save(done,'КУВД-2026-123 уточнено')));assert.equal(await db.uptsNotification.count({where:{eventKey:`start:${first.id}:${second.id}`}}),1);
  assert.equal((await request('/task/'+first.id,7,'PUT',save(done,'Старый снимок'))).status,409);
  const headers=(size:number,taskId=second.id)=>({'x-test-user':'7','x-space-work':'1','content-type':'application/octet-stream','x-file-contract':String(object.id),'x-file-task':String(taskId),'x-document-type':encodeURIComponent('Чертёж'),'x-file-key':randomUUID(),'x-file-name':encodeURIComponent('Чертёж.bin'),'x-file-size':String(size),'x-file-scope':'SHARED'});
  assert.equal((await fetch(base+'/files/'+object.projectId,{method:'POST',headers:headers(300*1024*1024+1),body:'x'})).status,413);
  assert.equal((await fetch(base+'/files/'+object.projectId,{method:'POST',headers:headers(1,third.id),body:'x'})).status,403);
  const size=300*1024*1024,chunk=Buffer.alloc(1024*1024,31),hash=createHash('sha256');
  const stream=Readable.from((async function*(){for(let i=0;i<300;i++){hash.update(chunk);yield chunk;}})());
  const file=await ok(await fetch(base+'/files/'+object.projectId,{method:'POST',headers:headers(size),body:stream,duplex:'half'} as any));assert.equal(file.size,size);assert.equal(file.taskId,second.id);assert.equal(file.documentType,'Чертёж');
  const stored=await db.workProjectFile.findUniqueOrThrow({where:{id:file.id}});assert.equal(stored.sha256,hash.digest('hex'));
  assert.equal(stored.storageFolder,documentFolderName('Чертёж',stored.createdAt));assert.equal(file.documentFolder,stored.storageFolder);
  assert((await lstat(resolve(storageRoot,stored.storagePath!))).isFile());assert(stored.storagePath!.includes('/Чертёж/'));
  const folders=await ok(await request('/storage?path=upts',6));assert(folders.items.some((x:any)=>x.name===object.storageFolder));
  assert.equal((await request('/storage?path=upts',7)).status,403);
  const adminFiles=await ok(await request('/storage?mode=documents&q='+encodeURIComponent('Чертёж.bin'),6));assert(adminFiles.items.some((x:any)=>x.references.some((r:any)=>r.fileId===file.id)));
  await assert.rejects(()=>openProjectFile({...stored,storagePath:'upts/../../etc/passwd'}));
  assert.equal(documentFolderName('Выписка из ЕГРН',new Date('2026-11-09T21:30:00Z')),'Выписка из ЕГРН');
  assert(!/[\\/]/.test(documentFolderName('../../x/y',new Date())));
  assert(Buffer.byteLength(documentFolderName('Я'.repeat(200),new Date()))<241);
  const metaHeaders={...headers(5),'x-document-date':'2026-11-09','x-document-comment':encodeURIComponent('Общий комментарий к чертежам')};
  const legacy=await ok(await fetch(base+'/files/'+object.projectId,{method:'POST',headers:metaHeaders,body:'hello'}));assert.equal(legacy.documentComment,'Общий комментарий к чертежам');assert(legacy.documentDate.startsWith('2026-11-09'));assert.equal(legacy.storagePath.split('/').slice(0,-1).join('/'),stored.storagePath!.split('/').slice(0,-1).join('/'),'different document dates share one folder');
  assert.equal((await ok(await fetch(base+'/files/'+object.projectId,{method:'POST',headers:metaHeaders,body:'hello'}))).id,legacy.id);
  assert.equal((await fetch(base+'/files/'+object.projectId,{method:'POST',headers:{...metaHeaders,'x-document-comment':'changed'},body:'hello'})).status,409);
  const oldFile=await db.workProjectFile.findUniqueOrThrow({where:{id:legacy.id}});const parent=resolve(storage,String(object.projectId),'contracts',String(object.id),'shared');
  await mkdir(parent,{recursive:true});await rename(resolve(storageRoot,oldFile.storagePath!),resolve(parent,oldFile.storageKey));await db.workProjectFile.update({where:{id:legacy.id},data:{storageFolder:null,storagePath:null}});
  assert.equal(await (await request(`/files/${object.projectId}/${legacy.id}`,7)).text(),'hello','legacy files without subfolders still download');
  const plan=await migrateUptsStorage(db,false);assert.equal(plan.planned,1);assert.equal((await db.workProjectFile.findUniqueOrThrow({where:{id:legacy.id}})).storagePath,null);
  const migrated=await migrateUptsStorage(db,true);assert.equal(migrated.failed,0);assert.equal(migrated.migrated,1);assert((await lstat(resolve(parent,oldFile.storageKey))).isFile(),'original retained');
  const repeat=await migrateUptsStorage(db,true);assert.equal(repeat.migrated,0);assert.equal(repeat.failed,0);
  assert.equal(await (await request(`/files/${object.projectId}/${legacy.id}`,7)).text(),'hello','migration preserves existing download URLs');
  const migratedFile=await db.workProjectFile.findUniqueOrThrow({where:{id:legacy.id}});assert.equal(await (await request('/storage-content?path='+encodeURIComponent(migratedFile.storagePath!),6)).text(),'hello');
  const files=await ok(await request(`/files/${object.projectId}?contractId=${object.id}&scope=SHARED`));assert.equal(files.total,2,'documents from a work are listed in object documents');
  const taskFiles=await ok(await request(`/files/${object.projectId}?contractId=${object.id}&taskId=${second.id}&scope=SHARED`));assert.equal(taskFiles.maxBytes,size);assert.equal(taskFiles.total,2);
  const downloaded=await request(`/files/${object.projectId}/${file.id}`,7);assert.equal(downloaded.status,200);let received=0;const checksum=createHash('sha256');for await(const bytes of downloaded.body as any){received+=bytes.length;checksum.update(bytes);}assert.equal(received,size);assert.equal(checksum.digest('hex'),stored.sha256);
  await ok(await request('/task/'+second.id,7,'PUT',save(started,'')));assert.equal((await db.workTask.findUniqueOrThrow({where:{id:third.id}})).status,'IN_PROGRESS','file-only result starts next work');
  const refusalTask=await db.workTask.findFirstOrThrow({where:{uptsContractId:roleObject.id,id:{not:roleTask.id}}});
  await ok(await fetch(base+'/files/'+roleObject.projectId,{method:'POST',headers:{...headers(3),'x-test-user':'3','x-file-contract':String(roleObject.id),'x-file-task':String(refusalTask.id),'x-document-type':encodeURIComponent('Приостановка/отказ Росреестра')},body:'zip'}));
  const pending=await ok(await request('/task/'+refusalTask.id,3,'PUT',save(refusalTask,'')));assert.equal(pending.status,'TODO','refusal alone does not complete work');
  assert.equal((await request('/task/'+refusalTask.id,3,'PUT',{...save(pending,''),kuvdEntries:[{number:'КУВД-1',date:'2026-02-30'}]})).status,400);
  const kuvd=await ok(await request('/task/'+refusalTask.id,3,'PUT',{...save(pending,''),kuvdEntries:[{number:'КУВД-1',date:'2026-11-10'},{number:'КУВД-2',date:'2026-11-11'}]}));assert.equal(kuvd.uptsWorkMeta.kuvdEntries.length,2);
  await Promise.all([deliver(),deliver()]);const chatCount=await db.chatMessage.count();assert(chatCount>0);assert.equal(deliveries.length,0);assert(await db.uptsNotification.count({where:{chatSentAt:{not:null},emailSentAt:null,lastError:{not:null}}}));
  failMail=false;await db.uptsNotification.updateMany({data:{nextAttemptAt:new Date(0)}});await Promise.all([deliver(),deliver()]);assert.equal(await db.chatMessage.count(),chatCount,'retry must not duplicate chat');assert(deliveries.length>0);assert.equal(new Set(deliveries.map(m=>m.messageId)).size,deliveries.length,'competing workers do not duplicate email');assert(deliveries.every(m=>m.text.includes('/departments/upts?contractId=')));const mails=deliveries.length;await deliver();assert.equal(deliveries.length,mails,'delivered email is not re-sent');
  assert.equal((await request('/contracts/'+object.id,3,'DELETE',{version:object.version})).status,403);
  assert.equal((await request('/contracts/'+object.id,2,'DELETE',{version:999})).status,409);
  await ok(await request('/contracts/'+object.id,2,'DELETE',{version:object.version}));
  assert.equal((await request('/overview/'+object.id)).status,404);assert.equal(await db.workTask.count({where:{uptsContractId:object.id,deletedAt:null}}),0);assert.equal(await db.workProjectFile.count({where:{contractId:object.id,deletedAt:null}}),0);
  assert.equal((await request(`/files/${object.projectId}/${file.id}`,7)).status,404);
  assert.equal((await request(`/files/${object.projectId}/${file.id}`,2,'PATCH',{version:file.version+1,deleted:false})).status,409);
  const snapshot=await ok(await request('/upts'));assert(snapshot.projects.every((p:any)=>p.upts.contracts.every((c:any)=>c.id!==object.id)));
 }finally{server.closeAllConnections();server.close();await db.$disconnect();for(const f of generated)await rm(f,{force:true});await rm(storage,{recursive:true,force:true});await rm(storageRoot,{recursive:true,force:true});}
});
