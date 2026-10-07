import { chatActor, personSelect } from '../../services/chat/service';
import { prisma } from '../../utils/prisma';
export default defineEventHandler(async event => {
  const actor = await chatActor(event);
  const q = String(getQuery(event).q || '').trim().slice(0, 100);
  return prisma.user.findMany({ where: { status: 'ACTIVE', id: { not: actor.id }, ...(q ? { OR: [{ fullName: { contains: q, mode: 'insensitive' as const } }, { login: { contains: q, mode: 'insensitive' as const } }] } : {}) }, select: personSelect, orderBy: [{ fullName: 'asc' }, { id: 'asc' }], take: 50 });
});
