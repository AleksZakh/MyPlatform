import {
  PrismaClient,
  RegistrationRequestStatus,
} from '@prisma/client';

const prisma = new PrismaClient();

type ReviewResource = {
  resourceId?: unknown;
  approved?: unknown;
};

type ReviewRequestBody = {
  resources?: unknown;
  adminComment?: unknown;
};

const normalizeComment = (
  value: unknown,
): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const result = value.trim();

  return result || null;
};

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event);

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
      message:
        'Некорректный идентификатор заявки.',
    });
  }

  const body =
    await readBody<ReviewRequestBody>(event);

  if (!Array.isArray(body?.resources)) {
    throw createError({
      statusCode: 400,
      message:
        'Необходимо передать решения по ресурсам.',
    });
  }

  const rawResources =
    body.resources as ReviewResource[];

  if (rawResources.length === 0) {
    throw createError({
      statusCode: 400,
      message:
        'Список решений по ресурсам пуст.',
    });
  }

  const decisions =
    rawResources.map((item) => {
      const resourceId =
        item?.resourceId;

      const approved =
        item?.approved;

      if (
        typeof resourceId !== 'number' ||
        !Number.isInteger(resourceId) ||
        resourceId <= 0 ||
        typeof approved !== 'boolean'
      ) {
        throw createError({
          statusCode: 400,
          message:
            'Список решений содержит некорректные данные.',
        });
      }

      return {
        resourceId,
        approved,
      };
    });

  // ---------------------------------------------------------
  // Проверяем дубликаты resourceId
  // ---------------------------------------------------------

  const uniqueIds =
    new Set(
      decisions.map(
        (item) => item.resourceId,
      ),
    );

  if (
    uniqueIds.size !==
    decisions.length
  ) {
    throw createError({
      statusCode: 400,
      message:
        'Один ресурс указан несколько раз.',
    });
  }

  const adminComment =
    normalizeComment(
      body.adminComment,
    );

  if (
    adminComment &&
    adminComment.length > 2000
  ) {
    throw createError({
      statusCode: 400,
      message:
        'Комментарий администратора слишком длинный.',
    });
  }

  // ---------------------------------------------------------
  // Получаем исходную заявку
  // ---------------------------------------------------------

  const registrationRequest =
    await prisma.registrationRequest.findUnique({
      where: {
        id: requestId,
      },

      select: {
        id: true,
        status: true,

        requestedResources: {
          select: {
            resourceId: true,
          },
        },
      },
    });

  if (!registrationRequest) {
    throw createError({
      statusCode: 404,
      message:
        'Заявка не найдена.',
    });
  }

  if (
    registrationRequest.status !==
    RegistrationRequestStatus.PENDING_REVIEW
  ) {
    throw createError({
      statusCode: 409,
      message:
        'Эта заявка уже была рассмотрена или недоступна для рассмотрения.',
    });
  }

  // ---------------------------------------------------------
  // Администратор должен принять решение
  // по КАЖДОМУ запрошенному ресурсу.
  // ---------------------------------------------------------

  const requestedIds =
    new Set(
      registrationRequest
        .requestedResources
        .map(
          (item) =>
            item.resourceId,
        ),
    );

  if (
    requestedIds.size !==
    decisions.length
  ) {
    throw createError({
      statusCode: 400,
      message:
        'Необходимо принять решение по каждому запрошенному ресурсу.',
    });
  }

  for (
    const decision of decisions
  ) {
    if (
      !requestedIds.has(
        decision.resourceId,
      )
    ) {
      throw createError({
        statusCode: 400,
        message:
          `Ресурс ${decision.resourceId} не относится к этой заявке.`,
      });
    }
  }

  // ---------------------------------------------------------
  // Вычисляем итоговый статус НА СЕРВЕРЕ
  // ---------------------------------------------------------

  const approvedCount =
    decisions.filter(
      (item) => item.approved,
    ).length;

  const rejectedCount =
    decisions.length -
    approvedCount;

  let finalStatus: RegistrationRequestStatus;
  if (
    approvedCount ===
    decisions.length
  ) {
    finalStatus =
      RegistrationRequestStatus.APPROVED;
  }
  else if (
    rejectedCount ===
    decisions.length
  ) {
    finalStatus =
      RegistrationRequestStatus.REJECTED;
  }
  else {
    finalStatus =
      RegistrationRequestStatus.PARTIALLY_APPROVED;
  }

  try {
    /*
     * Здесь interactive transaction уже оправдана.
     *
     * Внутри ТОЛЬКО операции PostgreSQL.
     * Никакого SMTP, HTTP и другой долгой работы.
     *
     * Это позволяет не допустить ситуацию,
     * когда два администратора одновременно
     * рассматривают одну заявку.
     */

    await prisma.$transaction(
      async (tx) => {
        // Сначала "захватываем" ещё не рассмотренную заявку.
        const result =
          await tx.registrationRequest.updateMany({
            where: {
              id: requestId,

              status:
                RegistrationRequestStatus
                  .PENDING_REVIEW,
            },

            data: {
              status:
                finalStatus,

              reviewedAt:
                new Date(),

              reviewedByLogin:
                admin.login,

              adminComment,
            },
          });

        if (result.count !== 1) {
          throw createError({
            statusCode: 409,
            message:
              'Заявка уже была рассмотрена другим администратором.',
          });
        }

        // Записываем решение по каждому ресурсу.
        for (
          const decision of decisions
        ) {
          await tx.registrationRequestResource.update({
            where: {
              registrationRequestId_resourceId: {
                registrationRequestId:
                  requestId,

                resourceId:
                  decision.resourceId,
              },
            },

            data: {
              approved:
                decision.approved,
            },
          });
        }
      },

      {
        // Здесь транзакция очень короткая.
        // Но оставляем небольшой запас.
        maxWait: 5000,
        timeout: 10000,
      },
    );

    return {
      success: true,

      requestId,

      status:
        finalStatus,

      approvedCount,

      rejectedCount,

      message:
        finalStatus ===
        RegistrationRequestStatus.APPROVED
          ? 'Заявка полностью одобрена.'
          : finalStatus ===
              RegistrationRequestStatus.REJECTED
            ? 'Заявка отклонена.'
            : 'Заявка частично одобрена.',
    };
  }
  catch (error: any) {
    if (
      error?.statusCode &&
      typeof error.statusCode ===
        'number'
    ) {
      throw error;
    }

    console.error(
      'Ошибка рассмотрения заявки:',
      error,
    );

    throw createError({
      statusCode: 500,
      message:
        'Не удалось сохранить решение по заявке.',
    });
  }
});