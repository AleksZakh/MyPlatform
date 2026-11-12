import {defineEventHandler,getRouterParam} from 'h3';
import {prepareUptsExport} from '../../../services/upts-export';
import {workBody} from '../../../services/work/access';
export default defineEventHandler(async event=>{return prepareUptsExport(event,await workBody(event));});
