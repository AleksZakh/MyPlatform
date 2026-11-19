import {defineEventHandler,getQuery,getRouterParam,type H3Event} from 'h3';
import {reportOptions} from '../../../services/upts-reports';
import {workBody} from '../../../services/work/access';
export default defineEventHandler(async event=>{return reportOptions(event,getQuery(event).archived==='1');});
