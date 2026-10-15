import { getAccessActor } from '../../services/access-control.service';
import { prisma } from '../../utils/prisma';
import { normalizePreferences, preferencesPatchSchema } from '../../../shared/utils/user-preferences';
export default defineEventHandler(async event => {
  setHeader(event, 'Cache-Control', 'no-store');
  if (event.context.externalSessionRevoked) throw createError({ statusCode: 401 });
  if (getHeader(event, 'x-space-preferences') !== '1') throw createError({ statusCode: 403 });
  const { user } = await getAccessActor(event);
  const parsed = preferencesPatchSchema.safeParse(await readBody(event));
  if (!parsed.success) throw createError({ statusCode: 400, message: 'Проверьте настройки профиля.' });
  return prisma.$transaction(async tx => {
    // Serialize updates, including the first insert; do not change account.updatedAt.
    await tx.$queryRaw`SELECT id FROM app_users WHERE id = ${user.id} FOR UPDATE`;
    const actor = await tx.user.findUnique({ where: { id: user.id }, select: { status: true } });
    if (actor?.status !== 'ACTIVE') throw createError({ statusCode: 403 });
    const row = await tx.userPreference.findUnique({ where: { userId: user.id } });
    const data = { ...normalizePreferences(row?.data), ...parsed.data };
    await tx.userPreference.upsert({ where: { userId: user.id }, create: { userId: user.id, data }, update: { data } });
    return data;
  }, {
    maxWait: 5000,
    timeout: 15000,
  });
});
