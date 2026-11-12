import {defineEventHandler,getRouterParam} from 'h3';
import {confirmUptsExport} from '../../../../services/upts-export';
import {workBody} from '../../../../services/work/access';
export default defineEventHandler(async event=>{await workBody(event);return confirmUptsExport(event,getRouterParam(event,'id')||'');});
