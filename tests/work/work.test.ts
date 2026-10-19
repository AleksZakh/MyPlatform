import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile,writeFile,unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { PrismaClient } from '@prisma/client';
import * as h3 from 'h3';
import {createServer} from 'node:http';import {once} from 'node:events';
import { timeBucket, shiftDay, portalToday } from '../../shared/utils/work-board';
import { taskInput } from '../../server/services/work/input';
const url=process.env.WORK_TEST_DATABASE_URL||'';
if(!url||!new URL(url).pathname.endsWith('_work_test'))throw new Error('Disposable *_work_test database required');
const db=new PrismaClient({datasources:{db:{url}}});Object.assign(globalThis,h3,{workTestDb:db});
const generated:string[]=[];
async function handler(file:string){const out=await build({entryPoints:[file],bundle:true,write:false,platform:'node',format:'esm',packages:'external',plugins:[{name:'test-context',setup(b){
 b.onResolve({filter:/access-control.service$/},()=>({path:'auth',namespace:'test'}));b.onResolve({filter:/utils\/prisma$/},()=>({path:'db',namespace:'test'}));
 b.onLoad({filter:/.*/,namespace:'test'},args=>({loader:'js',contents:args.path==='db'?'export const prisma=globalThis.workTestDb;':`
 export async function getAccessActor(e){const id=Number(e.node.req.headers['x-test-user']);if(!id)throw Object.assign(new Error('auth'),{statusCode:401});const user=await globalThis.workTestDb.user.findUnique({where:{id},include:{department:true}});if(!user||user.status!=='ACTIVE')throw Object.assign(new Error('inactive'),{statusCode:403});return {user,isSystemAdmin:id===1};}
 export async function requirePermission(e,key,action){const a=await getAccessActor(e);if(![1,2].includes(a.user.id))throw Object.assign(new Error('denied'),{statusCode:403});return {userId:a.user.id};}
 `}));}}]});const fileOut=resolve('tests/work/.test-'+generated.length+'.mjs');generated.push(fileOut);await writeFile(fileOut,out.outputFiles[0]!.text);return (await import(pathToFileURL(fileOut).href)).default;}
