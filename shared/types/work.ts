export const WORK_STATUSES = { TODO: 'Запланировано', IN_PROGRESS: 'В работе', REVIEW: 'На проверке', DONE: 'Готово' } as const;
export const WORK_KINDS = { TASK: 'Задача', BUG: 'Ошибка', IMPROVEMENT: 'Улучшение', RESEARCH: 'Исследование', MILESTONE: 'Этап / веха' } as const;
export const WORK_PRIORITIES = { LOW: 'Низкий', NORMAL: 'Обычный', HIGH: 'Высокий', URGENT: 'Срочный' } as const;
export const WORK_ROLES = { MANAGER: 'Руководитель', CURATOR: 'Куратор', MEMBER: 'Исполнитель', OBSERVER: 'Наблюдатель' } as const;
export const WORK_COLORS = ['#2563eb','#7c3aed','#0891b2','#059669','#c2410c','#be185d','#475569'];
export type WorkUser = { id: number; fullName: string | null; login: string | null };
export type WorkDepartment = { id: number; key: string; name: string };
export type WorkProjectDTO = {
 id: number; name: string; description: string; color: string; scope: string; ownerId: number; owner: WorkUser;
 groupId: number | null; group: {id:number;name:string;isActive:boolean} | null;
 departmentId: number | null; department: WorkDepartment | null; startDate: string | null; dueDate: string | null;
 archivedAt: string | null; version: number; canManage: boolean; canCreateTask: boolean; role: string | null;
 members: { userId: number; role: string; user: WorkUser }[];
};
export type WorkTaskDTO = {
 id: number; title: string; description: string; kind: string; status: string; priority: string; visibility: string;
 creatorId: number; assigneeId: number | null; departmentId: number | null; projectId: number | null;
 plannedDate: string | null; startDate: string | null; dueDate: string | null; blockedReason: string; version: number;
 assignee: WorkUser | null; project: { id: number; name: string; color: string } | null;
 participants: { userId: number }[]; _count: { comments: number };
 canEditDetails: boolean; canEdit: boolean; canDelete: boolean; canComment: boolean;
};
export type WorkContext = { userId: number; department: WorkDepartment | null; departments: WorkDepartment[]; groups: {id:number;name:string}[]; canCreateShared: boolean; canAssign: boolean; isSystemAdmin: boolean };
export const workUserName = (u: WorkUser | null | undefined) => u?.fullName || u?.login || (u ? `Сотрудник №${u.id}` : 'Без исполнителя');
