import { recordUsage } from '../usage';
import { Prisma } from '@prisma/client';
import { ensureDomainUser } from '../domain-user.service';
import { randomUUID } from 'node:crypto';
import { createError, type H3Event } from 'h3';
import { prisma } from '../../utils/prisma';
import { findDomainUser } from '../ad-directory.service';
import { sendChatInvitationEmail } from '../../utils/chat-invitation-mail';
import { INVITATION_COOLDOWN, INVITATION_LIFETIME, INVITATION_RETRY_DELAY, bypassInvitationCooldown } from './invitation-policy';
export async function inviteDomainContact(event: H3Event, senderId: number, recipientId: number, project?: {id: number; name: string}) {
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
 let developerRetry = false;
 let messageId: string | null = null;
 const existingDelivery = await prisma.$transaction(async tx => {
  // Lock both accounts in stable order: concurrent invitations share sender/recipient limits.
  await tx.$queryRaw`SELECT id FROM app_users WHERE id IN (${senderId}, ${recipientId}) ORDER BY id FOR UPDATE`;
  const sender = await tx.user.findUnique({ where: { id: senderId } });
  const current = await tx.user.findUniqueOrThrow({ where: { id: recipientId } });
  if (sender?.status !== 'ACTIVE') throw createError({ statusCode: 403 });
  if (current.status !== 'PENDING_ACTIVATION' || current.authType !== 'DOMAIN' || current.updatedAt.getTime() !== recipient.updatedAt.getTime())
   throw createError({ statusCode: 409, message: 'Учётная запись изменилась. Обновите список.' });
  const prior = await tx.domainChatInvitation.findUnique({ where: { recipientId } });
  developerRetry = bypassInvitationCooldown(sender);
  if (developerRetry && prior && !prior.sentAt && now.getTime() - prior.reservedAt.getTime() < INVITATION_RETRY_DELAY)
   throw createError({ statusCode: 429, message: 'Предыдущая отправка ещё выполняется или завершилась без подтверждения. Повторите через две минуты после её начала.' });
  if (!developerRetry && project && prior?.sentAt && !prior.consumedAt && prior.expiresAt > now && prior.recipientVersion.getTime() === current.updatedAt.getTime() && prior.directoryObjectId.toLowerCase() === current.directoryObjectId?.toLowerCase() && now.getTime() - prior.reservedAt.getTime() < INVITATION_COOLDOWN) return true;
  if (!developerRetry && prior && now.getTime() - prior.reservedAt.getTime() < INVITATION_COOLDOWN)
   throw createError({ statusCode: 429, message: 'Приглашение уже отправлялось. Повторная отправка доступна через 24 часа.' });
  if (await tx.domainChatInvitation.count({ where: { senderId, reservedAt: { gt: new Date(now.getTime() - 3600000) } } }) >= 20)
   throw createError({ statusCode: 429, message: 'Можно отправить не более 20 приглашений за час.' });
  const data = { id, senderId, directoryObjectId: recipient.directoryObjectId!, recipientVersion: recipient.updatedAt,
   reservedAt: now, expiresAt: new Date(now.getTime() + INVITATION_LIFETIME), sentAt: null, consumedAt: null };
  await tx.domainChatInvitation.upsert({ where: { recipientId }, create: { ...data, recipientId }, update: data });
  return false;
 });
 if (existingDelivery) return { sent: false, alreadyInvited: true };
 try {
  const sender = await prisma.user.findUniqueOrThrow({ where: { id: senderId } });
  const result = await sendChatInvitationEmail(email, sender.fullName || sender.login || 'Пользователь Space', project);
  messageId = result?.messageId || null;
 } catch {
  // Keep reservation on an ambiguous SMTP failure: avoid duplicate emails; no activation grant.
  throw createError({ statusCode: 502, message: developerRetry ? 'Не удалось подтвердить отправку письма. Приглашение не активировано. Повторите через две минуты после начала отправки; проверьте почту, чтобы исключить дублирование письма.' : 'Не удалось подтвердить отправку письма. Приглашение не активировано. Обратитесь к администратору; повторная попытка доступна через 24 часа.' });
 }
 await prisma.$transaction(async tx => {
  const delivery = await tx.domainChatInvitation.updateMany({ where: { id }, data: { sentAt: new Date() } });
  if (!delivery.count) throw createError({ statusCode: 409, message: 'Отправка заменена более новым приглашением. Обновите список.' });
  await tx.auditLog.create({ data: { action: 'INVITE', category: 'AUTH', result: 'SUCCESS', entityType: 'User', entityId: recipientId,
   actorUserId: senderId, targetUserId: recipientId, actorEmail: '', note: project ? `Отправлено приглашение в проект #${project.id} Space. Активация требует входа через AD.` : 'Отправлено приглашение в чат Space. Активация требует входа через AD.' } });
 });
 recordUsage({id:`mail:${id}`,actorId:senderId,recipientId,kind:'MAIL',target:project?`project:${project.id}`:'chat-invitation'});
 return { sent: true, messageId };
}

