import { defineEventHandler, getRouterParam } from 'h3';
import { addGroupMembers } from '../../../../services/work/team';
import { positiveId } from '../../../../services/work/input';
import { workBody } from '../../../../services/work/access';
export default defineEventHandler(async event => {
 const id = positiveId(getRouterParam(event, 'id'));
 return addGroupMembers(event, id, await workBody(event));
});
