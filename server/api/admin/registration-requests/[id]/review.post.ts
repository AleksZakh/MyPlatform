import { RegistrationRequestStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../../../utils/prisma';

const decisionSchema = z.object({
  kind: z.enum(['GROUP', 'RESOURCE']),
  id: z.number().int().positive().max(2147483647),
  approved: z.boolean(),
}).strict();
const reviewSchema = z.object({
  targets: z.array(decisionSchema).min(1).max(200),
  adminComment: z.string().trim().max(2000).nullable().optional(),
}).strict();

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event);
  const requestId = Number(getRouterParam(event, 'id'));
  if (!Number.isSafeInteger(requestId) || requestId <= 0 || requestId > 2147483647)
    throw createError({ statusCode: 400, message: 'Некорректный идентификатор заявки.' });
  const parsed = reviewSchema.safeParse(await readBody(event));
  if (!parsed.success) throw createError({ statusCode: 400, message: 'Передайте решение по каждой группе или ресурсу и комментарий не длиннее 2000 символов.' });
  const { targets, adminComment } = parsed.data;
  const keys = new Set(targets.map(t => `${t.kind}:${t.id}`));
  if (keys.size !== targets.length) throw createError({ statusCode: 400, message: 'Один пункт указан несколько раз.' });

  return prisma.$transaction(async tx => {
    // Serialize review and provisioning of this application, without SMTP in the transaction.
    await tx.$queryRaw`SELECT id FROM registration_requests WHERE id=${requestId} FOR UPDATE`;
    const request = await tx.registrationRequest.findUnique({
      where: { id: requestId },
      include: { requestedGroups: { include: { group: true } }, requestedResources: true },
    });
    if (!request) throw createError({ statusCode: 404, message: 'Заявка не найдена.' });
    if (request.status !== RegistrationRequestStatus.PENDING_REVIEW)
      throw createError({ statusCode: 409, message: 'Заявка уже рассмотрена или ещё не подтверждена по электронной почте.' });
    const expected = [
      ...request.requestedGroups.map(t => `GROUP:${t.groupId}`),
      ...request.requestedResources.map(t => `RESOURCE:${t.resourceId}`),
    ];
    if (expected.length !== keys.size || expected.some(key => !keys.has(key)))
      throw createError({ statusCode: 400, message: 'Необходимо принять решение по каждому пункту именно этой заявки.' });
    for (const target of targets) {
      if (target.kind === 'GROUP') {
        const requested = request.requestedGroups.find(g => g.groupId === target.id)!;
        if (target.approved && !requested.group.isActive)
          throw createError({ statusCode: 409, message: `Группа «${requested.group.name}» отключена. Одобрение недоступно.` });
        await tx.registrationRequestGroup.update({
          where: { registrationRequestId_groupId: { registrationRequestId: requestId, groupId: target.id } }, data: { approved: target.approved },
        });
      } else {
        await tx.registrationRequestResource.update({
          where: { registrationRequestId_resourceId: { registrationRequestId: requestId, resourceId: target.id } }, data: { approved: target.approved },
        });
      }
    }
    const approvedCount = targets.filter(t => t.approved).length;
    const status = approvedCount === targets.length ? RegistrationRequestStatus.APPROVED
      : approvedCount === 0 ? RegistrationRequestStatus.REJECTED : RegistrationRequestStatus.PARTIALLY_APPROVED;
    await tx.registrationRequest.update({ where: { id: requestId }, data: {
      status, reviewedAt: new Date(), reviewedByLogin: admin.login, adminComment: adminComment || null,
    } });
    return { success: true, requestId, status, approvedCount, rejectedCount: targets.length - approvedCount,
      message: status === 'APPROVED' ? 'Заявка полностью одобрена.' : status === 'REJECTED' ? 'Заявка отклонена.' : 'Заявка частично одобрена.' };
  }, { maxWait: 5000, timeout: 10000 });
});
