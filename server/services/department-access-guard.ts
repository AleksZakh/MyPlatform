import type {H3Event} from 'h3';
import {getAccessActor,requirePermission} from './access-control.service';
import {accessError} from './access-input';
import {accessScopes,type DepartmentScope} from '../../shared/access/live-policy';
export function parseScope(value:unknown):DepartmentScope {
 if(!accessScopes.some(s=>s.key===value))accessError(400,'INVALID_SCOPE','Выберите подразделение.');
 return value as DepartmentScope;
}
export async function requireDepartmentManager(event:H3Event,scope:DepartmentScope,probe=false){
 const actor=await getAccessActor(event);
 if(!actor.isSystemAdmin)await requirePermission(event,scope+'.access-admin','UPDATE',{auditDenial:!probe});
 return actor;
}
