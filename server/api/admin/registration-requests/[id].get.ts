

import { prisma } from '../../../utils/prisma';

export default defineEventHandler(async (event) => {
  // ---------------------------------------------------------
  // 1. Только администратор
  // ---------------------------------------------------------

  await requireAdmin(event);

  // ---------------------------------------------------------
  // 2. Получаем ID заявки из URL
  // ---------------------------------------------------------

  const idParam =
    getRouterParam(event, 'id');

  const requestId =
    Number(idParam);

  if (
    !Number.isInteger(requestId) ||
    requestId <= 0
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid request ID',
      message:
        'Некорректный идентификатор заявки.',
    });
  }

  // ---------------------------------------------------------
  // 3. Получаем заявку
  // ---------------------------------------------------------

  const registrationRequest =
    await prisma.registrationRequest.findUnique({
      where: {
        id: requestId,
      },

      select: {
        id: true,

        fullName: true,
        organization: true,
        position: true,
        email: true,
        accessReason: true,

        status: true,

        createdAt: true,
        emailVerifiedAt: true,

        reviewedAt: true,
        reviewedByLogin: true,
        adminComment: true,

        requestedGroups: { select: { groupId: true, approved: true, group: { select: { id: true, name: true, isActive: true } } } },
        requestedResources: {
          select: {
            id: true,
            resourceId: true,

            approved: true,
            adminComment: true,

            resource: {
              select: {
                id: true,
                key: true,
                name: true,
                description: true,
                type: true,
                sortOrder: true,
              },
            },
          },
        },
      },
    });

  if (!registrationRequest) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Registration request not found',
      message:
        'Заявка на регистрацию не найдена.',
    });
  }

  // ---------------------------------------------------------
  // 4. Формируем ответ
  // ---------------------------------------------------------

  const resources =
    registrationRequest.requestedResources
      .map((item) => ({
        requestResourceId: item.id,

        resourceId:
          item.resourceId,

        key:
          item.resource.key,

        name:
          item.resource.name,

        description:
          item.resource.description,

        type:
          item.resource.type,

        sortOrder:
          item.resource.sortOrder,

        approved:
          item.approved,

        adminComment:
          item.adminComment,
      }))
      .sort(
        (a, b) =>
          a.sortOrder - b.sortOrder,
      );

  return {
    success: true,

    data: {
      id:
        registrationRequest.id,

      fullName:
        registrationRequest.fullName,

      organization:
        registrationRequest.organization,

      position:
        registrationRequest.position,

      email:
        registrationRequest.email,

      accessReason:
        registrationRequest.accessReason,

      status:
        registrationRequest.status,

      createdAt:
        registrationRequest.createdAt,

      emailVerifiedAt:
        registrationRequest.emailVerifiedAt,

      reviewedAt:
        registrationRequest.reviewedAt,

      reviewedByLogin:
        registrationRequest.reviewedByLogin,

      adminComment:
        registrationRequest.adminComment,

      resources,
      targets: [
        ...registrationRequest.requestedGroups.map(item => ({
          key: `GROUP:${item.groupId}`, targetId: item.groupId, kind: 'GROUP',
          name: item.group.name, description: item.group.isActive ? 'При одобрении пользователь будет включён в группу и получит её права.' : 'Группа отключена. Одобрение недоступно.',
          isActive: item.group.isActive, approved: item.approved,
        })),
        ...resources.map(item => ({ key: `RESOURCE:${item.resourceId}`, targetId: item.resourceId, kind: 'RESOURCE', name: item.name, description: item.description, isActive: true, approved: item.approved })),
      ],
    },
  };
});