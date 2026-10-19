import { createError, getQuery, type H3Event } from 'h3';
import { Prisma } from '@prisma/client';
import { prisma } from '../../utils/prisma';
import { writeAuditEvent } from '../../utils/auditLog';
import { workActor, hasWorkGrant } from './access';
import { projectWhere, taskWhere, projectRole, managesProject, seesProject, createsTask, taskRights, type Actor } from './policy';
import { parse, projectInput, taskInput, taskMove, memberInput, removeMemberInput, versionInput, archiveInput, commentInput, dbDay, positiveId } from './input';
const userSelect={id:true,login:true,fullName:true} as const;
const projectInclude={owner:{select:userSelect},department:{select:{id:true,key:true,name:true}},members:{include:{user:{select:userSelect}}}} as const;
const taskInclude={project:{include:projectInclude},assignee:{select:userSelect},participants:{select:{userId:true}},_count:{select:{comments:true}}} as const;
type DB=Prisma.TransactionClient;
type Project=Prisma.WorkProjectGetPayload<{include:typeof projectInclude}>;
type Task=Prisma.WorkTaskGetPayload<{include:typeof taskInclude}>;
function fail(statusCode:number,message:string):never {throw createError({statusCode,message});}
function version(current:number,requested:number|undefined){if(current!==requested)fail(409,'Запись уже изменилась. Обновите список и откройте её заново.');}
const projectDTO=(p:Project,a:Actor)=>({...p,canManage:managesProject(p,a),canCreateTask:createsTask(p,a),role:projectRole(p,a)});
const taskDTO=(t:Task,a:Actor)=>({...t,...taskRights(t,a),project:t.project ? {id:t.project.id,name:t.project.name,color:t.project.color}:null});
async function visibleProject(db:DB,id:number,a:Actor){const p=await db.workProject.findFirst({where:{id,...projectWhere(a)},include:projectInclude});return p || fail(404,'Проект не найден или недоступен.');}
async function visibleTask(db:DB,id:number,a:Actor){const t=await db.workTask.findFirst({where:{id,...taskWhere(a)},include:taskInclude});return t || fail(404,'Задача не найдена или недоступна.');}
async function activeUsers(db:DB,ids:number[]){if(!ids.length)return;const unique=[...new Set(ids)];const n=await db.user.count({where:{id:{in:unique},status:'ACTIVE'}});if(n!==unique.length)fail(400,'Один из участников неактивен или не найден.');}
function auditSnapshot(value:unknown):Prisma.InputJsonValue {
 const v=value as Record<string,any>; const result:Record<string,any>={};
 for(const key of ['id','version','status','priority','scope','visibility','projectId','departmentId','assigneeId','archivedAt','deletedAt','plannedDate','startDate','dueDate'])if(v?.[key]!==undefined)result[key]=v[key];
 if(Array.isArray(v?.members))result.members=v.members.map((m:any)=>({userId:m.userId,role:m.role}));
 return JSON.parse(JSON.stringify(result));
}
async function mutation<T>(event:H3Event,actor:Actor,entity:string,action:string,fn:(tx:DB)=>Promise<{id:number;value:T;changed?:boolean}>) {
 return prisma.$transaction(async tx=>{
  // One short module lock makes membership revocation and task writes atomic across workers.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(20261019)`;
  const r=await fn(tx);
  if(r.changed!==false)await writeAuditEvent({event,db:tx,actorUserId:actor.id,category:'DATA',result:'SUCCESS',resourceKey:'projects.shared',entityType:entity,entityId:r.id,action,afterData:auditSnapshot(r.value),note:'Задачи и проекты: '+action});
  return r.value;
 },{maxWait:5000,timeout:15000});
}
export async function context(event:H3Event){
 const a=await workActor(event);
 const [departments,canCreateShared,canAssign]=await Promise.all([prisma.department.findMany({where:{isActive:true},select:{id:true,key:true,name:true},orderBy:{name:'asc'}}),hasWorkGrant(event,'CREATE'),hasWorkGrant(event,'UPDATE')]);
 return {userId:a.id,department:departments.find(d=>d.id===a.departmentId)||null,departments,canCreateShared,canAssign,isSystemAdmin:a.isSystemAdmin};
}
export async function people(event:H3Event){
 await workActor(event);const q=getQuery(event);const term=String(q.q||'').trim().slice(0,100);
 const page=q.page?positiveId(q.page):1;
 const where:Prisma.UserWhereInput={status:'ACTIVE',...(term?{OR:[{fullName:{contains:term,mode:'insensitive'}},{login:{contains:term,mode:'insensitive'}}]}:{})};
 const [items,total]=await Promise.all([prisma.user.findMany({where,select:userSelect,orderBy:[{fullName:'asc'},{id:'asc'}],take:40,skip:(page-1)*40}),prisma.user.count({where})]);return {items,total,page};
}
export async function projects(event:H3Event){
 const a=await workActor(event);const q=getQuery(event);const page=q.page?positiveId(q.page):1;
 const where:Prisma.WorkProjectWhereInput={...projectWhere(a),archivedAt:q.archived==='1'?{not:null}:null};
 if(q.departmentId)where.departmentId=positiveId(q.departmentId);
 const [rows,total]=await Promise.all([prisma.workProject.findMany({where,include:projectInclude,orderBy:[{updatedAt:'desc'},{id:'desc'}],take:100,skip:(page-1)*100}),prisma.workProject.count({where})]);
 return {items:rows.map(p=>projectDTO(p,a)),total,page};
}
export async function getProject(event:H3Event,id:number){const a=await workActor(event);return projectDTO(await visibleProject(prisma,id,a),a);}
export async function saveProject(event:H3Event,raw:unknown,id?:number){
 const a=await workActor(event),v=parse(projectInput,raw);
 const shared=v.scope!=='PRIVATE';const grant=shared?await hasWorkGrant(event,'CREATE'):false;
 return mutation(event,a,'WorkProject',id?'UPDATE':'CREATE',async tx=>{
  const old=id?await visibleProject(tx,id,a):await tx.workProject.findUnique({where:{clientKey:v.clientKey},include:projectInclude});
  if(!id&&old){if(old.ownerId!==a.id)fail(409,'Ключ операции уже использован.');return {id:old.id,value:projectDTO(old,a),changed:false};}
  if(old){if(!managesProject(old,a))fail(403,'Изменять проект может руководитель.');version(old.version,v.version);if(old.archivedAt)fail(409,'Сначала восстановите проект из архива.');
   if(old.ownerId!==a.id&&(old.scope!==v.scope||old.departmentId!==v.departmentId))fail(403,'Видимость и отдел изменяет владелец проекта.');}
  if(shared&&(!old||old.scope==='PRIVATE'||old.departmentId!==v.departmentId)&&!grant)fail(403,'Создание общих проектов разрешает администратор.');
  if(v.scope==='PRIVATE'&&(v.departmentId||old?.members.length))fail(400,'Личный проект не может иметь отдел или участников.');
  if(v.scope==='DEPARTMENT'&&!v.departmentId)fail(400,'Выберите подразделение.');
  if(v.departmentId){const dep=await tx.department.findFirst({where:{id:v.departmentId,isActive:true}});if(!dep)fail(400,'Подразделение недоступно.');
   if((!old||old.departmentId!==v.departmentId)&&!a.isSystemAdmin&&v.departmentId!==a.departmentId)fail(403,'Можно создавать общие проекты своего подразделения.');}
  const data={name:v.name,description:v.description,color:v.color,scope:v.scope,departmentId:v.departmentId,startDate:dbDay(v.startDate),dueDate:dbDay(v.dueDate)};
  const p=id?await tx.workProject.update({where:{id},data:{...data,version:{increment:1}},include:projectInclude}):await tx.workProject.create({data:{...data,ownerId:a.id,clientKey:v.clientKey},include:projectInclude});
  return {id:p.id,value:projectDTO(p,a)};
 });
}
export async function archiveProject(event:H3Event,id:number,raw:unknown){const a=await workActor(event),v=parse(archiveInput,raw);
 return mutation(event,a,'WorkProject',v.archived?'ARCHIVE':'RESTORE',async tx=>{const p=await visibleProject(tx,id,a);if(!managesProject(p,a))fail(403,'Недостаточно прав.');version(p.version,v.version);
 const result=await tx.workProject.update({where:{id},data:{archivedAt:v.archived?new Date():null,version:{increment:1}},include:projectInclude});return {id,value:projectDTO(result,a)};});}
