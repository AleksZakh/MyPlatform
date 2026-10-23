import {createError, defineEventHandler, setResponseHeader} from 'h3';
import {prisma} from '../../../utils/prisma';
import {requirePermission} from '../../../services/access-control.service';
import type {RolePreviewCatalog} from '../../../../shared/access/department-role-draft';

/** Read-only experiment. No role/grant/deny writes and no live AD bulk lookup. */
export default defineEventHandler(async event => {
 const actor=await requirePermission(event,'admin.center','VIEW');
 if(!actor.isSystemAdmin) throw createError({statusCode:403,message:'Эксперимент доступен только администратору Space.'});
 setResponseHeader(event,'Cache-Control','private, no-store');
 const [resources,groups,users,departments]=await Promise.all([
  prisma.accessResource.findMany({where:{isActive:true,OR:[{key:{startsWith:'lab.'}},{key:{startsWith:'diagnostic.'}}]},select:{key:true,name:true,type:true},orderBy:[{sortOrder:'asc'},{name:'asc'}]}),
  prisma.spaceGroup.findMany({where:{isActive:true},select:{id:true,name:true,users:{select:{userId:true}},_count:{select:{domainGroups:true}}},orderBy:{name:'asc'}}),
  prisma.user.findMany({where:{status:'ACTIVE',deletedAt:null},select:{id:true,fullName:true,login:true,departmentId:true,department:{select:{name:true}}},orderBy:[{fullName:'asc'},{id:'asc'}]}),
  prisma.department.findMany({where:{isActive:true},select:{id:true,name:true},orderBy:{name:'asc'}}),
 ]);
 return {actorId:actor.userId,
  scopes:[{key:'lab',name:'Лабораторный контроль'},{key:'diagnostic',name:'Диагностика ИССО'}].map(s=>({...s,resources:resources.filter(r=>r.key.startsWith(s.key+'.'))})),
  groups:groups.map(g=>({id:g.id,name:g.name,userIds:g.users.map(u=>u.userId),domainGroupCount:g._count.domainGroups})),
  users:users.map(u=>({id:u.id,name:u.fullName||u.login||`Сотрудник #${u.id}`,login:u.login||'',departmentId:u.departmentId,department:u.department?.name||null})),departments,
 } satisfies RolePreviewCatalog;
});
