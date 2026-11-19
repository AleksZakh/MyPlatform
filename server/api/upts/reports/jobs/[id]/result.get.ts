import {defineEventHandler,getQuery,getRouterParam,type H3Event} from 'h3';
import {getReportResult} from '../../../../../services/upts-reports';
import {workBody} from '../../../../../services/work/access';
function page(event:H3Event){return Math.min(100000,Math.max(1,Math.floor(Number(getQuery(event).page)||1)));}
export default defineEventHandler(async event=>{return getReportResult(event,getRouterParam(event,'id')!,page(event));});
