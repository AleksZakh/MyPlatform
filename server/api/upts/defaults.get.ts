import {defineEventHandler,getRouterParam} from 'h3';
import {objectDefaults} from '../../services/upts-workflow';
import {positiveId} from '../../services/work/input';
import {workBody} from '../../services/work/access';
export default defineEventHandler(async event=>objectDefaults(event));
