import {defineEventHandler,getRouterParam} from 'h3';
import {listUptsExports} from '../../../services/upts-export';
export default defineEventHandler(async event=>{return listUptsExports(event);});
