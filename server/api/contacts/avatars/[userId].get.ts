import { createError, defineEventHandler, getRouterParam, setHeader } from 'h3';
import { prisma } from '../../../utils/prisma';
import { getAccessActor } from '../../../services/access-control.service';

export default defineEventHandler(async event => {
  setHeader(event, 'Cache-Control', 'private, no-store');
  await getAccessActor(event);

  const raw = getRouterParam(event, 'userId') || '';
  const userId = Number(raw);
  if (!/^[1-9]\d*$/.test(raw) || !Number.isSafeInteger(userId) || userId > 2147483647) {
    throw createError({ statusCode: 400, message: 'Некорректный идентификатор сотрудника.' });
  }

  const profile = await prisma.userProfile.findFirst({
    where: { userId, user: { authType: 'DOMAIN', status: 'ACTIVE', deletedAt: null } },
    select: { avatar: true },
  });
  if (!profile?.avatar?.length) throw createError({ statusCode: 404, message: 'Фото отсутствует.' });

  setHeader(event, 'Content-Type', 'image/jpeg');
  setHeader(event, 'X-Content-Type-Options', 'nosniff');
  return Buffer.from(profile.avatar);
});