export async function saveMember(event:H3Event,id:number,raw:unknown){const a=await workActor(event),v=parse(memberInput,raw);
 return mutation(event,a,'WorkProject','MEMBER',async tx=>{const p=await visibleProject(tx,id,a);if(!managesProject(p,a)||p.archivedAt)fail(403,'Недостаточно прав.');version(p.version,v.version);
 if(p.scope==='PRIVATE')fail(400,'Сначала сделайте проект общим.');if(v.userId===p.ownerId)fail(400,'Владелец проекта сохраняет свои полномочия.');
 const old=p.members.find(m=>m.userId===v.userId);if(p.ownerId!==a.id&&(v.role==='MANAGER'||old?.role==='MANAGER'))fail(403,'Руководителей назначает владелец проекта.');
 await activeUsers(tx,[v.userId]);await tx.workProjectMember.upsert({where:{projectId_userId:{projectId:id,userId:v.userId}},create:{projectId:id,userId:v.userId,role:v.role},update:{role:v.role}});
 const r=await tx.workProject.update({where:{id},data:{version:{increment:1}},include:projectInclude});return {id,value:projectDTO(r,a)};});}
export async function removeMember(event:H3Event,id:number,raw:unknown){const a=await workActor(event),v=parse(removeMemberInput,raw);
 return mutation(event,a,'WorkProject','MEMBER_REMOVE',async tx=>{const p=await visibleProject(tx,id,a);if(!managesProject(p,a)||p.archivedAt)fail(403,'Недостаточно прав.');version(p.version,v.version);
 if(v.userId===p.ownerId)fail(400,'Нельзя исключить владельца.');const member=p.members.find(m=>m.userId===v.userId);if(!member)fail(404,'Участник не найден.');
 if(member.role==='MANAGER'&&p.ownerId!==a.id)fail(403,'Руководителей исключает владелец.');
 const open={projectId:id,assigneeId:v.userId,deletedAt:null,status:{not:'DONE'}};
 const count=await tx.workTask.count({where:open});
 if(count){if(!v.reassignTo||v.reassignTo===v.userId)fail(409,`У сотрудника ${count} незавершённых задач. Выберите нового исполнителя.`);
 if(v.reassignTo!==p.ownerId&&!p.members.some(m=>m.userId===v.reassignTo&&['MANAGER','MEMBER'].includes(m.role)))fail(400,'Исполнитель должен входить в команду проекта.');
 await activeUsers(tx,[v.reassignTo]);await tx.workTask.updateMany({where:open,data:{assigneeId:v.reassignTo,version:{increment:1}}});}
 await tx.workProjectMember.delete({where:{projectId_userId:{projectId:id,userId:v.userId}}});
 const result=await tx.workProject.update({where:{id},data:{version:{increment:1}},include:projectInclude});return {id,value:projectDTO(result,a)};});}
