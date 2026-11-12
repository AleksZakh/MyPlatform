import {defineEventHandler,getRouterParam} from 'h3';
import {getUptsExport} from '../../../../services/upts-export';
export default defineEventHandler(async event=>{return getUptsExport(event,getRouterParam(event,'id')||'');});
