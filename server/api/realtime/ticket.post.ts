import { getAccessActor } from '../../services/access-control.service';
import { issue, secret } from '../../realtime/token';
export default defineEventHandler(async event => {
  if (getHeader(event, 'x-space-realtime') !== '1') throw createError({ statusCode: 403 });
  const session = await requireUserSession(event);
  const user = session.user;
  if (event.context.externalSessionRevoked || !user?.login) throw createError({ statusCode: 401 });
  setHeader(event, 'Cache-Control', 'no-store');
  const actor = await getAccessActor(event);
  const login = user.login.trim().toLowerCase();
  const id = `${actor.user.authType}:${actor.user.id}`;
  return { ticket: issue({ id, login, name: user.fullName || user.name || user.login }, secret()) };
});
