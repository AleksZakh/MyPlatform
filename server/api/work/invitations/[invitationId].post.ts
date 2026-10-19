import { defineEventHandler, getRouterParam } from 'h3';
import { respondToInvitation } from '../../../services/work/team';
import { positiveId } from '../../../services/work/input';
import { workBody } from '../../../services/work/access';
export default defineEventHandler(async event => {
 return respondToInvitation(event, getRouterParam(event, 'invitationId') || '', await workBody(event));
});