export async function tasks(event:H3Event){const a=await workActor(event),q=getQuery(event);const page=q.page?positiveId(q.page):1;
 const conditions:Prisma.WorkTaskWhereInput[]=[taskWhere(a)];
 if(q.projectId){const p=await visibleProject(prisma,positiveId(q.projectId),a);conditions.push({projectId:p.id});}
 else if(q.departmentId){const dep=positiveId(q.departmentId);conditions.push({OR:[{project:{departmentId:dep}},{projectId:null,departmentId:dep}]});}
 else conditions.push({OR:[{assigneeId:a.id},{creatorId:a.id},{participants:{some:{userId:a.id}}}]});
 if(q.completed!=='1')conditions.push({status:{not:'DONE'}});
 if(q.q)conditions.push({title:{contains:String(q.q).slice(0,200),mode:'insensitive'}});
 const where={AND:conditions};const [rows,total]=await Promise.all([prisma.workTask.findMany({where,include:taskInclude,orderBy:[{plannedDate:{sort:'asc',nulls:'last'}},{id:'desc'}],take:100,skip:(page-1)*100}),prisma.workTask.count({where})]);
 return {items:rows.map(t=>taskDTO(t,a)),total,page};}
export async function getTask(event:H3Event,id:number){const a=await workActor(event);const t=await visibleTask(prisma,id,a);
 return {...taskDTO(t,a),clientKey:t.clientKey};}
