import { defineEventHandler, getRouterParam } from 'h3';
import { inviteToProject } from '../../../../services/work/team';
import { positiveId } from '../../../../services/work/input';
import { workBody } from '../../../../services/work/access';
export default defineEventHandler(async event => {
 const id = positiveId(getRouterParam(event, 'id'));
 return inviteToProject(event, id, await workBody(event));
});
