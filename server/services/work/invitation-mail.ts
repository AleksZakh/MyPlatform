import type { H3Event } from 'h3';
import { prisma } from '../../utils/prisma';
import { findDomainUser } from '../ad-directory.service';
import { sendProjectNotificationEmail } from '../../utils/chat-invitation-mail';
import { recordUsage } from '../usage';
import { managesProject } from './policy';

const mailError = (code: string) => Object.assign(new Error(code), { code });
const safeCode = (error: unknown) => {
 const code = (error as { code?: unknown })?.code;
 return typeof code === 'string' && /^[A-Z0-9_]{1,50}$/.test(code) ? code : 'MAIL_SEND_FAILED';
};
/** An active employee keeps the internal invitation even when email is unavailable. */
export async function notifyActiveProjectInvite(event: H3Event, invitationId: string) {
 const invitation = await prisma.workProjectInvitation.findUniqueOrThrow({ where: { id: invitationId }, include: { user: true, inviter: true, project: { include: { members: true } } } });
 const internalMessage = 'Приглашение доступно сотруднику в «Задачи и проекты» → «Приглашения».';
 let code: string;
 try {
  if (invitation.status !== 'PENDING' || invitation.user.status !== 'ACTIVE' || invitation.inviter.status !== 'ACTIVE'
    || invitation.expiresAt <= new Date() || invitation.project.archivedAt || invitation.project.scope === 'PRIVATE'
    || !managesProject(invitation.project, {id:invitation.inviterId,departmentId:null})) throw mailError('INVITATION_UNAVAILABLE');
  let email = invitation.user.email?.trim();
  if (invitation.user.authType === 'DOMAIN') {
   if (!invitation.user.login) throw mailError('AD_ACCOUNT_INVALID');
   const profile = await findDomainUser(invitation.user.login, event);
   if (!profile || profile.accountDisabled || !profile.directoryObjectId || !invitation.user.directoryObjectId
     || profile.directoryObjectId.toLowerCase() !== invitation.user.directoryObjectId.toLowerCase()) throw mailError('AD_ACCOUNT_INVALID');
   email = profile.email?.trim();
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw mailError('NO_ADDRESS');
  // AD may be slow: recheck cancellation/acceptance after the directory lookup.
  const current = await prisma.workProjectInvitation.findUnique({where:{id:invitationId},include:{user:true,inviter:true,project:{include:{members:true}}}});
  if (!current || current.status !== 'PENDING' || current.expiresAt <= new Date()
    || current.user.status !== 'ACTIVE' || current.inviter.status !== 'ACTIVE'
    || current.project.archivedAt || current.project.scope === 'PRIVATE'
    || !managesProject(current.project,{id:current.inviterId,departmentId:null})
    || current.user.authType !== invitation.user.authType
    || current.user.directoryObjectId !== invitation.user.directoryObjectId
    || (current.user.authType === 'EXTERNAL' && current.user.email !== invitation.user.email)) throw mailError('INVITATION_UNAVAILABLE');
  const result = await sendProjectNotificationEmail(email, invitation.inviter.fullName || invitation.inviter.login || 'Пользователь Space', { id: invitation.projectId, name: invitation.project.name });
  await prisma.$transaction(async tx => {
   const updated = await tx.workProjectInvitation.updateMany({ where: { id: invitationId }, data: { emailStatus: 'SENT', emailSentAt: new Date(), emailMessageId: result?.messageId || null, emailErrorCode: null } });
   if (updated.count) await tx.auditLog.create({ data: { actorUserId: invitation.inviterId, actorEmail: '', targetUserId: invitation.userId, action: 'MAIL_SENT', category: 'AUTH', result: 'SUCCESS', entityType: 'WorkProject', entityId: invitation.projectId, note: `Почтовое уведомление о приглашении ${invitationId} принято SMTP-сервером.` } });
  });
  recordUsage({ id: `project-mail:${invitationId}`, actorId: invitation.inviterId, recipientId: invitation.userId, kind: 'MAIL', target: `project:${invitation.projectId}` });
  console.info('[project-mail]', { invitationId, projectId: invitation.projectId, status: 'SENT', messageId: result?.messageId || null });
  return { ok: true, emailStatus: 'SENT', message: internalMessage + ' Почтовый сервер принял письмо-уведомление.' };
 } catch (error) {
  code = safeCode(error);
 }
 const emailStatus = code === 'NO_ADDRESS' ? 'NO_ADDRESS' : 'FAILED';
 // Do not erase the internal invitation or undo a response if a user already accepted it.
 await prisma.workProjectInvitation.updateMany({ where: { id: invitationId }, data: { emailStatus, emailErrorCode: code } });
 console.warn('[project-mail]', { invitationId, projectId: invitation.projectId, status: emailStatus, code });
 return { ok: true, emailStatus, message: code === 'INVITATION_UNAVAILABLE' ? 'Состояние приглашения или учётной записи изменилось. Письмо не отправлено; обновите список.' : internalMessage + (emailStatus === 'NO_ADDRESS' ? ' Письмо не отправлено: не указан корректный адрес почты.' : ' Отправка письма не подтверждена. Статус почты показан в списке приглашений.') };
}
