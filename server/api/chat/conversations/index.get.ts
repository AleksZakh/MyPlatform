import { chatActor, personSelect } from '../../../services/chat/service';
import { prisma } from '../../../utils/prisma';
export default defineEventHandler(async event => {
  const actor = await chatActor(event);
  const conversations = await prisma.chatConversation.findMany({ where: { members: { some: { userId: actor.id } } }, orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    include: { members: { include: { user: { select: personSelect } } }, messages: { orderBy: { id: 'desc' }, take: 1 } } });
  const counts = await prisma.$queryRaw<{ conversationId: number; unread: bigint }[]>`SELECT m."conversationId", count(*) AS unread FROM chat_members m JOIN chat_messages t ON t."conversationId"=m."conversationId" WHERE m."userId"=${actor.id} AND t.id>m."readThrough" AND t."senderId"<>${actor.id} GROUP BY m."conversationId"`;
  const unread = new Map(counts.map(c => [c.conversationId, Number(c.unread)]));
  const dialogs = conversations.flatMap(c => {
    const me = c.members.find(m => m.userId === actor.id), peer = c.members.find(m => m.userId !== actor.id);
    return me && peer ? [{ id: c.id, peer: peer.user, readThrough: me.readThrough, peerReadThrough: peer.readThrough, unread: unread.get(c.id) || 0, last: c.messages[0] || null }] : [];
  });
  return { dialogs, unread: dialogs.reduce((sum, d) => sum + d.unread, 0) };
});
