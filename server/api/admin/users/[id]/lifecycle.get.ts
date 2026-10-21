import { defineEventHandler, getRouterParam, setHeader } from 'h3';
import { parseAccessId } from '../../../../services/access-input';
import { readLifecycle } from '../../../../services/user-lifecycle';
export default defineEventHandler(async event=>{setHeader(event,'Cache-Control','private, no-store');return readLifecycle(event,parseAccessId(getRouterParam(event,'id')));});
