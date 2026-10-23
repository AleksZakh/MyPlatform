
import {getHeader,createError,setHeader,type H3Event} from 'h3';
import {prisma} from '../../utils/prisma';
import {auditDenied} from '../../utils/auditLog';
import {resolveDomainGroupIds} from '../domain-group-directory.service';
import {getAccessActor,requirePermission} from '../access-control.service';
export const CONTRACT_RESOURCE='diagnostic.contracts';
export async function contractAccess(event:H3Event,action:'VIEW'|'CREATE'|'UPDATE'|'DELETE'){
 setHeader(event,'Cache-Control','private, no-store');
 if(event.context.externalSessionRevoked)throw createError({statusCode:401});
 if(action!=='VIEW'){
  if(getHeader(event,'x-space-diagnostic')!=='1'||getHeader(event,'sec-fetch-site')==='cross-site'||!getHeader(event,'content-type')?.startsWith('application/json'))throw createError({statusCode:403,message:'Запрос должен быть отправлен из Space.'});
  await requirePermission(event,CONTRACT_RESOURCE,'VIEW');
 }
 return requirePermission(event,CONTRACT_RESOURCE,action);
}

export const TRASH_RESOURCE='diagnostic.contracts.trash';
export async function requireContractTrash(event:H3Event,probe=false){
 await requirePermission(event,CONTRACT_RESOURCE,'VIEW',{auditDenial:!probe});
 const permission=await requirePermission(event,TRASH_RESOURCE,'VIEW',{auditDenial:!probe});
 const {user}=await getAccessActor(event);
 const groups=await prisma.spaceGroup.findMany({where:{isActive:true,name:{equals:'ОДИС',mode:'insensitive'}},select:{id:true,users:{where:{userId:user.id},select:{userId:true}},domainGroups:{where:{domainGroup:{isActive:true}},select:{domainGroup:{select:{directoryObjectId:true}}}}}});
 let member=groups.length===1&&groups[0]!.users.length>0;
 if(!member&&groups.length===1&&groups[0]!.domainGroups.length&&user.authType==='DOMAIN'&&user.directoryObjectId&&user.login){
  const ids=await resolveDomainGroupIds(event,user.directoryObjectId,user.login);
  member=groups[0]!.domainGroups.some(g=>ids.includes(g.domainGroup.directoryObjectId));
 }
 if(!member){
  if(!probe)await auditDenied({event,actorUserId:user.id,actorLogin:user.login,actorEmail:user.email,actorAuthType:user.authType,resourceKey:TRASH_RESOURCE,action:'VIEW',note:'Корзина договоров доступна только администраторам из группы ОДИС.'});
  throw createError({statusCode:403,message:'Для корзины требуется членство в ОДИС и право администрирования корзины.'});
 }
 return permission;
}
export async function canManageContractTrash(event:H3Event){
 try{await requireContractTrash(event,true);return true;}catch(e:any){if(e.statusCode===403||e.statusCode===503)return false;throw e;}
}
