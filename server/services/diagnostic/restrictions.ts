
import {createHash} from 'node:crypto';
import {createError,type H3Event} from 'h3';
import {prisma} from '../../utils/prisma';
import {requirePermission} from '../access-control.service';
import {isSystemAdminLogin} from '../../../shared/utils/access-decision';
import {writeAuditEvent} from '../../utils/auditLog';
import {Prisma} from '@prisma/client';
import {ACCESS_ACTIONS} from '../../../shared/types/access-management';
export async function restrictions(event:H3Event,userId:number,body?:unknown){
 const actor=await requirePermission(event,'admin.users','VIEW');
 const target=await prisma.user.findUnique({where:{id:userId}});
 if(!target)throw createError({statusCode:404});
 const resource=await prisma.accessResource.findUnique({where:{key:'diagnostic.contracts'}});
 if(!resource)throw createError({statusCode:503,message:'Выполните миграцию договоров.'});
 const read=async(db:Prisma.TransactionClient)=>{
  const rows=await db.userPermissionDeny.findMany({where:{userId,resourceId:resource.id},orderBy:{action:'asc'}});
  const actions=rows.map(r=>r.action);
  return {actions,revision:createHash('sha256').update(JSON.stringify(actions)).digest('hex')};
 };
 if(body===undefined)return read(prisma);
 if(!actor.isSystemAdmin||isSystemAdminLogin(target.login,useRuntimeConfig(event).adminLogins))throw createError({statusCode:403,message:'Изменение запретов недоступно.'});
 const value=body as {actions?:unknown;revision?:unknown};
 if(!value||!Array.isArray(value.actions)||value.actions.length>4||value.actions.some(a=>!ACCESS_ACTIONS.includes(a))||new Set(value.actions).size!==value.actions.length||typeof value.revision!=='string')throw createError({statusCode:400,message:'Неверные параметры запретов.'});
 const actions=value.actions as Array<typeof ACCESS_ACTIONS[number]>;
 return prisma.$transaction(async tx=>{
  const before=await read(tx);
  if(value.revision!==before.revision)throw createError({statusCode:409,message:'Запреты изменились. Обновите страницу.'});
  await tx.userPermissionDeny.deleteMany({where:{userId,resourceId:resource.id}});
  if(actions.length)await tx.userPermissionDeny.createMany({data:actions.map(action=>({userId,resourceId:resource.id,action}))});
  await writeAuditEvent({event,db:tx,category:'ADMIN',action:'UPDATE',result:'SUCCESS',resourceKey:resource.key,actorUserId:actor.userId,targetUserId:userId,note:'Персональные ограничения договоров',changes:{denied:{before:before.actions,after:actions}}});
  return read(tx);
 },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
}
