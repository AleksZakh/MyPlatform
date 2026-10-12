import { chatActor, personSelect } from '../../services/chat/service';
import { prisma } from '../../utils/prisma';
export default defineEventHandler(async event => {
 const actor = await chatActor(event);
 const query = getQuery(event), q = String(query.q || '').trim().slice(0, 100);
 const offset = Number(query.offset || 0);
 if (!Number.isSafeInteger(offset) || offset < 0 || offset > 1000000) throw createError({ statusCode: 400 });
 const users = await prisma.user.findMany({
  where: { id: { not: actor.id }, AND: [
   { OR: [{ status: 'ACTIVE' }, ...(q ? [{ authType: 'DOMAIN' as const, status: 'PENDING_ACTIVATION' as const }] : [])] },
   ...(q ? [{ OR: [{ fullName: { contains: q, mode: 'insensitive' as const } }, { login: { contains: q, mode: 'insensitive' as const } }] }] : []),
  ] },
  select: { ...personSelect, email: true, department: { select: { name: true } }, receivedChatInvitation: { select: { sentAt: true, expiresAt: true, consumedAt: true } } },
  orderBy: [{ fullName: 'asc' }, { id: 'asc' }], skip: offset, take: 51,
 });
 return { hasMore: users.length > 50, people: users.slice(0, 50).map(({ email, department, receivedChatInvitation: invitation, ...person }) => ({
  ...person, department: department?.name || null, hasEmail: !!email,
  invitationPending: !!invitation?.sentAt && !invitation.consumedAt && invitation.expiresAt > new Date(),
 })) };
});
