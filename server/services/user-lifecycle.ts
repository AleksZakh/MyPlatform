import { Prisma } from '@prisma/client';
import { createError, type H3Event } from 'h3';
import { prisma } from '../utils/prisma';
import { getAccessActor, requirePermission } from './access-control.service';
import { isSystemAdminLogin } from '../../shared/utils/access-decision';
import { disconnectAccount } from './user-realtime-revoke';

export const DELETED_ACCOUNT = 'Удалённый аккаунт';
const RESOURCE = 'admin.users.lifecycle';
export type LifecycleAction = 'block' | 'disable' | 'restore' | 'delete';
function fail(code:number,message:string):never { throw createError({statusCode:code,message}); }
export async function lifecycleCapabilities(event:H3Event) {
 const allowed = async (action:'UPDATE'|'DELETE') => {try {await requirePermission(event,RESOURCE,action,{auditDenial:false});return true;}catch(e){if((e as any).statusCode===403)return false;throw e;}};
 const [update,remove]=await Promise.all([allowed('UPDATE'),allowed('DELETE')]);return {update,delete:remove};
}
async function inspect(db:Prisma.TransactionClient,id:number) {
 const user=await db.user.findUnique({where:{id},select:{id:true,authType:true,status:true,deletedAt:true,fullName:true,email:true,login:true,updatedAt:true,passwordHash:true,externalSessionVersion:true}});
 if(!user || user.authType!=='EXTERNAL')fail(404,'Внешний пользователь не найден.');
 const [projects,tasks,privateFiles,messages]=await Promise.all([
  db.workProject.findMany({where:{ownerId:id,archivedAt:null},select:{id:true,name:true},orderBy:{id:'asc'}}),
  db.workTask.count({where:{OR:[{assigneeId:id},{creatorId:id}],deletedAt:null,status:{notIn:['DONE','CANCELLED']}}}),
  db.workProjectFile.count({where:{ownerId:id,scope:'PRIVATE',deletedAt:null}}),
  db.chatMessage.count({where:{senderId:id}}),
 ]);
 return {user,impact:{projects,tasks,privateFiles,messages}};
}
export async function readLifecycle(event:H3Event,id:number){
 await requirePermission(event,'admin.users','VIEW');
 const capabilities=await lifecycleCapabilities(event);
 if(!capabilities.update&&!capabilities.delete)await requirePermission(event,RESOURCE,'VIEW');
 const {user,impact}=await inspect(prisma,id);
 return {user:{id:user.id,name:user.fullName||user.email||`#${id}`,status:user.status,deletedAt:user.deletedAt,revision:user.updatedAt.toISOString(),canRestore:!!user.passwordHash},impact,capabilities};
}
export function parseLifecycle(value:unknown){
 const v=value as Record<string,unknown>;
 if(!v||typeof v!=='object'||!['block','disable','restore','delete'].includes(String(v.action))||typeof v.revision!=='string'||!Number.isFinite(Date.parse(v.revision))||typeof v.reason!=='string'||v.reason.trim().length<3||v.reason.length>500)fail(400,'Укажите действие, причину (3–500 символов) и обновите сведения об аккаунте.');
 if(v.action==='delete'&&v.confirmation!=='УДАЛИТЬ')fail(400,'Для удаления введите УДАЛИТЬ.');
 if(v.reviewed!==true)fail(400,'Подтвердите ознакомление с последствиями действия.');
 return {action:v.action as LifecycleAction,revision:v.revision as string,reason:(v.reason as string).trim()};
}
export async function changeLifecycle(event:H3Event,id:number,input:ReturnType<typeof parseLifecycle>){
 await requirePermission(event,'admin.users','VIEW');
 const permission=await requirePermission(event,RESOURCE,input.action==='delete'?'DELETE':'UPDATE');
 if(permission.userId===id)fail(409,'Изменять доступ собственной учётной записи здесь нельзя.');
 const result=await prisma.$transaction(async tx=>{
  const actor=await getAccessActor(event,tx);
  await tx.$queryRaw`SELECT id FROM app_users WHERE id = ${id} FOR UPDATE`;
  const user=await tx.user.findUnique({where:{id}});
  if(!user||user.authType!=='EXTERNAL')fail(404,'Внешний пользователь не найден.');
  if(isSystemAdminLogin(user.login,useRuntimeConfig(event).adminLogins))fail(403,'Системного администратора нельзя изменить этим действием.');
  if(user.deletedAt)fail(409,'Аккаунт удалён без возможности восстановления.');
  if(user.updatedAt.toISOString()!==input.revision)fail(409,'Состояние аккаунта изменилось. Обновите сведения и повторите действие.');
  if(input.action==='restore'&&!['BLOCKED','DISABLED'].includes(user.status))fail(409,'Восстановление доступно только для заблокированного или отключённого аккаунта.');
  if(input.action!=='delete'&&!user.passwordHash)fail(409,'Регистрация не завершена. Используйте процедуру активации; здесь доступно только удаление заявки и аккаунта.');
  const status=input.action==='restore'?'ACTIVE':input.action==='block'?'BLOCKED':'DISABLED';
  if(input.action!=='delete'&&status===user.status)fail(409,'Аккаунт уже находится в выбранном состоянии.');
  const changed=await tx.user.update({where:{id},data:{status,externalSessionVersion:{increment:1},passwordResetTokenHash:null,passwordResetExpiresAt:null,passwordResetRequestedAt:null,activationTokenHash:null,activationExpiresAt:null,activationSentAt:null,
   ...(input.action==='delete'?{deletedAt:new Date(),login:null,email:null,directoryObjectId:null,fullName:DELETED_ACCOUNT,organization:null,position:null,passwordHash:null,departmentId:null,registrationRequestId:null,activatedAt:null}:{})}});
  if(input.action!=='restore'){
   await tx.workProjectInvitation.updateMany({where:{OR:[{userId:id},{inviterId:id}],status:{in:['PENDING','SENDING']}},data:{status:'CANCELLED',respondedAt:new Date(),expiresAt:new Date()}});
   await tx.domainChatInvitation.deleteMany({where:{OR:[{recipientId:id},{senderId:id}]}});
  }
  if(input.action==='delete'){
   await tx.userPermission.deleteMany({where:{userId:id}});
   await tx.spaceGroupUser.deleteMany({where:{userId:id}});
   await tx.workProjectMember.deleteMany({where:{userId:id}});
   await tx.workTaskParticipant.deleteMany({where:{userId:id}});
   // Keep chat membership as an archive relation: old direct dialogs still name their peer.
   await tx.userProfile.deleteMany({where:{userId:id}});
   await tx.userPreference.deleteMany({where:{userId:id}});
   await tx.libraryVideoPosition.deleteMany({where:{userId:id}});
   await tx.auditLog.updateMany({where:{OR:[{actorUserId:id},...(user.email?[{actorUserId:null,actorEmail:user.email}]:[])]},data:{actorUserId:id,actorLogin:null,actorEmail:DELETED_ACCOUNT,ipAddress:null,userAgent:null}});
   const requests=await tx.registrationRequest.findMany({where:{OR:[...(user.registrationRequestId?[{id:user.registrationRequestId}]:[]),...(user.email?[{email:{equals:user.email,mode:'insensitive' as const}}]:[])]},select:{id:true}});
   const requestIds=requests.map(r=>r.id);
   if(requestIds.length){
    await tx.registrationRequestGroup.deleteMany({where:{registrationRequestId:{in:requestIds}}});
    await tx.registrationRequestResource.deleteMany({where:{registrationRequestId:{in:requestIds}}});
    await tx.registrationRequest.updateMany({where:{id:{in:requestIds}},data:{fullName:DELETED_ACCOUNT,organization:'',position:'',email:'',accessReason:null,adminComment:null,verificationTokenHash:null,verificationExpiresAt:null,status:'COMPLETED'}});
   }
  }
  // An audit failure must roll back the account operation too.
  await tx.auditLog.create({data:{category:'ADMIN',result:'SUCCESS',action:input.action==='delete'?'DELETE':'UPDATE',resourceKey:RESOURCE,entityType:'User',entityId:id,targetUserId:id,actorUserId:actor.user.id,actorLogin:actor.user.login,actorEmail:actor.user.email||actor.user.login||`user:${actor.user.id}`,actorAuthType:actor.user.authType,note:input.reason,beforeData:{status:user.status},afterData:{status,deleted:input.action==='delete'},changedFields:['status',...(input.action==='delete'?['deletedAt']:[])]}});
  return {status:changed.status,deleted:!!changed.deletedAt,version:changed.externalSessionVersion};
 },{timeout:15000});
 const realtimeDisconnected=await disconnectAccount(`EXTERNAL:${id}`);
 return {success:true,...result,realtimeDisconnected};
}
