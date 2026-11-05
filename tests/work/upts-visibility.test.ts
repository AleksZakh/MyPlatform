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
                  ? 'export async function resolveDomainGroupIds(e,id,login){return login==="ad-staff"?["11111111-1111-4111-8111-111111111111"]:[];} export async function directoryGroupUserIds(){return ["22222222-2222-4222-8222-222222222222"];} '
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
test('UPTS contract visibility, department roster, assignment, colors and revocation', async()=>{
 const app=h3.createApp({debug:false}), router=h3.createRouter(), server=createServer(h3.toNodeListener(app));
 try {
  const dep=await db.department.create({data:{key:'upts',name:'УПТС'}});
  await db.user.createMany({data:[2,3,4,5,6,7,8].map(id=>({id,login:'person-'+id,status:id===8?'BLOCKED':'ACTIVE',authType:'EXTERNAL',departmentId:[2,3,8].includes(id)?dep.id:null}))});
  const group=await db.spaceGroup.create({data:{name:'УПТС',users:{create:[{userId:5}]}}});
  await db.user.create({data:{id:9,login:'ad-staff',authType:'DOMAIN',status:'ACTIVE',directoryObjectId:'22222222-2222-4222-8222-222222222222'}});
  const ad=await db.domainGroup.create({data:{directoryObjectId:'11111111-1111-4111-8111-111111111111',name:'AD-UPTS',distinguishedName:'CN=UPTS,DC=example,DC=test'}});
  await db.spaceGroupDomain.create({data:{groupId:group.id,domainGroupId:ad.id}});
  for(const [path,file,method] of [
   ['/contracts','upts/contracts/index.post','post'],['/people','upts/people.get','get'],
   ['/upts','upts/index.get','get'],['/export','upts/export.get','get'],
   ['/tasks/:id','work/tasks/[id].get','get'],['/tasks/:id','work/tasks/[id].put','put'],
   ['/projects/:id','work/projects/[id].get','get'],['/projects/:id','work/projects/[id].put','put'],
  ]) (router as any)[method!](path,await handler('server/api/'+file+'.ts'));
  app.use(router);server.listen(0,'127.0.0.1');await once(server,'listening');
  const base='http://127.0.0.1:'+(server.address() as any).port;
  const request=(path:string,user=2,method='GET',body?:unknown)=>fetch(base+path,{method,headers:{'x-test-user':String(user),'x-space-work':'1','content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  async function ok(r:Response){const text=await r.text();assert.equal(r.status,200,text);return JSON.parse(text);}
  const body={number:'1',name:'Договор',counterparty:'',contractType:'OTHER',signedDate:null,dueDate:null,templateId:null,templateVersion:null,manualWorks:['Обследование']};
  async function contract(visibility?:string,memberIds:number[]=[]){return ok(await request('/contracts',2,'POST',{...body,clientKey:randomUUID(),visibility,memberIds}));}
  const privateC=await contract('PRIVATE'), team=await contract('TEAM',[3]), department=await contract(), all=await contract('UPTS_ALL');
  assert.equal((await db.workProject.findUniqueOrThrow({where:{id:department.projectId}})).scope,'UPTS_DEPARTMENT');
  assert.equal(new Set([privateC,team,department,all].map(c=>c.color)).size,4);
  for(const c of [privateC,team,department,all])assert.match(c.color,/^#[0-9a-f]{6}$/);
  assert.deepEqual((await ok(await request('/people'))).map((u:any)=>u.id).sort(),[2,3,5,9]);
  assert.equal((await request('/people',4)).status,403);
  assert.equal((await request('/people',9)).status,200,'AD-only group member is allowed');
  const visible=async(user:number)=>(await ok(await request('/upts',user))).projects.map((p:any)=>p.id).sort((a:number,b:number)=>a-b);
  assert.deepEqual(await visible(3),[team,department,all].map(c=>c.projectId).sort((a,b)=>a-b));
  assert.deepEqual(await visible(5),[department.projectId,all.projectId]);
  assert.deepEqual(await visible(6),[all.projectId]);
  assert.equal((await request('/upts',4)).status,403);
  assert.equal((await request('/contracts',2,'POST',{...body,clientKey:randomUUID(),visibility:'TEAM',memberIds:[4]})).status,400);
  assert.equal((await request('/contracts',2,'POST',{...body,clientKey:randomUUID(),visibility:'TEAM',memberIds:[]})).status,400);
  const t=await db.workTask.findFirstOrThrow({where:{uptsContractId:department.id}});
  const dto=await ok(await request('/tasks/'+t.id,3));assert.equal(dto.uptsContract.color,department.color);assert.equal(dto.canEdit,false);
  const change={clientKey:randomUUID(),version:t.version,title:t.title,description:'',kind:'TASK',status:'TODO',priority:'NORMAL',visibility:'PROJECT',projectId:t.projectId,departmentId:null,assigneeId:5,participantIds:[],plannedDate:null,startDate:null,dueDate:null,blockedReason:'',uptsContractId:department.id};
  assert.equal((await request('/tasks/'+t.id,3,'PUT',change)).status,403,'read access never permits assignment');
  assert.equal((await request('/tasks/'+t.id,2,'PUT',{...change,assigneeId:4})).status,400,'outsider cannot be assigned');
  const saved=await ok(await request('/tasks/'+t.id,2,'PUT',change));
  assert.equal(saved.assigneeId,5);assert.equal((await ok(await request('/tasks/'+t.id,5))).canEdit,true);
  await ok(await request('/tasks/'+t.id,2,'PUT',{...change,version:saved.version,assigneeId:9}));
  assert.equal((await ok(await request('/tasks/'+t.id,9))).canEdit,true,'AD-only employee can be assigned');
  assert(await db.auditLog.count({where:{entityType:'WorkProject',entityId:department.projectId,action:'MEMBER'}}));
  const privateTask=await db.workTask.findFirstOrThrow({where:{uptsContractId:privateC.id}});
  assert.equal((await request('/tasks/'+privateTask.id,2,'PUT',{...change,version:privateTask.version,projectId:privateC.projectId,uptsContractId:privateC.id})).status,400,'private visibility never expands silently');
  assert.equal((await request('/tasks/'+privateTask.id,3)).status,404);
  const own=await ok(await request('/contracts',3,'POST',{...body,clientKey:randomUUID(),visibility:'PRIVATE'}));
  const p=await ok(await request('/projects/'+own.projectId,3));
  await ok(await request('/projects/'+p.id,3,'PUT',{clientKey:randomUUID(),version:p.version,name:p.name,description:p.description,color:p.color,scope:'UPTS_ALL',departmentId:null,groupId:null,startDate:null,dueDate:null}));
  assert.equal((await request('/projects/'+p.id,6)).status,200,'UPTS owner may change contract visibility without a general projects grant');
  await db.spaceGroup.update({where:{id:group.id},data:{isActive:false}});
  assert.equal((await request('/tasks/'+t.id,9)).status,404,'AD link revocation removes project access');
  assert.equal((await request('/tasks/'+t.id,5)).status,404,'group revocation takes precedence over assigned project role');
  assert.deepEqual((await ok(await request('/people'))).map((u:any)=>u.id).sort(),[2,3]);
  await db.user.update({where:{id:3},data:{departmentId:null}});
  assert.equal((await request('/projects/'+team.projectId,3)).status,404,'department revocation overrides team role');
 } finally {server.closeAllConnections();server.close();await db.$disconnect();for(const f of generated)await rm(f,{force:true});}
});
