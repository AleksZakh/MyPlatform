import { createError, defineEventHandler, setHeader } from 'h3';
import { getAccessActor } from '../../services/access-control.service';
import { appVersion } from '../../services/app-version';

export default defineEventHandler(async event => {
  setHeader(event, 'Cache-Control', 'private, no-store');
  if (event.context.externalSessionRevoked) throw createError({ statusCode: 401 });
  await getAccessActor(event);
  return appVersion();
});
