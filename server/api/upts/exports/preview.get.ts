import {defineEventHandler,getRouterParam} from 'h3';
import {previewUptsExport} from '../../../services/upts-export';
export default defineEventHandler(async event=>{return previewUptsExport(event);});
