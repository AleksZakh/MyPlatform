import {createError,type H3Event} from 'h3';
import {prisma} from '../../utils/prisma';
import {adCache} from '../../utils/adCache';
import {directoryGroupUserIds} from '../domain-group-directory.service';
import {findDomainUser,type DirectoryUser} from '../ad-directory.service';
import {writeAuditEvent} from '../../utils/auditLog';
const normalized=(s:string)=>s.normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('ru');
const departmentWhere={isActive:true,OR:[{key:{in:['diagnostic','diagnostics']}},{name:{equals:'ОДИС',mode:'insensitive' as const}},{name:{equals:'Диагностика',mode:'insensitive' as const}},{resources:{some:{isOwner:true,resource:{key:'diagnostic.contracts'}}}}]};
/** Employee roster, not login/access roles. Never activates accounts or grants permissions. */
export async function tripParticipants(event:H3Event){
 const [departments,groups,cache]=await Promise.all([
  prisma.department.findMany({where:departmentWhere,include:{directoryMappings:true}}),
  prisma.spaceGroup.findMany({where:{isActive:true,name:{equals:'ОДИС',mode:'insensitive'}},include:{users:{select:{userId:true}},domainGroups:{where:{domainGroup:{isActive:true}},include:{domainGroup:true}}}}),adCache.get(),
 ]);
 const departmentNames=new Set(['одис',...departments.flatMap(d=>[d.name,...d.directoryMappings.map(m=>m.directoryName)]).map(normalized)]);
 const directoryIds=new Set<string>();const warnings:string[]=[];
 if(!departments.length)warnings.push('Подразделение ОДИС не настроено в справочнике отделов: список составлен по группе ОДИС и одноимённому подразделению AD. Проверьте сопоставление подразделений.');
 if(!cache)warnings.push('Кэш сотрудников AD недоступен: показаны только зарегистрированные сотрудники отдела и группы ОДИС.');
 else if(!Number.isFinite(Date.parse(cache.lastUpdated))||Date.now()-Date.parse(cache.lastUpdated)>86400000)warnings.push('Кэш сотрудников AD старше суток. Обновите его в администрировании.');
 for(const g of groups)for(const link of g.domainGroups){try{for(const id of await directoryGroupUserIds(event,link.domainGroup.directoryObjectId))directoryIds.add(id.toLowerCase());}catch{warnings.push('Не удалось прочитать состав доменной группы ОДИС. Список дополнен сотрудниками подразделения.');}}
 const profiles=(cache?.users||[]).filter(u=>u.directoryObjectId&&u.login&&!u.accountDisabled&&(departmentNames.has(normalized(u.department||''))||directoryIds.has(u.directoryObjectId.toLowerCase())));
 const cachedByGuid=new Map((cache?.users||[]).filter(u=>u.directoryObjectId).map(u=>[u.directoryObjectId!.toLowerCase(),u]));
 for(const p of profiles)directoryIds.add(p.directoryObjectId!.toLowerCase());
 // Read all matching identities, including blocked ones, so they cannot reappear as "AD only".
 const users=await prisma.user.findMany({where:{OR:[{departmentId:{in:departments.map(d=>d.id)}},{id:{in:groups.flatMap(g=>g.users.map(u=>u.userId))}},{directoryObjectId:{in:[...directoryIds],mode:'insensitive'}}]},select:{id:true,fullName:true,login:true,directoryObjectId:true,status:true,deletedAt:true,authType:true},orderBy:[{fullName:'asc'},{id:'asc'}]});
 const known=new Set(users.map(u=>u.directoryObjectId?.toLowerCase()).filter(Boolean));
 const items=users.filter(u=>!u.deletedAt&&(u.status==='ACTIVE'||u.authType==='DOMAIN'&&u.status==='PENDING_ACTIVATION')&&!cachedByGuid.get(u.directoryObjectId?.toLowerCase()||'')?.accountDisabled).map(u=>({id:u.id,name:u.fullName||u.login||String(u.id)}));
 const directoryParticipants=[...new Map(profiles.filter(u=>!known.has(u.directoryObjectId!.toLowerCase())).map(u=>[u.directoryObjectId!.toLowerCase(),{directoryObjectId:u.directoryObjectId!.toLowerCase(),name:u.fullName||u.login}])).values()].sort((a,b)=>a.name.localeCompare(b.name,'ru'));
 const withoutGuid=(cache?.users||[]).filter(u=>!u.directoryObjectId&&!u.accountDisabled&&departmentNames.has(normalized(u.department||''))).length;
 if(withoutGuid)warnings.push(`${withoutGuid} сотрудников AD без objectGUID: обновите кэш; сопоставление по ФИО не выполняется.`);
 return {items,directoryParticipants,warning:[...new Set(warnings)].join(' ')||null};
}
/** Resolve an explicitly selected AD employee to a local FK, without enabling login. */
export async function resolveTripParticipant(event:H3Event,actorId:number,value:unknown){
 if(typeof value!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value))throw createError({statusCode:400,message:'Выберите сотрудника из списка AD.'});
 const guid=value.toLowerCase(),roster=await tripParticipants(event);
 if(!roster.directoryParticipants.some(p=>p.directoryObjectId===guid)){
  const existing=await prisma.user.findFirst({where:{directoryObjectId:{equals:guid,mode:'insensitive'}}});
  const option=roster.items.find(p=>p.id===existing?.id);if(option)return option;
  throw createError({statusCode:409,message:'Сотрудник больше не доступен в составе ОДИС. Обновите список.'});
 }
 const cached=(await adCache.get())?.users.find(u=>u.directoryObjectId?.toLowerCase()===guid);
 let profile:DirectoryUser|null=null;try{if(cached)profile=await findDomainUser(cached.login,event);}catch{throw createError({statusCode:503,message:'Не удалось проверить сотрудника в AD. Повторите добавление после восстановления связи.'});}
 if(!profile||profile.directoryObjectId?.toLowerCase()!==guid||profile.accountDisabled)throw createError({statusCode:409,message:'Учётная запись сотрудника в AD недоступна или изменилась.'});
 const verified=profile;
 // The live department must still match, or current group membership must confirm the employee.
 const departments=await prisma.department.findMany({where:departmentWhere,include:{directoryMappings:true}});
 const names=new Set(['одис',...departments.flatMap(d=>[d.name,...d.directoryMappings.map(m=>m.directoryName)]).map(normalized)]);
 if(!names.has(normalized(verified.department||''))){
  const groups=await prisma.spaceGroup.findMany({where:{isActive:true,name:{equals:'ОДИС',mode:'insensitive'}},include:{domainGroups:{where:{domainGroup:{isActive:true}},include:{domainGroup:true}}}});
  let member=false;for(const g of groups)for(const l of g.domainGroups)if((await directoryGroupUserIds(event,l.domainGroup.directoryObjectId)).includes(guid))member=true;
  if(!member)throw createError({statusCode:409,message:'AD больше не подтверждает принадлежность сотрудника к ОДИС.'});
 }
 return prisma.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(71914,2)`;
  const existing=await tx.user.findFirst({where:{directoryObjectId:{equals:guid,mode:'insensitive'}}});
  if(existing){if(existing.deletedAt||existing.authType!=='DOMAIN'||!['ACTIVE','PENDING_ACTIVATION'].includes(existing.status))throw createError({statusCode:409,message:'Учётная запись сотрудника заблокирована или недоступна.'});return {id:existing.id,name:existing.fullName||existing.login||String(existing.id)};}
  if(await tx.user.findFirst({where:{OR:[{login:{equals:verified.login,mode:'insensitive'}},...(verified.email?[{email:{equals:verified.email,mode:'insensitive' as const}}]:[])]}}))throw createError({statusCode:409,message:'Логин или почта уже связаны с другой записью. Проверьте сопоставление сотрудника с AD в администрировании.'});
  const department=departments.find(d=>[d.name,...d.directoryMappings.map(m=>m.directoryName)].some(n=>normalized(n)===normalized(verified.department||'')));
  const u=await tx.user.create({data:{authType:'DOMAIN',status:'PENDING_ACTIVATION',directoryObjectId:guid,login:verified.login,email:verified.email?.toLowerCase()||null,fullName:verified.fullName,position:verified.position,organization:verified.company,departmentId:department?.id??null}});
  await writeAuditEvent({event,db:tx,category:'DATA',action:'CREATE',result:'SUCCESS',resourceKey:'diagnostic.contracts',entityType:'User',entityId:u.id,actorUserId:actorId,note:'Участник командировки подготовлен из AD без активации входа и выдачи прав.'});
  return {id:u.id,name:u.fullName||u.login||String(u.id)};
 },{isolationLevel:'Serializable',timeout:30000,maxWait:15000});
}