export async function saveTask(event:H3Event,raw:unknown,id?:number){const a=await workActor(event),v=parse(taskInput,raw);
 const needsShared=!v.projectId&&(v.visibility!=='PRIVATE'||(v.assigneeId!==null&&v.assigneeId!==a.id));
 const grant=needsShared?await hasWorkGrant(event,'UPDATE'):false;
 return mutation(event,a,'WorkTask',id?'UPDATE':'CREATE',async tx=>{
 const old=id?await visibleTask(tx,id,a):await tx.workTask.findUnique({where:{clientKey:v.clientKey},include:taskInclude});
 if(!id&&old){if(old.creatorId!==a.id||old.deletedAt||!(await tx.workTask.findFirst({where:{id:old.id,...taskWhere(a)}})))fail(409,'Ключ операции уже использован.');return {id:old.id,value:taskDTO(old,a),changed:false};}
 if(old){if(!taskRights(old,a).canEditDetails)fail(403,'Недостаточно прав для изменения задачи.');version(old.version,v.version);}
 const project=v.projectId?await visibleProject(tx,v.projectId,a):null;
 if(old?.projectId!==v.projectId&&old?.project&&!managesProject(old.project,a))fail(403,'Переносить задачи из проекта может руководитель.');
 if(project){if(!createsTask(project,a))fail(403,'В проекте нет права на изменение задач.');
 if(v.visibility!=='PROJECT'||v.departmentId||v.participantIds.length)fail(400,'Доступ к задаче определяется проектом.');
 if(v.assigneeId&&v.assigneeId!==project.ownerId&&!project.members.some(m=>m.userId===v.assigneeId&&['MANAGER','MEMBER'].includes(m.role)))fail(400,'Выберите исполнителя из команды проекта.');
 }else{
 if(v.visibility==='PROJECT')fail(400,'Выберите проект.');
 if(v.visibility==='PRIVATE'&&old&&old.creatorId!==a.id)fail(403,'Личной задачу может сделать только её автор.');
 if(v.visibility==='PRIVATE'&&(v.assigneeId!==a.id||v.participantIds.length||v.departmentId))fail(400,'Личная задача доступна только владельцу.');
 if(v.visibility==='DEPARTMENT'&&(!a.departmentId||v.departmentId!==a.departmentId))fail(403,'Доступны задачи своего активного подразделения.');
 if(v.visibility!=='DEPARTMENT'&&v.departmentId)fail(400,'У этой задачи не должно быть подразделения.');
 if(v.visibility!=='PARTICIPANTS'&&v.participantIds.length)fail(400,'Участники задаются только для совместной задачи.');
 const sharingChanged=!old||old.projectId!==null||old.visibility!==v.visibility||old.departmentId!==v.departmentId||old.assigneeId!==v.assigneeId||old.participants.map(p=>p.userId).sort().join()!==[...v.participantIds].sort().join();
 if(needsShared&&sharingChanged&&!grant)fail(403,'Создание совместных задач и назначение другим сотрудникам разрешает администратор.');
 if(v.visibility==='DEPARTMENT'&&v.assigneeId){const u=await tx.user.findUnique({where:{id:v.assigneeId},select:{departmentId:true}});if(u?.departmentId!==a.departmentId)fail(400,'Исполнитель должен состоять в этом подразделении.');}
 }
 await activeUsers(tx,[...(v.assigneeId?[v.assigneeId]:[]),...v.participantIds]);
 const data={title:v.title,description:v.description,kind:v.kind,status:v.status,priority:v.priority,visibility:v.visibility,
 projectId:v.projectId,departmentId:v.departmentId,assigneeId:v.assigneeId,plannedDate:dbDay(v.plannedDate),startDate:dbDay(v.startDate),dueDate:dbDay(v.dueDate),blockedReason:v.blockedReason};
 const saved=id?await tx.workTask.update({where:{id},data:{...data,version:{increment:1}}}):await tx.workTask.create({data:{...data,clientKey:v.clientKey,creatorId:a.id}});
 await tx.workTaskParticipant.deleteMany({where:{taskId:saved.id}});
 if(v.participantIds.length)await tx.workTaskParticipant.createMany({data:v.participantIds.map(userId=>({taskId:saved.id,userId}))});
 const t=await tx.workTask.findUniqueOrThrow({where:{id:saved.id},include:taskInclude});return {id:t.id,value:taskDTO(t,a)};
 });}
