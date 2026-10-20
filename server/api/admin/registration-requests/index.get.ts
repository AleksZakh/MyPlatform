import {
  RegistrationRequestStatus,
} from '@prisma/client';

import { prisma } from '../../../utils/prisma';

export default defineEventHandler(
  async (event) => {
    // --------------------------------------------------------
    // 1. Проверяем права администратора
    // --------------------------------------------------------

    await requireAdmin(event);

    // --------------------------------------------------------
    // 2. Получаем заявки, ожидающие рассмотрения
    // --------------------------------------------------------

    const requests =
      await prisma.registrationRequest.findMany({
        where: {
          status:
            RegistrationRequestStatus
              .PENDING_REVIEW,
        },

        orderBy: {
          createdAt: 'asc',
        },

        select: {
          id: true,

          fullName: true,
          organization: true,
          position: true,
          email: true,

          status: true,

          createdAt: true,
          emailVerifiedAt: true,

          requestedGroups: { select: { group: { select: { id: true, name: true } } } },
          requestedResources: {
            select: {
              id: true,
              resourceId: true,

              resource: {
                select: {
                  id: true,
                  key: true,
                  name: true,
                  type: true,
                },
              },
            },
          },
        },
      });

    // --------------------------------------------------------
    // 3. Формируем безопасный ответ для UI
    // --------------------------------------------------------

    return {
      success: true,

      count: requests.length,

      data: requests.map(
        (request) => ({
          id: request.id,

          fullName:
            request.fullName,

          organization:
            request.organization,

          position:
            request.position,

          email:
            request.email,

          status:
            request.status,

          createdAt:
            request.createdAt,

          emailVerifiedAt:
            request.emailVerifiedAt,

          resourcesCount:
            request
              .requestedResources
              .length + request.requestedGroups.length,

          resources: [
            ...request
              .requestedResources
              .map((item) => ({
                id:
                  item.resource.id,

                key:
                  item.resource.key,

                name:
                  item.resource.name,

                type:
                  item.resource.type,
              })),
            ...request.requestedGroups.map(({group}) => ({ id: group.id, key: `GROUP:${group.id}`, name: group.name, type: 'GROUP' })),
          ],
        }),
      ),
    };
  },
);