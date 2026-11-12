import {defineEventHandler,getRouterParam} from 'h3';
import {cancelUptsExport} from '../../../../services/upts-export';
import {workBody} from '../../../../services/work/access';
export default defineEventHandler(async event=>{await workBody(event);return cancelUptsExport(event,getRouterParam(event,'id')||'');});
