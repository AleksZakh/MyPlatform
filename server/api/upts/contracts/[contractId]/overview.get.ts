import {defineEventHandler,getRouterParam} from 'h3';
import {objectOverview} from '../../../../services/upts-workflow';
import {positiveId} from '../../../../services/work/input';
import {workBody} from '../../../../services/work/access';
export default defineEventHandler(async event=>objectOverview(event,positiveId(getRouterParam(event,'contractId'))));
