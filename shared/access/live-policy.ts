import {ACCESS_ACTIONS,type AccessRow,type AccessChange,type AccessSnapshot,type AccessSubjectKind,type AccessActionName} from '../types/access-management';
export const accessScopes=[{key:'lab',name:'Лабораторный контроль'},{key:'diagnostic',name:'Диагностика ИССО'}] as const;
export type DepartmentScope=typeof accessScopes[number]['key'];
export type ScopeRights={view:boolean;create:boolean;update:boolean;delete:boolean;restore:boolean;manage:boolean};
export const liveCapabilities=[{key:'view',label:'Просмотр'},{key:'create',label:'Создание'},{key:'update',label:'Изменение'},{key:'delete',label:'Удаление'},{key:'restore',label:'Корзина / восстановление'},{key:'manage',label:'Администрирование отдела'}] as const;
export const liveRoles=[
 {key:'observer',label:'Наблюдатель',rights:{view:true,create:false,update:false,delete:false,restore:false,manage:false}},
 {key:'editor',label:'Редактор',rights:{view:true,create:true,update:true,delete:false,restore:false,manage:false}},
 {key:'moderator',label:'Модератор',rights:{view:true,create:true,update:true,delete:true,restore:false,manage:false}},
 {key:'admin',label:'Администратор подразделения',rights:{view:true,create:true,update:true,delete:true,restore:true,manage:true}},
] as const;
export interface ScopedSnapshot extends AccessSnapshot { denied:{resourceId:number;action:AccessActionName}[] }
export interface ScopeRequest {scope:DepartmentScope;kind:AccessSubjectKind;ids:number[];rights:ScopeRights;denied:AccessActionName[]|null}
export interface ScopePlan { subjects:{id:number;name:string;revision:string;changes:(AccessChange&{name:string})[];denialsBefore:ScopedSnapshot['denied'];denialsAfter:ScopedSnapshot['denied'];warnings:string[]}[];count:number }
export function scopeRows(rows:AccessRow[],scope:DepartmentScope){return rows.filter(r=>r.key.startsWith(scope+'.'));}
/** Explicit feature mapping: never accidentally grant a future administrative feature. */
export function desiredPermission(row:AccessRow,action:AccessActionName,rights:ScopeRights):boolean|null {
 if(row.type==='TABLE')return rights.view && rights[action.toLowerCase() as 'view'|'create'|'update'|'delete'];
 if(row.key.endsWith('.access-admin'))return ['VIEW','UPDATE'].includes(action)?rights.view&&rights.manage:null;
 if(row.key==='diagnostic.contracts.trash')return action==='VIEW'?rights.view&&rights.restore:null;
 if(row.key==='lab.event-journal')return action==='VIEW'?rights.view:null;
 if(row.key==='lab.incoming-control.edit-lock-override')return action==='UPDATE'?rights.view&&rights.manage:null;
 return null;
}
export function scopeChanges(rows:AccessRow[],rights:ScopeRights):AccessChange[]{
 const changes:AccessChange[]=[];
 for(const row of rows)for(const action of ACCESS_ACTIONS){
  const target=desiredPermission(row,action,rights);
  if(target===null)continue;
  // Disabled resources can only lose existing grants, not gain them.
  const granted=row.isActive&&target;
  if(granted!==row.actions[action].directGranted)changes.push({resourceId:row.id,action,granted});
 }
 return changes;
}
export function roleOf(snapshot:AccessSnapshot){
 if(snapshot.subject.isSystemAdmin)return 'Системный администратор';
 if(!snapshot.data.some(r=>ACCESS_ACTIONS.some(a=>r.actions[a].directGranted)))return 'Нет прямого назначения';
 if(snapshot.data.some(r=>ACCESS_ACTIONS.some(a=>r.actions[a].directGranted&&desiredPermission(r,a,{...liveRoles[0].rights})===null)))return 'Индивидуальный набор';
 return liveRoles.find(role=>scopeChanges(snapshot.data,{...role.rights}).length===0)?.label||'Индивидуальный набор';
}
