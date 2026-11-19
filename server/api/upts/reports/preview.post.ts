import {defineEventHandler,getQuery,getRouterParam,type H3Event} from 'h3';
import {previewReport} from '../../../services/upts-reports';
import {workBody} from '../../../services/work/access';
function page(event:H3Event){return Math.min(100000,Math.max(1,Math.floor(Number(getQuery(event).page)||1)));}
export default defineEventHandler(async event=>{return previewReport(event,await workBody(event),page(event));});
