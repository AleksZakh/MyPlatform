import type { H3Event } from 'h3';
import { prisma } from '~~/server/utils/prisma';

export async function checkExternalSession(event: H3Event): Promise<void> {
  const session = await getUserSession(event);
  if (session.user?.authType !== 'EXTERNAL') return;
  if (!Number.isSafeInteger(session.user.id) || !session.user.id || session.user.id <= 0) {
    await clearUserSession(event);
    event.context.externalSessionRevoked = true;
    event.context.user = null;
    return;
  }
  const user = await prisma.user.findUnique({ where: { id: session.user.id },
    select: { authType: true, status: true, externalSessionVersion: true } });
  // Старые cookie считаются версией 0 и действуют до первого сброса пароля.
  if (!user || user.authType !== 'EXTERNAL' || user.status !== 'ACTIVE'
    || user.externalSessionVersion !== (session.user.externalSessionVersion ?? 0)) {
    await clearUserSession(event);
    event.context.externalSessionRevoked = true;
    event.context.user = null;
  }
}
