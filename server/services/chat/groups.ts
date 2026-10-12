import { Prisma } from '@prisma/client';
import { createError } from 'h3';
import { prisma } from '../../utils/prisma';
import type { GroupChange } from './group-input';
const person = { id: true, fullName: true, login: true, authType: true, status: true } as const;
const forbidden = () => createError({ statusCode: 403, message: 'Недостаточно прав для изменения группы.' });
async function audit(tx: Prisma.TransactionClient, actor: number, id: number, action: string, note: string) {
 await tx.auditLog.create({ data: { category: 'CHAT', result: 'SUCCESS', entityType: 'ChatConversation', entityId: id,
  action, actorUserId: actor, actorEmail: '', note } });
}
export async function createGroup(actor: number, name: string, ids: number[], clientId: string) {
 const userIds = [...new Set([actor, ...ids])];
 if (userIds.length < 2 || userIds.length > 100) throw createError({ statusCode: 400, message: 'Выберите от 1 до 99 других участников.' });
 return prisma.$transaction(async tx => {
  await tx.$queryRaw`SELECT id FROM app_users WHERE id=${actor} FOR UPDATE`;
  if ((await tx.user.findUnique({ where: { id: actor } }))?.status !== 'ACTIVE') throw forbidden();
  const pairKey = `g:${actor}:${clientId}`;
  const prior = await tx.chatConversation.findUnique({ where: { pairKey }, include: { members: true } });
  if (prior) {
   if (!prior.members.some(m => m.userId === actor)) throw createError({ statusCode: 409, message: 'Группа уже создана, но вы больше не её участник.' });
   return { id: prior.id };
  }
  if (await tx.chatConversation.count({ where: { kind: 'GROUP', createdById: actor, createdAt: { gt: new Date(Date.now()-86400000) } } }) >= 20)
   throw createError({ statusCode: 429, message: 'Можно создать не более 20 групп за сутки.' });
  if (await tx.user.count({ where: { id: { in: userIds }, status: 'ACTIVE' } }) !== userIds.length)
   throw createError({ statusCode: 409, message: 'Добавлять можно только активированных пользователей.' });
  const group = await tx.chatConversation.create({ data: { pairKey, kind: 'GROUP', name, createdById: actor,
   members: { create: userIds.map(userId => ({ userId, role: userId === actor ? 'OWNER' : 'MEMBER' })) } } });
  await audit(tx, actor, group.id, 'CREATE', 'Создана группа. Новым участникам доступна вся история.');
  return { id: group.id };
 });
}
export async function getGroup(actor: number, id: number) {
 const group = await prisma.chatConversation.findFirst({ where: { id, kind: 'GROUP', members: { some: { userId: actor } } },
  include: { members: { include: { user: { select: person } }, orderBy: { userId: 'asc' } } } });
 if (!group) throw createError({ statusCode: 404, message: 'Группа недоступна.' });
 return { id: group.id, name: group.name || 'Группа', archived: !!group.archivedAt,
  myRole: group.members.find(m => m.userId === actor)!.role,
  members: group.members.map(m => ({ ...m.user, role: m.role })) };
}
export async function changeGroup(actor: number, id: number, change: GroupChange) {
 return prisma.$transaction(async tx => {
  const rows = await tx.$queryRaw<{id:number}[]>`SELECT c.id FROM chat_conversations c JOIN chat_members m ON m."conversationId"=c.id JOIN app_users u ON u.id=m."userId" WHERE c.id=${id} AND c.kind='GROUP' AND m."userId"=${actor} AND u.status='ACTIVE' FOR UPDATE OF c`;
  if (!rows.length) throw createError({ statusCode: 404, message: 'Группа недоступна.' });
  const group = await tx.chatConversation.findUniqueOrThrow({ where: { id }, include: { members: { include: { user: { select: person } } } } });
  const me = group.members.find(m => m.userId === actor)!;
  const owner = me.role === 'OWNER', manager = owner || me.role === 'ADMIN';
  const previousRecipients = group.members.map(m => `${m.user.authType}:${m.userId}`);
  if (group.archivedAt && !['archive','leave','transfer'].includes(change.action))
   throw createError({ statusCode: 409, message: 'Группа в архиве. Сначала восстановите её.' });
  if (change.action === 'rename') {
   if (!manager) throw forbidden();
   await tx.chatConversation.update({ where: { id }, data: { name: change.name } });
  } else if (change.action === 'add') {
   if (!manager) throw forbidden();
   const ids = [...new Set(change.userIds)].filter(userId => !group.members.some(m => m.userId === userId));
   if (group.members.length + ids.length > 100) throw createError({ statusCode: 409, message: 'В группе может быть до 100 участников.' });
   if (await tx.user.count({ where: { id: { in: ids }, status: 'ACTIVE' } }) !== ids.length)
    throw createError({ statusCode: 409, message: 'Добавлять можно только активированных пользователей.' });
   const last = await tx.chatMessage.findFirst({ where: { conversationId: id }, orderBy: { id: 'desc' }, select: { id: true } });
   // Full history is accessible, but old messages do not become hundreds of unread notifications.
   await tx.chatMember.createMany({ data: ids.map(userId => ({ conversationId: id, userId, unreadFrom: last?.id || 0 })) });
  } else if (change.action === 'leave' || change.action === 'remove') {
   const targetId = change.action === 'leave' ? actor : change.userId;
   const target = group.members.find(m => m.userId === targetId);
   if (!target) throw createError({ statusCode: 404, message: 'Участник не найден.' });
   if (target.role === 'OWNER') throw createError({ statusCode: 409, message: 'Перед выходом передайте владение другому активному участнику. Если группа больше не нужна — поместите её в архив.' });
   if (targetId !== actor && (!manager || (!owner && target.role !== 'MEMBER'))) throw forbidden();
   await tx.chatMember.delete({ where: { conversationId_userId: { conversationId: id, userId: targetId } } });
  } else if (change.action === 'role' || change.action === 'transfer') {
   if (!owner || change.userId === actor) throw forbidden();
   const target = group.members.find(m => m.userId === change.userId);
   if (!target || target.user.status !== 'ACTIVE') throw createError({ statusCode: 409, message: 'Выберите активного участника группы.' });
   if (change.action === 'transfer') await tx.chatMember.update({ where: { conversationId_userId: { conversationId: id, userId: actor } }, data: { role: 'ADMIN' } });
   await tx.chatMember.update({ where: { conversationId_userId: { conversationId: id, userId: change.userId } }, data: { role: change.action === 'transfer' ? 'OWNER' : change.role } });
  } else if (change.action === 'archive') {
   if (!owner) throw forbidden();
   await tx.chatConversation.update({ where: { id }, data: { archivedAt: change.archived ? new Date() : null } });
  }
  await tx.chatConversation.update({ where: { id }, data: { updatedAt: new Date() } });
  await audit(tx, actor, id, 'UPDATE', `Изменение группы: ${JSON.stringify(change)}`);
  return { previousRecipients };
 });
}
