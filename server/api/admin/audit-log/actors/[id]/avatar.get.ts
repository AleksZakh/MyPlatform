import { AccessAction } from '@prisma/client';
import { createError, defineEventHandler, getRouterParam, setHeader } from 'h3';
import { prisma } from '../../../../../utils/prisma';
import { requirePermission } from '../../../../../services/access-control.service';

export default defineEventHandler(async event => {
  // A profile photo in the audit log has the same access boundary as the log.
  setHeader(event, 'Cache-Control', 'private, no-store');
  await requirePermission(event, 'system.audit-log', AccessAction.VIEW);
  const rawId = getRouterParam(event, 'id') || '';
  const userId = Number(rawId);
  if (!/^[1-9]\d*$/.test(rawId) || !Number.isSafeInteger(userId) || userId > 2147483647) {
    throw createError({ statusCode: 400, message: 'Некорректный идентификатор сотрудника.' });
  }
  const profile = await prisma.userProfile.findUnique({
    where: { userId }, select: { avatar: true },
  });
  if (!profile?.avatar?.length) throw createError({ statusCode: 404, message: 'Фото отсутствует.' });
  // Profile uploads are normalized to JPEG by normalizeAvatar.
  setHeader(event, 'Content-Type', 'image/jpeg');
  setHeader(event, 'X-Content-Type-Options', 'nosniff');
  return Buffer.from(profile.avatar);
});
