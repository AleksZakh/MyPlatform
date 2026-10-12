import { chatActor, personSelect } from '../../../services/chat/service';
import { prisma } from '../../../utils/prisma';
export default defineEventHandler(async event => {
  const actor = await chatActor(event);
  const conversations = await prisma.chatConversation.findMany({ where: { members: { some: { userId: actor.id } } }, orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    include: { members: { include: { user: { select: personSelect } } }, messages: { orderBy: { id: 'desc' }, take: 1 } } });
  const counts = await prisma.$queryRaw<{ conversationId: number; unread: bigint }[]>`SELECT m."conversationId", count(*) AS unread FROM chat_members m JOIN chat_messages t ON t."conversationId"=m."conversationId" WHERE m."userId"=${actor.id} AND t.id>GREATEST(m."readThrough",m."unreadFrom") AND t."senderId"<>${actor.id} AND t."deletedAt" IS NULL GROUP BY m."conversationId"`;
  const unread = new Map(counts.map(c => [c.conversationId, Number(c.unread)]));
  const dialogs = conversations.flatMap(c => {
    const me = c.members.find(m => m.userId === actor.id), peer = c.members.find(m => m.userId !== actor.id);
    const group = c.kind === 'GROUP';
    return me && (peer || group) ? [{ id: c.id, kind: c.kind, archived: !!c.archivedAt, myRole: me.role, memberCount: c.members.length, peer: group ? { id: 0, login: null, fullName: c.name || 'Группа', authType: 'GROUP', status: 'ACTIVE' } : peer!.user, readThrough: me.readThrough, peerReadThrough: peer ? Math.min(...c.members.filter(m => m.userId !== actor.id).map(m => m.readThrough)) : 0, unread: unread.get(c.id) || 0, last: c.messages[0] || null }] : [];
  });
  return { dialogs, unread: dialogs.reduce((sum, d) => sum + d.unread, 0) };
});
