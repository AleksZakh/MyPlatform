import {defineEventHandler,getRouterParam} from 'h3';
import {saveUptsWork} from '../../../services/upts-workflow';
import {positiveId} from '../../../services/work/input';
import {workBody} from '../../../services/work/access';
export default defineEventHandler(async event=>saveUptsWork(event,positiveId(getRouterParam(event,'taskId')),await workBody(event)));