/** Provision only after explicit invitation confirmation and live AD verification. */
export async function provisionInvitationContact(event: H3Event, senderId: number, login: string, guid?: string) {
 const profile = await findDomainUser(login, event);
 if (!profile || !profile.directoryObjectId || profile.accountDisabled || (guid && profile.directoryObjectId.toLowerCase() !== guid.toLowerCase()) || profile.login.toLowerCase() !== login.toLowerCase())
  throw createError({ statusCode: 409, message: 'Данные сотрудника изменились или учётная запись отключена. Обновите поиск.' });
 if (!profile.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email.trim()))
  throw createError({ statusCode: 409, message: 'В AD отсутствует корректный корпоративный адрес.' });
 try {
  return await prisma.$transaction(async tx => {
   await tx.$queryRaw`SELECT id FROM app_users WHERE id=${senderId} FOR UPDATE`;
   const sender = await tx.user.findUnique({ where: { id: senderId } });
   if (sender?.status !== 'ACTIVE') throw createError({ statusCode: 403 });
   if (await tx.domainChatInvitation.count({ where: { senderId, reservedAt: { gt: new Date(Date.now() - 3600000) } } }) >= 20)
    throw createError({ statusCode: 429, message: 'Можно отправить не более 20 приглашений за час.' });
   const existing = await tx.user.findUnique({ where: { directoryObjectId: profile.directoryObjectId!.toLowerCase() } });
   if (existing) {
    if (existing.authType !== 'DOMAIN' || existing.status !== 'PENDING_ACTIVATION')
     throw createError({ statusCode: 409, message: 'Пользователь уже добавлен или недоступен. Обновите список.' });
    return existing.id;
   }
   if (await tx.user.findFirst({ where: { OR: [{ login: profile.login.toLowerCase() }, { email: profile.email!.trim().toLowerCase() }] } }))
    throw createError({ statusCode: 409, message: 'Логин или почта уже связаны с другой записью. Обратитесь к администратору.' });
   // ACTIVE exists only inside this transaction; no other request can observe it before PENDING.
   const user = await ensureDomainUser(profile, tx);
   await tx.user.update({ where: { id: user.id }, data: { status: 'PENDING_ACTIVATION' } });
   await tx.auditLog.create({ data: { action: 'CREATE', category: 'AUTH', result: 'SUCCESS', entityType: 'User', entityId: user.id,
    actorUserId: senderId, targetUserId: user.id, actorEmail: '', note: 'Подготовлена доменная учётная запись для приглашения в чат, без активации.' } });
   return user.id;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
 } catch (e) {
  if (e instanceof Prisma.PrismaClientKnownRequestError && ['P2002', 'P2034'].includes(e.code))
   throw createError({ statusCode: 409, message: 'Пользователь изменён параллельно. Обновите поиск.' });
  throw e;
 }
}
