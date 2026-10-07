import { createError } from 'h3';
import { prisma } from '../../utils/prisma';
import { pairKey } from './validation';
export async function membership(userId: number, id: number) {
  const member = await prisma.chatMember.findUnique({ where: { conversationId_userId: { conversationId: id, userId } } });
  if (!member) throw createError({ statusCode: 404, message: 'Диалог не найден.' });
  return member;
}
export async function openDialog(userId: number, recipientId: number) {
  if (userId === recipientId) throw createError({ statusCode: 400, message: 'Выберите другого пользователя.' });
  const recipient = await prisma.user.findFirst({ where: { id: recipientId, status: 'ACTIVE' }, select: { id: true } });
  if (!recipient) throw createError({ statusCode: 404, message: 'Пользователь недоступен.' });
  const key = pairKey(userId, recipientId);
  // Atomic INSERT avoids two concurrent requests creating duplicate pairs.
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`INSERT INTO chat_conversations ("pairKey") VALUES (${key}) ON CONFLICT ("pairKey") DO NOTHING`;
    const conversation = await tx.chatConversation.findUniqueOrThrow({ where: { pairKey: key } });
    await tx.chatMember.createMany({ data: [userId, recipientId].map(id => ({ conversationId: conversation.id, userId: id })), skipDuplicates: true });
    return { id: conversation.id };
  });
}
export async function saveMessage(userId: number, id: number, body: string, clientId: string) {
  return prisma.$transaction(async tx => {
    // A per-dialog lock orders commits, message cursors and read receipts.
    const rows = await tx.$queryRaw<{ id: number }[]>`SELECT c.id FROM chat_conversations c JOIN chat_members m ON m."conversationId"=c.id WHERE c.id=${id} AND m."userId"=${userId} FOR UPDATE OF c`;
    if (!rows.length) throw createError({ statusCode: 404 });
    const prior = await tx.chatMessage.findUnique({ where: { senderId_clientId: { senderId: userId, clientId } } });
    if (prior) {
      if (prior.conversationId !== id || prior.body !== body) throw createError({ statusCode: 409, message: 'Повторная отправка содержит другие данные.' });
      return prior;
    }
    const members = await tx.chatMember.findMany({ where: { conversationId: id }, include: { user: { select: { status: true } } } });
    if (members.length !== 2 || members.some(m => m.user.status !== 'ACTIVE')) throw createError({ statusCode: 403, message: 'Участник диалога отключён.' });
    const count = await tx.chatMessage.count({ where: { senderId: userId, createdAt: { gt: new Date(Date.now() - 60000) } } });
    if (count >= 60) throw createError({ statusCode: 429, message: 'Слишком много сообщений. Подождите минуту.' });
    const message = await tx.chatMessage.create({ data: { conversationId: id, senderId: userId, body, clientId } });
    await tx.chatConversation.update({ where: { id }, data: { updatedAt: new Date() } });
    return message;
  });
}
export async function markRead(userId: number, id: number, through: number) {
  return prisma.$transaction(async tx => {
    const rows = await tx.$queryRaw<{ id: number }[]>`SELECT c.id FROM chat_conversations c JOIN chat_members m ON m."conversationId"=c.id WHERE c.id=${id} AND m."userId"=${userId} FOR UPDATE OF c`;
    if (!rows.length) throw createError({ statusCode: 404 });
    if (!await tx.chatMessage.findFirst({ where: { id: through, conversationId: id }, select: { id: true } })) throw createError({ statusCode: 400 });
    await tx.chatMember.updateMany({ where: { conversationId: id, userId, readThrough: { lt: through } }, data: { readThrough: through } });
    return { ok: true };
  });
}
