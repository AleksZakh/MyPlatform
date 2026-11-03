import { createError, defineEventHandler, setHeader } from 'h3';
import { getAccessActor } from '../../services/access-control.service';
import { isUptsDepartment } from '../../../shared/utils/upts-membership';
export default defineEventHandler(async event => {
  setHeader(event, 'Cache-Control', 'private, no-store');
  if (event.context.externalSessionRevoked) throw createError({ statusCode: 401 });
  const { user } = await getAccessActor(event);
  return { allowed: isUptsDepartment(user.department) };
});
