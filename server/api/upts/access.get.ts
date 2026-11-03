import { createError, defineEventHandler, setHeader } from 'h3';
import { workActor } from '../../services/work/access';
export default defineEventHandler(async event => {
  setHeader(event, 'Cache-Control', 'private, no-store');
  if (event.context.externalSessionRevoked) throw createError({ statusCode: 401 });
  const actor = await workActor(event);
  if (actor.uptsAccessUnavailable) throw createError({ statusCode: 503, message: 'Не удалось проверить группы УПТС в Active Directory.' });
  return { allowed: actor.uptsMember };
});
