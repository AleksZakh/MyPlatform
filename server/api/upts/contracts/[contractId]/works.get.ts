import {defineEventHandler,getRouterParam} from 'h3';
import {contractStageWorks} from '../../../../services/upts-library';
import {positiveId} from '../../../../services/work/input';
export default defineEventHandler(event=>contractStageWorks(event,positiveId(getRouterParam(event,'contractId'))));
