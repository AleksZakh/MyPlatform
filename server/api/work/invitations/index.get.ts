import { defineEventHandler, getRouterParam } from 'h3';
import { myInvitations } from '../../../services/work/team';
import { positiveId } from '../../../services/work/input';
import { workBody } from '../../../services/work/access';
export default defineEventHandler(async event => {
 return myInvitations(event);
});
