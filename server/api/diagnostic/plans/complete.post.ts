import { defineEventHandler, readBody } from 'h3';
import { contractAccess } from '../../../services/diagnostic/access';
import { completePlanWorks } from '../../../services/diagnostic/complete-plan-works';

export default defineEventHandler(async event => {
  const actor = await contractAccess(event, 'UPDATE');
  return completePlanWorks(event, actor.userId, await readBody(event));
});
