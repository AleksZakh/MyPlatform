import { createError, getQuery, type H3Event } from 'h3';
import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '../../utils/prisma';
import { workActor } from './access';
import { parse, positiveId } from './input';
import { managesProject, type Actor } from './policy';
import { mutation, visibleProject, version, fail, userSelect, projectInclude, projectDTO, activeUsers } from './service';
import { invitationTarget } from '../chat/invitation-input';
import { inviteDomainContact, provisionInvitationContact } from '../chat/invitations';
import { INVITATION_LIFETIME, INVITATION_COOLDOWN, bypassInvitationCooldown } from '../chat/invitation-policy';
import { directoryGroupUserIds } from '../domain-group-directory.service';
import type { Prisma } from '@prisma/client';
const roleInput=z.enum(['MANAGER','CURATOR','MEMBER','OBSERVER']);
const idInput=z.number().int().positive().max(2147483647);
const inviteInput=z.object({version:idInput,role:roleInput,target:invitationTarget}).strict();
const groupInput=z.object({version:idInput,groupId:idInput,revision:z.string().regex(/^[a-f0-9]{64}$/),role:roleInput,userIds:z.array(idInput).min(1).max(1000).refine(v=>new Set(v).size===v.length)}).strict();
const responseInput=z.object({decision:z.enum(['ACCEPT','DECLINE'])}).strict();
async function manager(db:Prisma.TransactionClient,id:number,a:Actor) {
 const p=await visibleProject(db,id,a);
 if(!managesProject(p,a)||p.archivedAt)fail(403,'Управление командой доступно руководителю активного проекта.');
 if(p.scope==='PRIVATE')fail(400,'Сначала измените видимость: «Только команда проекта».');
 return p;
}
function checkRole(ownerId:number,a:Actor,role:string){if(role==='MANAGER'&&ownerId!==a.id)fail(403,'Руководителей назначает владелец проекта.');}
export async function projectInvitations(event:H3Event,id:number){const a=await workActor(event);await manager(prisma,id,a);
 return prisma.workProjectInvitation.findMany({where:{projectId:id,status:{in:['SENDING','PENDING','DELIVERY_FAILED']},expiresAt:{gt:new Date()}},select:{id:true,user:{select:userSelect},role:true,status:true,expiresAt:true,createdAt:true},orderBy:{createdAt:'desc'}});
}
export async function inviteToProject(event:H3Event,id:number,raw:unknown){
 const a=await workActor(event),v=parse(inviteInput,raw);
 const before=await manager(prisma,id,a);version(before.version,v.version);checkRole(before.ownerId,a,v.role);
 const userId='userId' in v.target?v.target.userId:await provisionInvitationContact(event,a.id,v.target.directoryLogin,v.target.directoryObjectId);
 const reservation=await mutation(event,a,'WorkProject','INVITE',async tx=>{
  const p=await manager(tx,id,a);version(p.version,v.version);checkRole(p.ownerId,a,v.role);
  await activeUsers(tx,[a.id]);
  if(p.ownerId===userId||p.members.some(m=>m.userId===userId))fail(409,'Сотрудник уже входит в команду проекта.');
  const u=await tx.user.findUnique({where:{id:userId}});
  if(!u||(u.status!=='ACTIVE'&&!(u.authType==='DOMAIN'&&u.status==='PENDING_ACTIVATION')))fail(409,'Сотрудник недоступен для приглашения.');
  const now=new Date();const prior=await tx.workProjectInvitation.findUnique({where:{projectId_userId:{projectId:id,userId}}});
  if(prior&&['PENDING','SENDING'].includes(prior.status)&&prior.expiresAt>now)fail(409,'Приглашение уже ожидает ответа.');
  const sender=await tx.user.findUnique({where:{id:a.id},select:{login:true,authType:true,status:true}});
  if(!bypassInvitationCooldown(sender)&&prior&&now.getTime()-prior.createdAt.getTime()<INVITATION_COOLDOWN)fail(429,'Повторное приглашение доступно через 24 часа.');
  if(await tx.workProjectInvitation.count({where:{inviterId:a.id,createdAt:{gt:new Date(now.getTime()-3600000)}}})>=20)fail(429,'Можно отправить не более 20 приглашений в проекты за час.');
  const data={id:randomUUID(),projectId:id,userId,inviterId:a.id,role:v.role,status:u.status==='ACTIVE'?'PENDING':'SENDING',createdAt:now,expiresAt:new Date(now.getTime()+INVITATION_LIFETIME),respondedAt:null};
  const invitation=await tx.workProjectInvitation.upsert({where:{projectId_userId:{projectId:id,userId}},create:data,update:data});
  await tx.workProject.update({where:{id},data:{version:{increment:1}}});
  return {id,value:{invitationId:invitation.id,userId,status:invitation.status,role:invitation.role,expiresAt:invitation.expiresAt,projectName:p.name}};
 });
 if(reservation.status==='PENDING')return {ok:true,message:'Приглашение появилось у сотрудника в разделе «Задачи и проекты» → «Приглашения».'};
 try{
  // SMTP and live AD requests never hold the project transaction open.
  const mail=await inviteDomainContact(event,a.id,userId,{id,name:reservation.projectName});
  const updated=await mutation(event,a,'WorkProject','INVITE_DELIVERED',async tx=>{
   const n=await tx.workProjectInvitation.updateMany({where:{id:reservation.invitationId,status:'SENDING'},data:{status:'PENDING'}});
   return {id,value:{invitationId:reservation.invitationId,status:'PENDING'},changed:n.count>0};
  });
  return {ok:true,...updated,message:mail.sent?'Письмо отправлено. После входа через AD сотрудник сможет принять приглашение в проект.':'Письмо для активации уже отправлялось этому сотруднику. Повторное письмо не отправлено; приглашение в проект будет доступно после входа в Space.'};
 }catch(e){
  await prisma.workProjectInvitation.updateMany({where:{id:reservation.invitationId,status:'SENDING'},data:{status:'DELIVERY_FAILED'}});
  throw e;
 }
}
export async function cancelInvitation(event:H3Event,id:number,invitationId:string){
 const a=await workActor(event);if(!z.string().uuid().safeParse(invitationId).success)fail(400,'Неверное приглашение.');
 return mutation(event,a,'WorkProject','INVITE_CANCEL',async tx=>{
  const p=await manager(tx,id,a);const row=await tx.workProjectInvitation.findFirst({where:{id:invitationId,projectId:id}});
  if(!row)fail(404,'Приглашение не найдено.');checkRole(p.ownerId,a,row.role);
  if(!['PENDING','SENDING','DELIVERY_FAILED'].includes(row.status))fail(409,'Приглашение уже обработано.');
  await tx.workProjectInvitation.update({where:{id:row.id},data:{status:'CANCELLED',respondedAt:new Date()}});
  await tx.workProject.update({where:{id},data:{version:{increment:1}}});return {id,value:{ok:true,invitationId}};
 });
}
export async function myInvitations(event:H3Event){const a=await workActor(event);
 return prisma.workProjectInvitation.findMany({where:{userId:a.id,status:'PENDING',expiresAt:{gt:new Date()},project:{archivedAt:null,scope:{not:'PRIVATE'}}},select:{id:true,role:true,expiresAt:true,project:{select:{id:true,name:true,color:true}},inviter:{select:userSelect}},orderBy:{createdAt:'desc'}});
}
export async function respondToInvitation(event:H3Event,invitationId:string,raw:unknown){
 const a=await workActor(event),v=parse(responseInput,raw);if(!z.string().uuid().safeParse(invitationId).success)fail(400,'Неверное приглашение.');
 return mutation(event,a,'WorkProject',v.decision==='ACCEPT'?'INVITE_ACCEPT':'INVITE_DECLINE',async tx=>{
  const row=await tx.workProjectInvitation.findFirst({where:{id:invitationId,userId:a.id},include:{project:{include:projectInclude},inviter:{select:{id:true,status:true}}}});
  if(!row)fail(404,'Приглашение не найдено.');
  const p=row.project;
  // Repeated accepted requests return success only while the membership still exists.
  if(v.decision==='ACCEPT'&&row.status==='ACCEPTED'&&p.members.some(m=>m.userId===a.id))return {id:p.id,value:{ok:true,projectId:p.id},changed:false};
  if(row.status!=='PENDING'||row.expiresAt<=new Date())fail(409,'Приглашение уже обработано, отменено или истекло.');
  if(v.decision==='ACCEPT'){
   if(p.archivedAt||p.scope==='PRIVATE')fail(409,'Проект больше не принимает участников.');
   if(row.inviter.status!=='ACTIVE'||!managesProject(p,{id:row.inviterId,departmentId:null})||(row.role==='MANAGER'&&row.inviterId!==p.ownerId))fail(409,'Полномочия пригласившего изменились. Попросите владельца прислать новое приглашение.');
   await activeUsers(tx,[a.id]);
   // Do not overwrite a role assigned independently after invitation creation.
   await tx.workProjectMember.upsert({where:{projectId_userId:{projectId:p.id,userId:a.id}},create:{projectId:p.id,userId:a.id,role:row.role},update:{}});
  }
  await tx.workProjectInvitation.update({where:{id:row.id},data:{status:v.decision==='ACCEPT'?'ACCEPTED':'DECLINED',respondedAt:new Date()}});
  await tx.workProject.update({where:{id:p.id},data:{version:{increment:1}}});return {id:p.id,value:{ok:true,projectId:p.id}};
 });
}
export async function availableGroups(event:H3Event,id:number){const a=await workActor(event);await manager(prisma,id,a);
 const q=getQuery(event);const term=String(q.q||'').trim().slice(0,100);const page=q.page?positiveId(q.page):1;
 const where={isActive:true,...(term?{name:{contains:term,mode:'insensitive' as const}}:{})};
 const [items,total]=await Promise.all([prisma.spaceGroup.findMany({where,select:{id:true,name:true},orderBy:[{name:'asc'},{id:'asc'}],take:50,skip:(page-1)*50}),prisma.spaceGroup.count({where})]);return {items,total,page};
}
async function groupSnapshot(event:H3Event,groupId:number){
 const group=await prisma.spaceGroup.findFirst({where:{id:groupId,isActive:true},include:{users:{select:{userId:true}},domainGroups:{include:{domainGroup:true}}}});
 if(!group)fail(404,'Группа не найдена или выключена.');
 const directoryIds=new Set<string>();
 for(const link of group.domainGroups.filter(g=>g.domainGroup.isActive))for(const id of await directoryGroupUserIds(event,link.domainGroup.directoryObjectId))directoryIds.add(id);
 const all=await prisma.user.findMany({where:{OR:[{id:{in:group.users.map(m=>m.userId)}},...(directoryIds.size?[{authType:'DOMAIN' as const,directoryObjectId:{in:[...directoryIds]}}]:[])]},select:{...userSelect,status:true},orderBy:{id:'asc'}});
 const users=all.filter(u=>u.status==='ACTIVE').map(({status,...u})=>u);
 const revision=createHash('sha256').update(JSON.stringify({groupId,updatedAt:group.updatedAt,users:group.users.map(m=>m.userId).sort((a,b)=>a-b),domains:group.domainGroups.map(g=>[g.domainGroupId,g.domainGroup.isActive,g.domainGroup.directoryObjectId]).sort(),active:users.map(u=>u.id)})).digest('hex');
 return {group:{id:group.id,name:group.name},revision,users,skippedInactive:all.length-users.length,updatedAt:group.updatedAt};
}
export async function previewGroup(event:H3Event,id:number,groupId:number){const a=await workActor(event);await manager(prisma,id,a);const {updatedAt,...snapshot}=await groupSnapshot(event,groupId);return snapshot;}
export async function addGroupMembers(event:H3Event,id:number,raw:unknown){
 const a=await workActor(event),v=parse(groupInput,raw);const before=await manager(prisma,id,a);version(before.version,v.version);checkRole(before.ownerId,a,v.role);
 const snapshot=await groupSnapshot(event,v.groupId);if(snapshot.revision!==v.revision)fail(409,'Состав группы изменился. Обновите предварительный просмотр.');
 if(v.userIds.some(id=>!snapshot.users.some(u=>u.id===id)))fail(400,'Выберите сотрудников из показанного состава группы.');
 return mutation(event,a,'WorkProject','GROUP_MEMBERS_ADD',async tx=>{
  const p=await manager(tx,id,a);version(p.version,v.version);checkRole(p.ownerId,a,v.role);
  const group=await tx.spaceGroup.findUnique({where:{id:v.groupId}});
  if(!group?.isActive||group.updatedAt.getTime()!==snapshot.updatedAt.getTime())fail(409,'Группа изменилась. Обновите предварительный просмотр.');
  await activeUsers(tx,v.userIds);
  const addedIds=v.userIds.filter(id=>id!==p.ownerId&&!p.members.some(m=>m.userId===id));
  if(addedIds.length){
   await tx.workProjectMember.createMany({data:addedIds.map(userId=>({projectId:id,userId,role:v.role}))});
   await tx.workProjectInvitation.updateMany({where:{projectId:id,userId:{in:addedIds},status:{in:['PENDING','SENDING']}},data:{status:'CANCELLED',respondedAt:new Date()}});
  }
  const result=await tx.workProject.update({where:{id},data:{version:{increment:1}},include:projectInclude});
  return {id,value:{project:projectDTO(result,a),groupId:v.groupId,addedIds,unchanged:v.userIds.length-addedIds.length}};
 });
}
