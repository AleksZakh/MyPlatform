import { chatActor, membership, conversationId } from '../../../../services/chat/service';
import { prisma } from '../../../../utils/prisma';
export default defineEventHandler(async event => {
  const actor = await chatActor(event), id = conversationId(event);
  await membership(actor.id, id);
  const q = getQuery(event);
  function cursor(value: unknown) { const n = Number(value); if (!Number.isSafeInteger(n) || n < 0 || n > 2147483647) throw createError({ statusCode: 400 }); return n; }
  if (q.after !== undefined && q.before !== undefined) throw createError({ statusCode: 400 });
  const after = q.after === undefined ? undefined : cursor(q.after), before = q.before === undefined ? undefined : cursor(q.before);
  const rows = await prisma.chatMessage.findMany({ where: { conversationId: id, ...(after !== undefined ? { id: { gt: after } } : before !== undefined ? { id: { lt: before } } : {}) }, orderBy: { id: after !== undefined ? 'asc' : 'desc' }, take: 51 });
  const peer = await prisma.chatMember.findFirst({ where: { conversationId: id, userId: { not: actor.id } } });
  const messages = rows.slice(0, 50);
  return { messages: after !== undefined ? messages : messages.reverse(), hasMore: rows.length > 50, peerReadThrough: peer?.readThrough || 0 };
});
