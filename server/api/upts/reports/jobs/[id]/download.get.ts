import {defineEventHandler,getQuery,getRouterParam,type H3Event} from 'h3';
import {downloadReport} from '../../../../../services/upts-reports';
import {workBody} from '../../../../../services/work/access';
export default defineEventHandler(async event=>{return downloadReport(event,getRouterParam(event,'id')!,getQuery(event).format==='zip');});
