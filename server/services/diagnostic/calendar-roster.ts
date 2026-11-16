import type {H3Event} from 'h3';
import {prisma} from '../../utils/prisma';
import {directoryGroupUserIds} from '../domain-group-directory.service';
/** Membership of Space ОДИС only; department and trip rosters do not grant membership. */
export async function calendarRoster(event:H3Event){
 const groups=await prisma.spaceGroup.findMany({where:{isActive:true,name:{equals:'ОДИС',mode:'insensitive'}},include:{users:{select:{userId:true}},domainGroups:{where:{domainGroup:{isActive:true}},include:{domainGroup:true}}}});
 if(groups.length!==1)return {employees:[],users:[],warning:'Не найдена единственная активная группа Space «ОДИС». Проверьте состав группы в администрировании.'};
 const group=groups[0]!,memberIds=new Set(group.users.map(u=>u.userId)),guids=new Set<string>();let warning:string|null=null;
 for(const l of group.domainGroups){try{for(const guid of await directoryGroupUserIds(event,l.domainGroup.directoryObjectId))guids.add(guid.toLowerCase());}catch{warning='Не удалось проверить доменные группы ОДИС. Показаны только подтверждённые участники Space и доступных доменных групп.';}}
 // Use the full non-deleted identity set to detect ambiguous initials, including users outside ОДИС.
 const users=await prisma.user.findMany({where:{deletedAt:null},select:{id:true,fullName:true,login:true,directoryObjectId:true,status:true,authType:true},orderBy:[{fullName:'asc'},{id:'asc'}]});
 const employees=users.filter(u=>memberIds.has(u.id)||u.authType==='DOMAIN'&&guids.has(u.directoryObjectId?.toLowerCase()||'')).map(u=>({id:u.id,name:u.fullName||u.login||String(u.id)}));
 return {employees,users:users.map(u=>({id:u.id,name:u.fullName||u.login||String(u.id),login:u.login})),warning};
}
