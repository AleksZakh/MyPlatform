import { createError } from 'h3';
import { z } from 'zod';
import { prisma } from '../../utils/prisma';
export const messageChangeInput = z.discriminatedUnion('action', [
  z.object({ action: z.literal('edit'), body: z.string().trim().min(1).max(4000), revision: z.number().int().min(0).max(2147483647) }).strict(),
  z.object({ action: z.literal('delete'), revision: z.number().int().min(0).max(2147483647) }).strict(),
]);
export async function changeMessage(actorId: number, conversationId: number, messageId: number, data: z.infer<typeof messageChangeInput>) {
 return prisma.$transaction(async tx => {
  const rows = await tx.$queryRaw<{ id: number; archivedAt: Date | null }[]>`SELECT c.id, c."archivedAt" FROM chat_conversations c JOIN chat_members m ON m."conversationId"=c.id WHERE c.id=${conversationId} AND m."userId"=${actorId} FOR UPDATE OF c`;
  if (!rows.length) throw createError({ statusCode: 404, message: 'Диалог недоступен.' });
  const actor = await tx.user.findUnique({ where: { id: actorId }, select: { status: true } });
  if (actor?.status !== 'ACTIVE') throw createError({ statusCode: 403 });
  if (rows[0]!.archivedAt) throw createError({ statusCode: 409, message: 'Группа в архиве. Изменения недоступны.' });
  const current = await tx.chatMessage.findFirst({ where: { id: messageId, conversationId } });
  if (!current) throw createError({ statusCode: 404, message: 'Сообщение не найдено.' });
  if (current.senderId !== actorId) throw createError({ statusCode: 403, message: 'Можно изменять только свои сообщения.' });
  if (current.deletedAt) {
    if (data.action === 'delete') return current;
    throw createError({ statusCode: 409, message: 'Сообщение уже удалено.' });
  }
  if (data.action === 'edit' && current.body === data.body) return current;
  if (current.revision !== data.revision) throw createError({ statusCode: 409, message: 'Сообщение уже изменено в другом окне. Отмените редактирование и откройте его снова.' });
  const count = await tx.chatMessageRevision.count({ where: { actorId, createdAt: { gt: new Date(Date.now() - 60000) } } });
  if (count >= 60) throw createError({ statusCode: 429, message: 'Слишком много изменений. Подождите минуту.' });
  await tx.chatMessageRevision.create({ data: { messageId, actorId, previousBody: current.body, previousRevision: current.revision, action: data.action === 'edit' ? 'EDIT' : 'DELETE' } });
  const conversation = await tx.chatConversation.update({ where: { id: conversationId }, data: { messageVersion: { increment: 1 } } });
  return tx.chatMessage.update({ where: { id: messageId }, data: {
    revision: conversation.messageVersion,
    ...(data.action === 'edit' ? { body: data.body, editedAt: new Date() } : { body: '', deletedAt: new Date() }),
  } });
 });
}
// Separate monotonic cursor: old message edits must not be lost behind the new-message ID cursor.
export async function messageChanges(actorId: number, conversationId: number, since: number) {
 const rows = await prisma.chatMessage.findMany({ where: { conversationId, revision: { gt: since }, conversation: { members: { some: { userId: actorId } } } }, orderBy: { revision: 'asc' }, take: 51, include: { sender: { select: { fullName: true, login: true } } } });
 const messages = rows.slice(0,50);
 return { messages, cursor: messages.at(-1)?.revision ?? since, hasMore: rows.length > 50 };
}
