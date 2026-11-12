import {defineEventHandler,getRouterParam} from 'h3';
import {downloadUptsExport} from '../../../../services/upts-export';
export default defineEventHandler(async event=>{return downloadUptsExport(event,getRouterParam(event,'id')||'');});
