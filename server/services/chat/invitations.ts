import { randomUUID } from 'node:crypto';
import { createError, type H3Event } from 'h3';
import { prisma } from '../../utils/prisma';
import { findDomainUser } from '../ad-directory.service';
import { sendChatInvitationEmail } from '../../utils/chat-invitation-mail';
import { INVITATION_COOLDOWN, INVITATION_LIFETIME } from './invitation-policy';
export async function inviteDomainContact(event: H3Event, senderId: number, recipientId: number) {
 if (senderId === recipientId) throw createError({ statusCode: 400, message: 'Выберите другого пользователя.' });
 const recipient = await prisma.user.findUnique({ where: { id: recipientId } });
 if (!recipient || recipient.authType !== 'DOMAIN' || recipient.status !== 'PENDING_ACTIVATION' || !recipient.login || !recipient.directoryObjectId)
  throw createError({ statusCode: 409, message: 'Этому пользователю нельзя отправить приглашение. Обновите список.' });
 const directory = await findDomainUser(recipient.login, event);
 if (!directory || directory.accountDisabled || directory.directoryObjectId?.toLowerCase() !== recipient.directoryObjectId.toLowerCase())
  throw createError({ statusCode: 409, message: 'Учётная запись недоступна в AD.' });
 const email = directory.email?.trim();
 if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw createError({ statusCode: 409, message: 'В AD отсутствует корректный корпоративный адрес. Обратитесь к администратору.' });
 const now = new Date(), id = randomUUID();
 await prisma.$transaction(async tx => {
  // Lock both accounts in stable order: concurrent invitations share sender/recipient limits.
  await tx.$queryRaw`SELECT id FROM app_users WHERE id IN (${senderId}, ${recipientId}) ORDER BY id FOR UPDATE`;
  const sender = await tx.user.findUnique({ where: { id: senderId } });
  const current = await tx.user.findUniqueOrThrow({ where: { id: recipientId } });
  if (sender?.status !== 'ACTIVE') throw createError({ statusCode: 403 });
  if (current.status !== 'PENDING_ACTIVATION' || current.authType !== 'DOMAIN' || current.updatedAt.getTime() !== recipient.updatedAt.getTime())
   throw createError({ statusCode: 409, message: 'Учётная запись изменилась. Обновите список.' });
  const prior = await tx.domainChatInvitation.findUnique({ where: { recipientId } });
  if (prior && now.getTime() - prior.reservedAt.getTime() < INVITATION_COOLDOWN)
   throw createError({ statusCode: 429, message: 'Приглашение уже отправлялось. Повторная отправка доступна через 24 часа.' });
  if (await tx.domainChatInvitation.count({ where: { senderId, reservedAt: { gt: new Date(now.getTime() - 3600000) } } }) >= 20)
   throw createError({ statusCode: 429, message: 'Можно отправить не более 20 приглашений за час.' });
  const data = { id, senderId, directoryObjectId: recipient.directoryObjectId!, recipientVersion: recipient.updatedAt,
   reservedAt: now, expiresAt: new Date(now.getTime() + INVITATION_LIFETIME), sentAt: null, consumedAt: null };
  await tx.domainChatInvitation.upsert({ where: { recipientId }, create: { ...data, recipientId }, update: data });
 });
 try {
  const sender = await prisma.user.findUniqueOrThrow({ where: { id: senderId } });
  await sendChatInvitationEmail(email, sender.fullName || sender.login || 'Пользователь Space');
 } catch {
  // Keep reservation on an ambiguous SMTP failure: avoid duplicate emails; no activation grant.
  throw createError({ statusCode: 502, message: 'Не удалось подтвердить отправку письма. Приглашение не активировано. Обратитесь к администратору; повторная попытка доступна через 24 часа.' });
 }
 await prisma.$transaction(async tx => {
  await tx.domainChatInvitation.update({ where: { id }, data: { sentAt: new Date() } });
  await tx.auditLog.create({ data: { action: 'INVITE', category: 'AUTH', result: 'SUCCESS', entityType: 'User', entityId: recipientId,
   actorUserId: senderId, targetUserId: recipientId, actorEmail: '', note: 'Отправлено приглашение в чат Space. Активация требует входа через AD.' } });
 });
 return { sent: true };
}