const taskBody=(extra:any={})=>({clientKey:randomUUID(),title:'Задача',description:'Результат',kind:'TASK',status:'TODO',priority:'NORMAL',visibility:'PRIVATE',projectId:null,departmentId:null,assigneeId:2,participantIds:[],plannedDate:'2026-10-19',startDate:null,dueDate:'2026-10-23',blockedReason:'',...extra});
const projectBody=(extra:any={})=>({clientKey:randomUUID(),name:'Проект',description:'Цель',color:'#2563eb',scope:'TEAM',departmentId:1,startDate:'2026-10-19',dueDate:'2026-11-01',...extra});
test('Dates and board semantics',()=>{
 assert.equal(shiftDay('2026-12-31',1),'2027-01-01');assert.equal(portalToday(new Date('2026-10-19T22:00:00Z')),'2026-10-20');
 assert.equal(timeBucket({status:'TODO',plannedDate:'2026-10-20',dueDate:'2026-10-18'},'2026-10-19'),'overdue');
 assert.equal(timeBucket({status:'DONE',plannedDate:null,dueDate:'2020-01-01'},'2026-10-19'),'done');
 assert.equal(timeBucket({status:'TODO',plannedDate:null,dueDate:'2026-10-25'},'2026-10-19'),'unscheduled');
 assert.equal(taskInput.safeParse(taskBody({plannedDate:'2026-02-30'})).success,false);
 assert.equal(taskInput.safeParse(taskBody({startDate:'2026-11-01',dueDate:'2026-10-20'})).success,false);
});
test('HTTP + database: privacy, department scope, roles, lifecycle, conflicts, idempotency and audit',async()=>{
 const app=h3.createApp({debug:false}),router=h3.createRouter(),server=createServer(h3.toNodeListener(app));
 try{
 await db.department.createMany({data:[{id:1,key:'it',name:'ИТ'},{id:2,key:'lab',name:'Лаборатория'}]});
 await db.user.createMany({data:[{id:1,login:'admin',departmentId:1},{id:2,login:'owner',departmentId:1},{id:3,login:'colleague',departmentId:1},{id:4,login:'other',departmentId:2},{id:5,login:'observer',departmentId:2},{id:6,login:'blocked',departmentId:1}].map(u=>({...u,authType:'DOMAIN' as const,status:u.id===6?'BLOCKED' as const:'ACTIVE' as const}))});
 const routes=[['/context','context.get','get'],['/people','people.get','get'],['/projects','projects/index.get','get'],['/projects','projects/index.post','post'],['/projects/:id','projects/[id].get','get'],['/projects/:id','projects/[id].put','put'],['/projects/:id/archive','projects/[id]/archive.post','post'],['/projects/:id/members','projects/[id]/members.put','put'],['/projects/:id/members','projects/[id]/members.delete','delete'],['/tasks','tasks/index.get','get'],['/tasks','tasks/index.post','post'],['/tasks/:id','tasks/[id].get','get'],['/tasks/:id','tasks/[id].put','put'],['/tasks/:id','tasks/[id].patch','patch'],['/tasks/:id','tasks/[id].delete','delete'],['/tasks/:id/comments','tasks/[id]/comments.get','get'],['/tasks/:id/comments','tasks/[id]/comments.post','post']];
 for(const [route,file,method] of routes)(router as any)[method!](route,await handler('server/api/work/'+file+'.ts'));
 app.use(router);server.listen(0,'127.0.0.1');await once(server,'listening');const port=(server.address() as any).port;
 async function call(path:string,method='GET',body?:any,user=2,csrf=true){return fetch('http://127.0.0.1:'+port+path,{method,headers:{'x-test-user':String(user),...(csrf?{'x-space-work':'1'}:{}),'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});}
 async function ok(r:Response){const text=await r.text();assert.equal(r.status,200,text);return JSON.parse(text);}
 assert.equal((await call('/tasks','GET',undefined,0)).status,401);assert.equal((await call('/context','GET',undefined,6)).status,403);
 assert.equal((await call('/tasks','POST',taskBody(),2,false)).status,403);
 const input=taskBody(),personal=await ok(await call('/tasks','POST',input));assert.equal((await ok(await call('/tasks','POST',input))).id,personal.id);
 for(const user of [1,3,4]){assert.equal((await call('/tasks/'+personal.id,'GET',undefined,user)).status,404);assert.equal((await ok(await call('/tasks','GET',undefined,user))).total,0);}
 const moved=await ok(await call('/tasks/'+personal.id,'PATCH',{version:personal.version,plannedDate:'2026-10-20'}));assert.equal(moved.dueDate,personal.dueDate);
 assert.equal((await call('/tasks/'+personal.id,'PATCH',{version:personal.version,status:'DONE'})).status,409);
 assert.equal((await call('/tasks','POST',taskBody({visibility:'PRIVATE',assigneeId:3}))).status,400);
 assert.equal((await call('/tasks','POST',taskBody({visibility:'DEPARTMENT',departmentId:2}))).status,403);
 assert.equal((await call('/projects','POST',projectBody(),3)).status,403);
 const mine=await ok(await call('/projects','POST',projectBody({scope:'PRIVATE',departmentId:null}),3));assert.equal((await call('/projects/'+mine.id,'GET',undefined,2)).status,404);
 const shared=await ok(await call('/tasks','POST',taskBody({visibility:'PARTICIPANTS',assigneeId:3,participantIds:[4]})));
 assert.equal((await call('/tasks/'+shared.id,'GET',undefined,4)).status,200);assert.equal((await call('/tasks/'+shared.id,'PATCH',{version:1,status:'DONE'},4)).status,403);
 await ok(await call('/tasks/'+shared.id,'PATCH',{version:1,status:'IN_PROGRESS'},3));assert.equal((await call('/tasks/'+shared.id,'PUT',taskBody({version:2,visibility:'PRIVATE',assigneeId:3}),3)).status,403);
 const dept=await ok(await call('/tasks','POST',taskBody({visibility:'DEPARTMENT',departmentId:1})));
 assert.equal((await call('/tasks/'+dept.id,'GET',undefined,3)).status,200);assert.equal((await call('/tasks/'+dept.id,'GET',undefined,4)).status,404);
 let p=await ok(await call('/projects','POST',projectBody()));const pBody=projectBody({name:p.name});
 p=await ok(await call('/projects/'+p.id+'/members','PUT',{version:p.version,userId:3,role:'MEMBER'}));
 p=await ok(await call('/projects/'+p.id+'/members','PUT',{version:p.version,userId:5,role:'OBSERVER'}));
 assert.equal((await call('/projects/'+p.id+'/members','PUT',{version:p.version,userId:6,role:'MEMBER'})).status,400);
 const pi=taskBody({visibility:'PROJECT',projectId:p.id,assigneeId:3});let pt=await ok(await call('/tasks','POST',pi));
 assert.equal((await call('/tasks/'+pt.id,'GET',undefined,4)).status,404);assert.equal((await call('/tasks/'+pt.id,'GET',undefined,5)).status,200);
 assert.equal((await call('/tasks/'+pt.id,'PATCH',{version:pt.version,status:'DONE'},5)).status,403);assert.equal((await call('/tasks/'+pt.id+'/comments','POST',{clientKey:randomUUID(),body:'test'},5)).status,403);
 pt=await ok(await call('/tasks/'+pt.id,'PATCH',{version:pt.version,status:'IN_PROGRESS'},3));
 const c={clientKey:randomUUID(),body:'Работа начата'};const c1=await ok(await call('/tasks/'+pt.id+'/comments','POST',c,3));assert.equal((await ok(await call('/tasks/'+pt.id+'/comments','POST',c,3))).id,c1.id);
 assert.equal((await call('/tasks/'+pt.id,'PUT',{...pi,version:pt.version,projectId:null,visibility:'PRIVATE',assigneeId:3},3)).status,403);
 assert.equal((await call('/projects/'+p.id+'/members','DELETE',{version:p.version,userId:3})).status,409);
 p=await ok(await call('/projects/'+p.id+'/members','DELETE',{version:p.version,userId:3,reassignTo:2}));
 assert.equal((await call('/tasks/'+pt.id,'GET',undefined,3)).status,404);assert.equal((await ok(await call('/tasks/'+pt.id))).assigneeId,2);
 p=await ok(await call('/projects/'+p.id+'/archive','POST',{version:p.version,archived:true}));
 pt=await ok(await call('/tasks/'+pt.id));assert.equal(pt.canEdit,false);assert.equal((await call('/tasks/'+pt.id,'PATCH',{version:pt.version,status:'DONE'})).status,403);
 p=await ok(await call('/projects/'+p.id+'/archive','POST',{version:p.version,archived:false}));
 // Department projects are visible to department peers; read access grants no write rights.
 p=await ok(await call('/projects/'+p.id,'PUT',{...pBody,version:p.version,scope:'DEPARTMENT'}));
 assert.equal((await call('/tasks/'+pt.id,'GET',undefined,3)).status,200);assert.equal((await call('/tasks/'+pt.id,'PATCH',{version:pt.version,status:'DONE'},3)).status,403);
 await ok(await call('/tasks/'+personal.id,'DELETE',{version:moved.version}));assert.equal((await call('/tasks/'+personal.id)).status,404);assert.ok((await db.workTask.findUniqueOrThrow({where:{id:personal.id}})).deletedAt);
 const audit=await db.auditLog.findMany({where:{resourceKey:'projects.shared'}});assert.ok(audit.some(a=>a.action==='MEMBER_REMOVE'));assert.ok(audit.some(a=>a.action==='COMMENT'));assert.ok(audit.every(a=>a.actorUserId));
 assert.equal(await db.workTaskComment.count({where:{taskId:pt.id}}),1);
 console.log('Privacy, participant removal, reassignment, department access, observer denial, date move, soft delete, idempotency and audit verified.');
 } finally {server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));await db.$disconnect();for(const file of generated)await unlink(file);}
});
