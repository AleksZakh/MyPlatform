import {defineEventHandler,getRouterParam} from 'h3';
import {assignObjectWorks} from '../../../../services/upts-workflow';
import {positiveId} from '../../../../services/work/input';
import {workBody} from '../../../../services/work/access';
export default defineEventHandler(async event=>assignObjectWorks(event,positiveId(getRouterParam(event,'contractId')),await workBody(event)));
