import {restrictions} from '../../../../services/diagnostic/restrictions';
import {parseAccessId,requireAccessMutationRequest} from '../../../../services/access-input';
export default defineEventHandler(async event=>{return restrictions(event,parseAccessId(getRouterParam(event,'id')));});
