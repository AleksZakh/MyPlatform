import {defineEventHandler,setResponseHeader} from 'h3';
import {getAccessActor} from '../../../services/access-control.service';
import {requireDepartmentManager} from '../../../services/department-access-guard';
import {accessScopes} from '../../../../shared/access/live-policy';
export default defineEventHandler(async event=>{
 setResponseHeader(event,'Cache-Control','private, no-store');const actor=await getAccessActor(event);const scopes=[];
 for(const scope of accessScopes){try{await requireDepartmentManager(event,scope.key,true);scopes.push(scope);}catch(e:any){if(e.statusCode!==403)throw e;}}
 return {scopes,isSystemAdmin:actor.isSystemAdmin};
});
