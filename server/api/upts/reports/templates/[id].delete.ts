import {defineEventHandler,getQuery,getRouterParam,type H3Event} from 'h3';
import {deleteReportTemplate} from '../../../../services/upts-reports';
import {workBody} from '../../../../services/work/access';
export default defineEventHandler(async event=>{const body=await workBody(event);return deleteReportTemplate(event,getRouterParam(event,'id')!,body?.version);});
