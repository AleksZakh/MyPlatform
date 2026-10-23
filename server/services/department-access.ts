import {createHash} from 'node:crypto';
import {Prisma} from '@prisma/client';
import type {H3Event} from 'h3';
import {prisma} from '../utils/prisma';
import {writeAuditEvent} from '../utils/auditLog';
import {getAccessActor} from './access-control.service';
import {buildAccessSnapshot} from './access-management.service';
import {getDomainGroupContext,emptyDomainGroupContext,type DomainGroupContext} from './domain-group-access.service';
import {accessError,parseAccessId} from './access-input';
import {requireDepartmentManager,parseScope} from './department-access-guard';
import {ACCESS_ACTIONS,type AccessSubjectKind} from '../../shared/types/access-management';
import {scopeRows,scopeChanges,liveCapabilities,type ScopeRequest,type ScopedSnapshot,type ScopePlan,type DepartmentScope} from '../../shared/access/live-policy';
export function parseKind(value:unknown):AccessSubjectKind {
 if(typeof value!=='string'||!['user','spaceGroup','department','domainGroup'].includes(value))accessError(400,'INVALID_KIND','Выберите получателя.');
 return value as AccessSubjectKind;
}
export function parseScopeRequest(value:unknown):ScopeRequest {
 const v=value as ScopeRequest;
 if(!v||typeof v!=='object'||!Array.isArray(v.ids)||v.ids.length<1||v.ids.length>10)accessError(400,'INVALID_BATCH','Выберите от 1 до 10 получателей.');
 const scope=parseScope(v.scope),kind=parseKind(v.kind),ids=v.ids.map(parseAccessId);
 if(new Set(ids).size!==ids.length)accessError(400,'DUPLICATE_TARGET','Повторный получатель.');
 if(!v.rights||liveCapabilities.some(c=>typeof v.rights[c.key]!=='boolean'))accessError(400,'INVALID_RIGHTS','Неверный шаблон.');
 const rights=Object.fromEntries(liveCapabilities.map(c=>[c.key,v.rights[c.key]])) as ScopeRequest['rights'];
 if(!rights.view&&Object.values(rights).some(Boolean))accessError(400,'VIEW_REQUIRED','Для остальных действий нужен просмотр.');
 if(rights.restore&&!rights.delete)accessError(400,'DELETE_REQUIRED','Для восстановления договоров нужно право удаления.');
 if(v.denied!==null&&(!Array.isArray(v.denied)||kind!=='user'||v.denied.some(a=>!ACCESS_ACTIONS.includes(a))||new Set(v.denied).size!==v.denied.length))accessError(400,'INVALID_DENIAL','Неверные персональные запреты.');
 return {scope,kind,ids,rights,denied:v.denied};
}
async function membership(event:H3Event,kind:AccessSubjectKind,id:number){
 if(kind!=='user')return emptyDomainGroupContext();
 const user=await prisma.user.findUnique({where:{id},select:{authType:true,login:true,directoryObjectId:true,status:true}});
 return user?getDomainGroupContext(event,user):emptyDomainGroupContext();
}
async function snapshot(db:Prisma.TransactionClient,event:H3Event,kind:AccessSubjectKind,id:number,scope:DepartmentScope,groups:DomainGroupContext):Promise<ScopedSnapshot>{
 const full=await buildAccessSnapshot(db,kind,id,useRuntimeConfig(event).adminLogins,true,groups);
 const data=scopeRows(full.data,scope);
 const denied=kind==='user'?await db.userPermissionDeny.findMany({where:{userId:id,resourceId:{in:data.map(r=>r.id)}},select:{resourceId:true,action:true},orderBy:[{resourceId:'asc'},{action:'asc'}]}):[];
 denied.sort((a,b)=>a.resourceId-b.resourceId||a.action.localeCompare(b.action));
 const revision=createHash('sha256').update(JSON.stringify([full.revision,denied])).digest('hex');
 return {...full,revision,data,denied,summary:{totalResources:data.length,directPermissions:data.reduce((n,r)=>n+ACCESS_ACTIONS.filter(a=>r.actions[a].directGranted).length,0),effectivePermissions:data.reduce((n,r)=>n+ACCESS_ACTIONS.filter(a=>r.actions[a].effectiveGranted).length,0)}};
}
export async function readDepartmentAccess(event:H3Event,scope:DepartmentScope,kind:AccessSubjectKind,id:number){
 await requireDepartmentManager(event,scope);
 const groups=await membership(event,kind,id);
 return prisma.$transaction(tx=>snapshot(tx,event,kind,id,scope,groups),{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead,timeout:15000});
}
function planned(s:ScopedSnapshot,input:ScopeRequest):ScopePlan['subjects'][number]{
 if(s.subject.isSystemAdmin)accessError(400,'SYSTEM_ADMIN_TARGET','Права системного администратора задаются конфигурацией, а не шаблоном отдела.');
 if(s.directoryWarning)accessError(409,'DIRECTORY_UNAVAILABLE',s.directoryWarning+' Изменения не применены.');
 if(!s.data.some(r=>r.key===input.scope+'.access-admin'&&r.isActive))accessError(503,'MIGRATION_REQUIRED','Примените миграцию управления доступом подразделений.');
 const changes=scopeChanges(s.data,input.rights).map(c=>({...c,name:s.data.find(r=>r.id===c.resourceId)!.name}));
 for(const c of changes)if(c.granted&&!s.data.find(r=>r.id===c.resourceId)!.actions[c.action].canGrant)accessError(400,'TARGET_INACTIVE','Нельзя выдавать права отключённому получателю или ресурсу.');
 const denialsAfter=input.denied===null?s.denied:s.data.filter(r=>r.isActive).flatMap(r=>input.denied!.map(action=>({resourceId:r.id,action}))).sort((a,b)=>a.resourceId-b.resourceId||a.action.localeCompare(b.action));
 return {id:s.subject.id,name:s.subject.name,revision:s.revision,changes,denialsBefore:s.denied,denialsAfter,warnings:[
  ...(s.data.some(r=>ACCESS_ACTIONS.some(a=>r.actions[a].inheritedGranted||r.actions[a].domainGroups.length||r.actions[a].spaceGroups?.length))?['Наследуемые права сохраняются. Отзыв прямого назначения не отменяет доступ через группы.']:[]),
  ...(denialsAfter.length?['Персональные запреты имеют приоритет над разрешениями.']:[]),
  ...(input.scope==='diagnostic'&&input.rights.restore?['Корзина договоров дополнительно проверяет членство в группе ОДИС.']:[]),
 ]};
}
export async function departmentPlan(event:H3Event,input:ScopeRequest,revisions?:Record<string,string>){
 const viewer=await requireDepartmentManager(event,input.scope);
 const actorGroups=await membership(event,'user',viewer.user.id);
 if(actorGroups.warning&&!viewer.isSystemAdmin)accessError(409,'DIRECTORY_UNAVAILABLE',actorGroups.warning);
 const memberships=new Map<number,DomainGroupContext>();
 for(const id of input.ids)memberships.set(id,await membership(event,input.kind,id));
 return prisma.$transaction(async tx=>{
  const actor=await getAccessActor(event,tx);
  if(!actor.isSystemAdmin){
   const current=await buildAccessSnapshot(tx,'user',actor.user.id,useRuntimeConfig(event).adminLogins,false,actorGroups);
   if(!current.data.find(r=>r.key===input.scope+'.access-admin')?.actions.UPDATE.effectiveGranted)accessError(403,'SCOPE_DENIED','Управление подразделением больше недоступно.');
  }
  const subjects:ScopePlan['subjects']=[];
  for(const id of input.ids){
   const s=await snapshot(tx,event,input.kind,id,input.scope,memberships.get(id)!);
   if(revisions&&revisions[String(id)]!==s.revision)accessError(409,'ACCESS_REVISION_CONFLICT','Назначения или состав групп изменились. Сформируйте новый план.');
   subjects.push(planned(s,input));
  }
  if(revisions)for(const p of subjects){
   const model=input.kind==='user'?tx.userPermission:input.kind==='department'?tx.departmentPermission:input.kind==='domainGroup'?tx.domainGroupPermission:tx.spaceGroupPermission;
   const fk=input.kind==='user'?'userId':input.kind==='department'?'departmentId':input.kind==='domainGroup'?'domainGroupId':'groupId';
   const removed=p.changes.filter(c=>!c.granted),added=p.changes.filter(c=>c.granted);
   if(removed.length)await (model as any).deleteMany({where:{[fk]:p.id,OR:removed.map(c=>({resourceId:c.resourceId,action:c.action}))}});
   if(added.length)await (model as any).createMany({data:added.map(c=>({[fk]:p.id,resourceId:c.resourceId,action:c.action,grantedByLogin:actor.user.login}))});
   const denialChange=JSON.stringify(p.denialsBefore)!==JSON.stringify(p.denialsAfter);
   if(input.kind==='user'&&input.denied!==null&&denialChange){
    const resources=await tx.accessResource.findMany({where:{key:{startsWith:input.scope+'.'}},select:{id:true}});
    await tx.userPermissionDeny.deleteMany({where:{userId:p.id,resourceId:{in:resources.map(r=>r.id)}}});
    if(p.denialsAfter.length)await tx.userPermissionDeny.createMany({data:p.denialsAfter.map(d=>({...d,userId:p.id}))});
   }
   if(p.changes.length||denialChange)await writeAuditEvent({event,db:tx,category:'ADMIN',action:'UPDATE',result:'SUCCESS',resourceKey:input.scope+'.access-admin',entityType:'DepartmentAccess',actorUserId:actor.user.id,actorLogin:actor.user.login,actorEmail:actor.user.email||actor.user.login||`user:${actor.user.id}`,actorAuthType:actor.user.authType,targetUserId:input.kind==='user'?p.id:undefined,note:`Права подразделения: ${input.scope} — ${p.name}`,changes:{subject:{before:{kind:input.kind,id:p.id},after:{kind:input.kind,id:p.id}},permissions:{before:p.changes.map(c=>({resourceId:c.resourceId,action:c.action,granted:!c.granted})),after:p.changes.map(c=>({resourceId:c.resourceId,action:c.action,granted:c.granted}))},denials:{before:p.denialsBefore,after:p.denialsAfter}}});
  }
  return {subjects,count:subjects.reduce((n,p)=>n+p.changes.length+(JSON.stringify(p.denialsBefore)!==JSON.stringify(p.denialsAfter)?1:0),0)} satisfies ScopePlan;
 },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,maxWait:5000,timeout:20000}).catch(error=>{
  if(['P2034','P2002'].includes(error?.code))accessError(409,'ACCESS_REVISION_CONFLICT','Параллельное изменение прав. Сформируйте новый план.');
  throw error;
 });
}
