import {defineEventHandler,getQuery,getRouterParam,type H3Event} from 'h3';
import {listReportJobs} from '../../../../services/upts-reports';
import {workBody} from '../../../../services/work/access';
export default defineEventHandler(async event=>{return listReportJobs(event);});
