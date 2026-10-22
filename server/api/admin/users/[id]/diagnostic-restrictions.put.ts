import {restrictions} from '../../../../services/diagnostic/restrictions';
import {parseAccessId,requireAccessMutationRequest} from '../../../../services/access-input';
export default defineEventHandler(async event=>{requireAccessMutationRequest(event);return restrictions(event,parseAccessId(getRouterParam(event,'id')),await readBody(event));});