export async function moveTask(event:H3Event,id:number,raw:unknown){const a=await workActor(event),v=parse(taskMove,raw);
 return mutation(event,a,'WorkTask','UPDATE',async tx=>{const old=await visibleTask(tx,id,a);if(!taskRights(old,a).canEdit)fail(403,'Недостаточно прав.');version(old.version,v.version);
 const t=await tx.workTask.update({where:{id},data:{...(v.status!==undefined?{status:v.status}:{}),...(v.plannedDate!==undefined?{plannedDate:dbDay(v.plannedDate)}:{}),version:{increment:1}},include:taskInclude});return {id,value:taskDTO(t,a)};});}
export async function deleteTask(event:H3Event,id:number,raw:unknown){const a=await workActor(event),v=parse(versionInput,raw);
 return mutation(event,a,'WorkTask','DELETE',async tx=>{const old=await visibleTask(tx,id,a);if(!taskRights(old,a).canDelete)fail(403,'Недостаточно прав.');version(old.version,v.version);
 await tx.workTask.update({where:{id},data:{deletedAt:new Date(),version:{increment:1}}});return {id,value:{ok:true}};});}
export async function comments(event:H3Event,id:number){const a=await workActor(event);await visibleTask(prisma,id,a);const q=getQuery(event);const after=q.after?positiveId(q.after):0;
 return prisma.workTaskComment.findMany({where:{taskId:id,id:{gt:after}},include:{author:{select:userSelect}},orderBy:{id:'asc'},take:100});}
export async function addComment(event:H3Event,id:number,raw:unknown){const a=await workActor(event),v=parse(commentInput,raw);
 return mutation(event,a,'WorkTask','COMMENT',async tx=>{const t=await visibleTask(tx,id,a);if(!taskRights(t,a).canComment)fail(403,'Нет права на комментарии.');
 const old=await tx.workTaskComment.findUnique({where:{clientKey:v.clientKey}});if(old){if(old.taskId!==id||old.authorId!==a.id)fail(409,'Ключ операции уже использован.');return {id,value:old,changed:false};}
 const c=await tx.workTaskComment.create({data:{...v,taskId:id,authorId:a.id}});return {id,value:c};});}
