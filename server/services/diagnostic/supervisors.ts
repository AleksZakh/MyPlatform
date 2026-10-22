
import type {H3Event} from 'h3';
import {prisma} from '../../utils/prisma';
import {directoryGroupUserIds} from '../domain-group-directory.service';
export async function diagnosticSupervisors(event:H3Event){
 const groups=await prisma.spaceGroup.findMany({where:{isActive:true,name:{equals:'ОДИС',mode:'insensitive'}},include:{users:{select:{userId:true}},domainGroups:{where:{domainGroup:{isActive:true}},include:{domainGroup:true}}}});
 if(groups.length!==1)return {items:[],warning:'Не найдена единственная активная группа Space «ОДИС». Проверьте её в центре администрирования.'};
 const g=groups[0]!;let directoryIds:string[]=[];let warning:string|null=null;
 for(const link of g.domainGroups){
  try{directoryIds.push(...await directoryGroupUserIds(event,link.domainGroup.directoryObjectId));}
  catch{warning='Не удалось проверить участников доменных групп ОДИС. Доступны только подтверждённые участники.';}
 }
 const items=await prisma.user.findMany({where:{status:'ACTIVE',deletedAt:null,OR:[{id:{in:g.users.map(u=>u.userId)}},...(directoryIds.length?[{authType:'DOMAIN' as const,directoryObjectId:{in:directoryIds}}]:[])]},select:{id:true,fullName:true,login:true,email:true},orderBy:[{fullName:'asc'},{id:'asc'}]});
 return {items:items.map(u=>({id:u.id,name:u.fullName||u.login||u.email||String(u.id)})),warning};
}
