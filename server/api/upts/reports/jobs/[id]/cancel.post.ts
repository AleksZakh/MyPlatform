import {defineEventHandler,getQuery,getRouterParam,type H3Event} from 'h3';
import {cancelReport} from '../../../../../services/upts-reports';
import {workBody} from '../../../../../services/work/access';
export default defineEventHandler(async event=>{await workBody(event);return cancelReport(event,getRouterParam(event,'id')!);});
