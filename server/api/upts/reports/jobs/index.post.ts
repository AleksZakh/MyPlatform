import {defineEventHandler,getQuery,getRouterParam,type H3Event} from 'h3';
import {createReportJob} from '../../../../services/upts-reports';
import {workBody} from '../../../../services/work/access';
export default defineEventHandler(async event=>{return createReportJob(event,await workBody(event));});
