/** Experimental policy only. Never consumed by the production authorization guard. */
export const capabilities = [
 { key: 'view', label: 'Открытие и просмотр', description: 'Просмотр данных всех ресурсов подразделения.' },
 { key: 'create', label: 'Создание', description: 'Добавление записей и материалов подразделения.' },
 { key: 'update', label: 'Изменение', description: 'Изменение записей подразделения, включая записи коллег.' },
 { key: 'delete', label: 'Удаление в корзину', description: 'Мягкое удаление данных. Без безвозвратного удаления.' },
 { key: 'restore', label: 'Корзина и восстановление', description: 'Просмотр корзины и восстановление данных подразделения.' },
 { key: 'manage', label: 'Управление доступом отдела', description: 'Назначение ролей только в этом подразделении. Не администратор Space.' },
] as const;
export type Capability = typeof capabilities[number]['key'];
export const roles = [
 { key: 'observer', label: 'Наблюдатель', description: 'Открывает раздел и просматривает данные.', icon: 'lucide:eye' },
 { key: 'editor', label: 'Редактор', description: 'Создаёт и изменяет рабочие данные.', icon: 'lucide:pencil' },
 { key: 'moderator', label: 'Модератор', description: 'Поддерживает порядок, удаляет и восстанавливает данные.', icon: 'lucide:shield-check' },
 { key: 'admin', label: 'Администратор подразделения', description: 'Управляет данными и доступом внутри отдела.', icon: 'lucide:key-round' },
] as const;
export type Role = typeof roles[number]['key'];
export type Rights = Record<Capability, boolean>;
export type Assignment = { role: Role; overrides: Partial<Record<Capability, boolean>> };
export type ScopeDraft = { templates: Record<Role, Rights>; assignments: Record<string, Assignment> };
export type RoleDraft = { version: 1; scopes: Record<string, ScopeDraft> };
export interface RolePreviewCatalog {
 actorId: number;
 scopes: { key: string; name: string; resources: { key: string; name: string; type: string }[] }[];
 groups: { id: number; name: string; userIds: number[]; domainGroupCount: number }[];
 users: { id: number; name: string; login: string; departmentId: number | null; department: string | null }[];
 departments: { id: number; name: string }[];
}
export function emptyRights(): Rights { return {view:false,create:false,update:false,delete:false,restore:false,manage:false}; }
export function newScope(): ScopeDraft {
 return { templates: {
 observer: {...emptyRights(),view:true}, editor: {...emptyRights(),view:true,create:true,update:true},
 moderator: {...emptyRights(),view:true,create:true,update:true,delete:true,restore:true},
 admin: {view:true,create:true,update:true,delete:true,restore:true,manage:true},
 }, assignments: {} };
}
export function newDraft(): RoleDraft { return {version:1,scopes:{}}; }
export function effectiveRights(scope: ScopeDraft, assignment?: Assignment): Rights {
 if (!assignment) return emptyRights();
 const rights = {...scope.templates[assignment.role],...assignment.overrides};
 if (!rights.view) return emptyRights();
 return rights;
}
export function setTemplate(scope: ScopeDraft, role: Role, capability: Capability, value: boolean) {
 const rights=scope.templates[role];rights[capability]=value;
 if (!rights.view && capability==='view') Object.assign(rights,emptyRights());
 else if(value) rights.view=true;
}
export function cloneAssignment(value: Assignment): Assignment { return {role:value.role,overrides:{...value.overrides}}; }
/** Reject damaged/unrecognized local drafts instead of silently applying partial values. */
export function parseDraft(raw: string): RoleDraft {
 if(raw.length>2_000_000) throw Error('Слишком большой черновик');
 const data=JSON.parse(raw);
 const object=(v: any)=>v && typeof v==='object' && !Array.isArray(v);
 if(!object(data)||data.version!==1||!object(data.scopes)) throw Error('Неверная версия черновика');
 const result=newDraft();
 for(const [key,rawScope] of Object.entries(data.scopes)) {
  if(!['lab','diagnostic'].includes(key)) throw Error('Неизвестное подразделение');
  const scope=rawScope as any;
  if(!object(scope)||!object(scope.templates)||!object(scope.assignments)) throw Error('Неверный раздел');
  const clean=newScope();
  for(const role of roles) for(const cap of capabilities) {
   if(typeof scope.templates[role.key]?.[cap.key]!=='boolean') throw Error('Неверный шаблон');
   clean.templates[role.key][cap.key]=scope.templates[role.key][cap.key];
  }
  for(const [id,rawAssignment] of Object.entries(scope.assignments)) {
   const a=rawAssignment as any;
   if(!/^[1-9][0-9]*$/.test(id)||!Number.isSafeInteger(Number(id))||!object(a)||!roles.some(r=>r.key===a.role)||!object(a.overrides)) throw Error('Неверное назначение');
   const overrides: Assignment['overrides']={};
   for(const [cap,value] of Object.entries(a.overrides)) {
    if(!capabilities.some(c=>c.key===cap)||typeof value!=='boolean') throw Error('Неверное исключение');
    overrides[cap as Capability]=value;
   }
   clean.assignments[id]={role:a.role,overrides};
  }
  result.scopes[key]=clean;
 }
 return result;
}
