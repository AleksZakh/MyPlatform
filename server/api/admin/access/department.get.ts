import {defineEventHandler,getQuery,setResponseHeader} from 'h3';
import {parseScope} from '../../../services/department-access-guard';
import {parseKind,readDepartmentAccess} from '../../../services/department-access';
import {parseAccessId} from '../../../services/access-input';
export default defineEventHandler(event=>{setResponseHeader(event,'Cache-Control','private, no-store');const q=getQuery(event);return readDepartmentAccess(event,parseScope(q.scope),parseKind(q.kind),parseAccessId(q.id));});
