import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import type {H3Event} from 'h3';
import type {Prisma} from '@prisma/client';
import {prisma} from '../utils/prisma';
import {writeAuditEvent} from '../utils/auditLog';
import {uptsActor} from './upts-access';
import {uptsPeople} from './upts-people';
import {visibleProject,fail,version,userSelect,projectDTO} from './work/service';
import {managesProject,taskRights,type Actor} from './work/policy';
import {parse} from './work/input';
import type {UptsObjectDetails,UptsWorkMeta} from '../../shared/types/upts-object';
type DB=Prisma.TransactionClient;
const id=z.number().int().positive();
const meta=(v:unknown)=>(v || {}) as UptsWorkMeta;
export async function objectAccess(db:DB,contractId:number,a:Actor){
 const c=await db.uptsContract.findFirst({where:{id:contractId,deletedAt:null}});if(!c)fail(404,'Объект не найден.');
 const p=await visibleProject(db,c.projectId,a);
 const details=c.objectDetails as UptsObjectDetails|null;
 return {c,p,canAssign:!p.archivedAt && (managesProject(p,a)||details?.engineerId===a.id)};
}
export async function addObjectMember(db:DB,p:Awaited<ReturnType<typeof visibleProject>>,userId:number){
 if(p.ownerId===userId)return;
 if(p.scope==='PRIVATE')fail(400,'Для назначения другого сотрудника измените видимость объекта.');
 const old=p.members.find(m=>m.userId===userId);
 if(old && !['MANAGER','MEMBER'].includes(old.role))fail(400,'Сотрудник имеет роль наблюдателя. Измените его права в команде объекта.');
 if(!old){await db.workProjectMember.create({data:{projectId:p.id,userId,role:'MEMBER'}});await db.workProject.update({where:{id:p.id},data:{version:{increment:1}}});p.members.push({userId,role:'MEMBER'} as any);}
}
export async function queueUptsNotice(db:DB,eventKey:string,actorId:number,recipientId:number|null,taskId:number,body:string){
 if(!recipientId)return;
 await db.uptsNotification.upsert({where:{eventKey},create:{id:randomUUID(),eventKey,actorId,recipientId,taskId,body:body.slice(0,3000)},update:{}});
}
async function audit(db:DB,event:H3Event,a:Actor,entityType:string,entityId:number,action:string,afterData:any){await writeAuditEvent({event,db,actorUserId:a.id,category:'DATA',result:'SUCCESS',resourceKey:'projects.shared',entityType,entityId,action,afterData:JSON.parse(JSON.stringify(afterData)),note:'УПТС: '+action});}
export async function objectDefaults(event:H3Event){
 const a=await uptsActor(event),people=await uptsPeople(event);
 const configured=Number(process.env.UPTS_DEFAULT_ENGINEER_ID || 0);
 const normalize=(s:string)=>s.toLocaleLowerCase('ru').replace(/ё/g,'е').replace(/\s+/g,' ').trim();
 const matches=people.filter(p=>configured?p.id===configured:/^гацаева алена(?: |$)/.test(normalize(p.fullName||'')));
 return {curatorId:a.id,engineerId:matches.length===1?matches[0]!.id:null,warning:matches.length===1?'':'Не удалось однозначно найти Гацаеву Алёну в списке УПТС. Выберите кадастрового инженера вручную.'};
}
export async function objectOverview(event:H3Event,contractId:number){
 const a=await uptsActor(event),{c,p,canAssign}=await objectAccess(prisma,contractId,a);
 const tasks=await prisma.workTask.findMany({where:{uptsContractId:c.id,deletedAt:null},orderBy:{id:'asc'},include:{assignee:{select:userSelect}}});
 tasks.sort((x,y)=>(meta(x.uptsWorkMeta).stageNumber||1)-(meta(y.uptsWorkMeta).stageNumber||1)||x.id-y.id);
 const counts=await prisma.workProjectFile.groupBy({by:['taskId'],where:{contractId:c.id,deletedAt:null,scope:'SHARED'},_count:{_all:true}});
 const notifications=canAssign?await prisma.uptsNotification.findMany({where:{taskId:{in:tasks.map(t=>t.id)}},select:{taskId:true,emailSentAt:true,chatSentAt:true,lastError:true},orderBy:{createdAt:'desc'},take:100}):[];
 return {object:c,project:projectDTO(p,a),canAssign,tasks:tasks.map(t=>({...t,...taskRights({...t,project:p},a),fileCount:counts.find(f=>f.taskId===t.id)?._count._all||0})),notifications};
}
export async function assignObjectWorks(event:H3Event,contractId:number,raw:unknown){
 const a=await uptsActor(event),v=parse(z.object({assigneeId:id,tasks:z.array(z.object({id,version:id}).strict()).min(1).max(5000).refine(v=>new Set(v.map(t=>t.id)).size===v.length)}).strict(),raw);
 if(!(await uptsPeople(event)).some(p=>p.id===v.assigneeId))fail(400,'Выберите действующего сотрудника УПТС.');
 return prisma.$transaction(async tx=>{await tx.$executeRaw`SELECT pg_advisory_xact_lock(20261019)`;
 const {c,p,canAssign}=await objectAccess(tx,contractId,a);if(!canAssign)fail(403,'Нет права распределять работы объекта.');
 const tasks=await tx.workTask.findMany({where:{uptsContractId:c.id,deletedAt:null,id:{in:v.tasks.map(t=>t.id)}}});
 if(tasks.length!==v.tasks.length)fail(400,'Некоторые работы отсутствуют в объекте.');
 for(const t of tasks){version(t.version,v.tasks.find(x=>x.id===t.id)!.version);if(t.status==='DONE'||t.status==='CANCELLED')fail(400,'Завершённые и отменённые работы нельзя переназначать.');}
 await addObjectMember(tx,p,v.assigneeId);
 for(const t of tasks){if(t.assigneeId===v.assigneeId)continue;const after=await tx.workTask.update({where:{id:t.id},data:{assigneeId:v.assigneeId,version:{increment:1}}});await audit(tx,event,a,'WorkTask',t.id,'ASSIGN',after);await queueUptsNotice(tx,`assign:${t.id}:${after.version}`,a.id,v.assigneeId,t.id,`Вам назначена работа «${t.title}» по объекту «${c.number}». Статус: ${t.status==='IN_PROGRESS'?'выполняется':'запланировано'}.`);}
 return {updated:tasks.length};},{timeout:15000});
}
export async function saveUptsWork(event:H3Event,taskId:number,raw:unknown){
 const a=await uptsActor(event),v=parse(z.object({version:id,title:z.string().trim().min(1).max(250),assigneeId:id.nullable(),status:z.enum(['TODO','IN_PROGRESS','REVIEW','DONE']),resultText:z.string().trim().max(5000)}).strict(),raw);
 const staff=await uptsPeople(event);
 return prisma.$transaction(async tx=>{await tx.$executeRaw`SELECT pg_advisory_xact_lock(20261019)`;
 const t=await tx.workTask.findFirst({where:{id:taskId,deletedAt:null}});if(!t?.uptsContractId)fail(404,'Работа не найдена.');
 const {c,p,canAssign}=await objectAccess(tx,t.uptsContractId,a);const rights=taskRights({...t,project:p},a);
 if(p.archivedAt||(!rights.canEdit&&!canAssign))fail(403,'Нет права изменять работу.');version(t.version,v.version);
 if(t.assigneeId!==v.assigneeId){if(!canAssign)fail(403,'Исполнителей распределяет руководитель работ объекта.');if(v.assigneeId){if(!staff.some(p=>p.id===v.assigneeId))fail(400,'Исполнитель недоступен.');await addObjectMember(tx,p,v.assigneeId);}}
 if(t.title!==v.title&&!rights.canEditDetails&&!canAssign)fail(403,'Нет права менять название.');
 const before=meta(t.uptsWorkMeta),files=await tx.workProjectFile.count({where:{taskId:t.id,deletedAt:null,scope:'SHARED'}});
 const hasResult=!!v.resultText || files>0;
 const completing=hasResult && !before.completedAt;
 const status=hasResult?'DONE':v.status;
 if(status==='DONE'&&!hasResult)fail(400,'Введите результат работы или прикрепите итоговый документ.');
 const now=new Date().toISOString();
 const after=await tx.workTask.update({where:{id:t.id},data:{title:v.title,assigneeId:v.assigneeId,status,version:{increment:1},uptsWorkMeta:{...before,resultText:v.resultText,...(status==='IN_PROGRESS'&&!before.startedAt?{startedAt:now}:{}),...(completing?{completedAt:now}: {})}}});
 await audit(tx,event,a,'WorkTask',t.id,'UPDATE',after);
 if(completing){
 const ordered=await tx.workTask.findMany({where:{uptsContractId:c.id,deletedAt:null},orderBy:{id:'asc'}});ordered.sort((x,y)=>(meta(x.uptsWorkMeta).stageNumber||1)-(meta(y.uptsWorkMeta).stageNumber||1)||x.id-y.id);
 const next=ordered.slice(ordered.findIndex(x=>x.id===t.id)+1).find(x=>!['DONE','CANCELLED'].includes(x.status));
 if(next && next.status==='TODO'){
 let assigneeId=next.assigneeId;
 if(!assigneeId){const fallback=(c.objectDetails as UptsObjectDetails)?.engineerId;if(fallback&&staff.some(p=>p.id===fallback)){await addObjectMember(tx,p,fallback);assigneeId=fallback;}}
 const nm=meta(next.uptsWorkMeta);const started=await tx.workTask.update({where:{id:next.id},data:{assigneeId,status:'IN_PROGRESS',version:{increment:1},uptsWorkMeta:{...nm,startedAt:nm.startedAt||now}}});await audit(tx,event,a,'WorkTask',next.id,'START',started);
 await queueUptsNotice(tx,`start:${t.id}:${next.id}`,a.id,assigneeId,next.id,`Предыдущая работа «${t.title}» по объекту «${c.number}» выполнена. Ваша работа «${next.title}» перешла в статус «Выполняется». Приступите к выполнению.`);
 }
 }
 if(t.assigneeId!==v.assigneeId)await queueUptsNotice(tx,`assign:${t.id}:${after.version}`,a.id,v.assigneeId,t.id,`Вам назначена работа «${t.title}» по объекту «${c.number}».`);
 return after;},{timeout:15000});
}
export async function removeUptsObject(event:H3Event,contractId:number,raw:unknown){
 const a=await uptsActor(event),v=parse(z.object({version:id}).strict(),raw);
 return prisma.$transaction(async tx=>{await tx.$executeRaw`SELECT pg_advisory_xact_lock(20261019)`;const {c,p}=await objectAccess(tx,contractId,a);if(!managesProject(p,a)||p.archivedAt)fail(403,'Удаление доступно руководителю активного объекта.');version(c.version,v.version);
 const now=new Date();await tx.workTask.updateMany({where:{uptsContractId:c.id,deletedAt:null},data:{deletedAt:now,version:{increment:1}}});await tx.workProjectFile.updateMany({where:{contractId:c.id,deletedAt:null},data:{deletedAt:now,version:{increment:1}}});
 const after=await tx.uptsContract.update({where:{id:c.id},data:{deletedAt:now,version:{increment:1}}});await audit(tx,event,a,'UptsContract',c.id,'DELETE',after);return {ok:true};},{timeout:15000});
}
