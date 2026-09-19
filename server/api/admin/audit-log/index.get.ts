import {
  AccessAction,
  Prisma,
} from '@prisma/client';

import {
  prisma,
} from '~~/server/utils/prisma';

import {
  requirePermission,
} from '~~/server/services/access-control.service';


const parsePositiveInt = (
  value: unknown,
  fallback: number,
): number => {

  const parsed =
    Number(value);

  return (
    Number.isInteger(parsed) &&
    parsed > 0
  )
    ? parsed
    : fallback;
};


const parseDateValue = (
  value: unknown,
): Date | undefined => {

  if (
    typeof value !== 'string' ||
    !value.trim()
  ) {
    return undefined;
  }

  const date =
    new Date(value);

  return Number.isNaN(
    date.getTime(),
  )
    ? undefined
    : date;
};


export default defineEventHandler(
  async (event) => {

    /**
     * Журнал видят только пользователи,
     * имеющие отдельное право.
     */
    await requirePermission(
      event,
      'system.audit-log',
      AccessAction.VIEW,
    );


    const query =
      getQuery(event);


    const page =
      parsePositiveInt(
        query.page,
        1,
      );


    const pageSize =
      Math.min(
        parsePositiveInt(
          query.pageSize,
          25,
        ),
        100,
      );


    const search =
      typeof query.search === 'string'
        ? query.search.trim()
        : '';


    const category =
      typeof query.category === 'string'
        ? query.category.trim()
        : '';


    const action =
      typeof query.action === 'string'
        ? query.action.trim()
        : '';


    const result =
      typeof query.result === 'string'
        ? query.result.trim()
        : '';


    const resourceKey =
      typeof query.resourceKey === 'string'
        ? query.resourceKey.trim()
        : '';


    const actorUserId =
      query.actorUserId
        ? Number(query.actorUserId)
        : undefined;


    const dateFrom =
      parseDateValue(
        query.dateFrom,
      );


    const dateTo =
      parseDateValue(
        query.dateTo,
      );


    const where:
      Prisma.AuditLogWhereInput = {};


    if (category) {
      where.category =
        category;
    }


    if (action) {
      where.action =
        action;
    }


    if (result) {
      where.result =
        result;
    }


    if (resourceKey) {
      where.resourceKey =
        resourceKey;
    }


    if (
      actorUserId &&
      Number.isInteger(actorUserId) &&
      actorUserId > 0
    ) {
      where.actorUserId =
        actorUserId;
    }


    if (
      dateFrom ||
      dateTo
    ) {
      where.timestamp = {
        ...(dateFrom
          ? {
              gte:
                dateFrom,
            }
          : {}),

        ...(dateTo
          ? {
              lte:
                dateTo,
            }
          : {}),
      };
    }


    if (search) {
      where.OR = [
        {
          actorLogin: {
            contains:
              search,

            mode:
              'insensitive',
          },
        },

        {
          actorEmail: {
            contains:
              search,

            mode:
              'insensitive',
          },
        },

        {
          resourceKey: {
            contains:
              search,

            mode:
              'insensitive',
          },
        },

        {
          entityType: {
            contains:
              search,

            mode:
              'insensitive',
          },
        },

        {
          action: {
            contains:
              search,

            mode:
              'insensitive',
          },
        },

        {
          note: {
            contains:
              search,

            mode:
              'insensitive',
          },
        },
      ];
    }


    const [
      total,
      rows,
    ] =
      await prisma.$transaction([
        prisma.auditLog.count({
          where,
        }),

        prisma.auditLog.findMany({
          where,

          orderBy: {
            timestamp:
              'desc',
          },

          skip:
            (page - 1) *
            pageSize,

          take:
            pageSize,

          /**
           * Намеренно НЕ отдаём старые
           * beforeData / afterData.
           *
           * Список должен быть лёгким.
           */
          select: {
            id:
              true,

            timestamp:
              true,

            category:
              true,

            action:
              true,

            result:
              true,

            resourceKey:
              true,

            entityType:
              true,

            entityId:
              true,

            actorUserId:
              true,

            actorLogin:
              true,

            actorEmail:
              true,

            actorAuthType:
              true,

            note:
              true,

            changes:
              true,

            method:
              true,

            route:
              true,

            ipAddress:
              true,
          },
        }),
      ]);


    /**
     * Подтягиваем человекочитаемые
     * данные пользователей.
     */
    const actorIds =
      [
        ...new Set(
          rows
            .map(
              row =>
                row.actorUserId,
            )
            .filter(
              (
                id,
              ): id is number =>
                typeof id === 'number',
            ),
        ),
      ];


    const actors =
      actorIds.length
        ? await prisma.user.findMany({
            where: {
              id: {
                in:
                  actorIds,
              },
            },

            select: {
              id:
                true,

              fullName:
                true,

              login:
                true,

              email:
                true,

              position:
                true,

              department: {
                select: {
                  name:
                    true,
                },
              },
            },
          })
        : [];


    const actorMap =
      new Map(
        actors.map(
          actor => [
            actor.id,
            actor,
          ],
        ),
      );


    const items =
      rows.map(
        row => {

          const actor =
            row.actorUserId
              ? actorMap.get(
                  row.actorUserId,
                )
              : undefined;


          return {
            ...row,

            actor: {
              id:
                actor?.id ??
                row.actorUserId,

              name:
                actor?.fullName ??
                row.actorLogin ??
                row.actorEmail ??
                'Неизвестный пользователь',

              login:
                actor?.login ??
                row.actorLogin,

              email:
                actor?.email ??
                row.actorEmail,

              position:
                actor?.position ??
                null,

              department:
                actor?.department?.name ??
                null,

              authType:
                row.actorAuthType,
            },
          };
        },
      );


    return {
      success:
        true,

      data:
        items,

      pagination: {
        page,

        pageSize,

        total,

        totalPages:
          Math.ceil(
            total /
            pageSize,
          ),
      },
    };
  },
);