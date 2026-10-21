import { defineEventHandler, getRouterParam, readBody, setHeader } from 'h3';
import { parseAccessId, requireAccessMutationRequest } from '../../../../services/access-input';
import { changeLifecycle, parseLifecycle } from '../../../../services/user-lifecycle';
export default defineEventHandler(async event=>{requireAccessMutationRequest(event);setHeader(event,'Cache-Control','private, no-store');return changeLifecycle(event,parseAccessId(getRouterParam(event,'id')),parseLifecycle(await readBody(event)));});
