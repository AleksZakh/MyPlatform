import { getAccessActor } from '../../services/access-control.service';
import { prisma } from '../../utils/prisma';
import { normalizePreferences } from '../../../shared/utils/user-preferences';
export default defineEventHandler(async event => {
  setHeader(event, 'Cache-Control', 'no-store');
  if (event.context.externalSessionRevoked) throw createError({ statusCode: 401 });
  const { user } = await getAccessActor(event);
  const row = await prisma.userPreference.findUnique({ where: { userId: user.id } });
  return normalizePreferences(row?.data);
});
