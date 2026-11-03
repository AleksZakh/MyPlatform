import { defineEventHandler, getRouterParam } from 'h3';
import { library,saveWork,saveWorkTemplate,createContract,applyContractWorks } from '../../../../services/upts-library';
import { workBody } from '../../../../services/work/access';
import { positiveId } from '../../../../services/work/input';
export default defineEventHandler(async event=>{ return saveWork(event, await workBody(event), positiveId(getRouterParam(event,'workId'))); });
