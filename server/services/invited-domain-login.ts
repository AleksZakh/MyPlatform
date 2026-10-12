import { createError } from 'h3';
import { prisma } from '../utils/prisma';
import type { DirectoryUser } from './ad-directory.service';
import { ensureDomainUser, assertDomainUserCanLogin } from './domain-user.service';
import { invitationIsUsable } from './chat/invitation-policy';
/** Only call after successful password authentication or trusted Kerberos identity verification. */
export async function resolveAuthenticatedDomainUser(directory: DirectoryUser) {
 if (directory.accountDisabled) throw createError({ statusCode: 403, message: 'Учётная запись отключена в AD.' });
 return prisma.$transaction(async tx => {
  const guid = directory.directoryObjectId?.trim().toLowerCase();
  if (guid) await tx.$queryRaw`SELECT id FROM app_users WHERE "directoryObjectId"=${guid} FOR UPDATE`;
  const existing = guid ? await tx.user.findUnique({ where: { directoryObjectId: guid }, include: { receivedChatInvitation: true } }) : null;
  const eligible = existing && invitationIsUsable(existing.receivedChatInvitation, existing, directory);
  let user = await ensureDomainUser(directory, tx);
  if (eligible && user.id === existing.id && user.status === 'PENDING_ACTIVATION') {
   user = await tx.user.update({ where: { id: user.id }, data: { status: 'ACTIVE', activatedAt: new Date() } });
   await tx.domainChatInvitation.update({ where: { recipientId: user.id }, data: { consumedAt: new Date() } });
   await tx.auditLog.create({ data: { action: 'ACTIVATE', category: 'AUTH', result: 'SUCCESS', entityType: 'User', entityId: user.id,
    actorUserId: user.id, targetUserId: user.id, actorEmail: user.email || '', note: 'Самостоятельная активация приглашённого сотрудника после проверки AD.' } });
  }
  assertDomainUserCanLogin(directory, user);
  return user;
 });
}
