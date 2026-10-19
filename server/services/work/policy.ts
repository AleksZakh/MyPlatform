import type { Prisma } from '@prisma/client';
export type Actor = { id: number; departmentId: number | null };
export type ProjectPolicy = { ownerId: number; scope: string; departmentId: number | null; archivedAt: Date | string | null; members: {userId:number;role:string}[] };
export function projectRole(p: ProjectPolicy, a: Actor): string | null {
 return p.ownerId === a.id ? 'OWNER' : p.members.find(m => m.userId === a.id)?.role || null;
}
export const managesProject = (p: ProjectPolicy,a:Actor) => ['OWNER','MANAGER'].includes(projectRole(p,a) || '');
export const seesProject = (p:ProjectPolicy,a:Actor) => !!projectRole(p,a) || (p.scope === 'DEPARTMENT' && !!a.departmentId && p.departmentId === a.departmentId);
export const createsTask = (p:ProjectPolicy,a:Actor) => !p.archivedAt && ['OWNER','MANAGER','MEMBER'].includes(projectRole(p,a)||'');
export function projectWhere(a:Actor): Prisma.WorkProjectWhereInput {
 return { OR: [{ownerId:a.id},{members:{some:{userId:a.id}}}, ...(a.departmentId ? [{scope:'DEPARTMENT',departmentId:a.departmentId}] : [])] };
}
export function taskWhere(a:Actor): Prisma.WorkTaskWhereInput {
 return { deletedAt:null, OR:[ {projectId:{not:null},project:projectWhere(a)},
 {projectId:null, OR:[{creatorId:a.id}, {visibility:'PARTICIPANTS',OR:[{assigneeId:a.id},{participants:{some:{userId:a.id}}}]},
 ...(a.departmentId ? [{visibility:'DEPARTMENT',departmentId:a.departmentId}] : [])]} ] };
}
export function taskRights(t: {creatorId:number;assigneeId:number|null;project:ProjectPolicy|null}, a:Actor) {
 if (t.project) { const role=projectRole(t.project,a); const manager=managesProject(t.project,a);
 return { canEditDetails:!t.project.archivedAt && (manager || (role === 'MEMBER' && (t.creatorId===a.id || t.assigneeId===a.id))), canEdit:!t.project.archivedAt && (manager || (role === 'MEMBER' && (t.creatorId===a.id || t.assigneeId===a.id))),
 canDelete:!t.project.archivedAt && (manager || (role==='MEMBER' && t.creatorId===a.id)),
 canComment:!t.project.archivedAt && !!role && role!=='OBSERVER' }; }
 return {canEditDetails:t.creatorId===a.id,canEdit:t.creatorId===a.id||t.assigneeId===a.id,canDelete:t.creatorId===a.id,canComment:true};
}
