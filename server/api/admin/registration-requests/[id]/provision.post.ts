import {
  AccessAction,
  Prisma,
  PrismaClient,
  RegistrationRequestStatus,
  UserAuthType,
  UserStatus,
} from '@prisma/client';

import {
  createHash,
  randomBytes,
} from 'node:crypto';

import {
  sendActivationEmail,
} from '../../../../utils/mailer';

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event);

  const requestId =
    Number(getRouterParam(event, 'id'));

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

  try {
    const activationToken =
    randomBytes(32).toString('hex');

    const activationTokenHash =
    createHash('sha256')
        .update(activationToken)
        .digest('hex');

    const activationExpiresAt =
    new Date(
        Date.now() + 24 * 60 * 60 * 1000,
    );
    const result =
      await prisma.$transaction(
        async (tx) => {
          // ---------------------------------------------------
          // 1. Получаем рассмотренную заявку
          // ---------------------------------------------------

          const registrationRequest =
            await tx.registrationRequest.findUnique({
              where: {
                id: requestId,
              },

              select: {
                id: true,
                fullName: true,
                organization: true,
                position: true,
                email: true,
                status: true,

                requestedResources: {
                  where: {
                    approved: true,
                  },

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

          // ---------------------------------------------------
          // 2. Provisioning разрешён только после одобрения
          // ---------------------------------------------------

          const canProvision =
            registrationRequest.status ===
              RegistrationRequestStatus.APPROVED ||
            registrationRequest.status ===
              RegistrationRequestStatus.PARTIALLY_APPROVED;

          if (!canProvision) {
            throw createError({
              statusCode: 409,
              message:
                'Пользователь может быть создан только из одобренной или частично одобренной заявки.',
            });
          }

          if (
            registrationRequest
              .requestedResources.length === 0
          ) {
            throw createError({
              statusCode: 409,
              message:
                'В заявке нет одобренных ресурсов.',
            });
          }

          // ---------------------------------------------------
          // 3. Проверяем, что эта заявка ещё не provisioned
          // ---------------------------------------------------

          const existingRequestUser =
            await tx.user.findUnique({
              where: {
                registrationRequestId:
                  requestId,
              },

              select: {
                id: true,
              },
            });

          if (existingRequestUser) {
            throw createError({
              statusCode: 409,
              message:
                'Для этой заявки пользователь уже создан.',
            });
          }

          // ---------------------------------------------------
          // 4. Не создаём второй EXTERNAL User с тем же email
          // ---------------------------------------------------

          const existingEmailUser =
            await tx.user.findFirst({
              where: {
                email:
                  registrationRequest.email,

                authType:
                  UserAuthType.EXTERNAL,
              },

              select: {
                id: true,
              },
            });

          if (existingEmailUser) {
            throw createError({
              statusCode: 409,
              message:
                'Пользователь с таким адресом электронной почты уже существует.',
            });
          }

          // ---------------------------------------------------
          // 5. Создаём пользователя и VIEW-права
          // ---------------------------------------------------

          const user =
            await tx.user.create({
              data: {
                authType:
                  UserAuthType.EXTERNAL,

                status:
                  UserStatus.PENDING_ACTIVATION,

                login: null,
                directoryObjectId: null,

                email:
                  registrationRequest.email,

                fullName:
                  registrationRequest.fullName,

                organization:
                  registrationRequest.organization,

                position:
                  registrationRequest.position,

                passwordHash: null,

                activationTokenHash,
                activationExpiresAt,
                activationSentAt: null,
                activatedAt: null,

                registrationRequestId:
                  registrationRequest.id,

                permissions: {
                  create:
                    registrationRequest
                      .requestedResources
                      .map((item) => ({
                        resourceId:
                          item.resourceId,

                        action:
                          AccessAction.VIEW,

                        grantedByLogin:
                          admin.login,
                      })),
                },
              },

              select: {
                id: true,
                email: true,
                fullName: true,
                status: true,

                permissions: {
                  select: {
                    id: true,
                    resourceId: true,
                    action: true,
                  },
                },
              },
            });

          // ---------------------------------------------------
          // 6. Закрываем регистрационную заявку
          // ---------------------------------------------------

          const completedRequest =
            await tx.registrationRequest.updateMany({
              where: {
                id:
                  registrationRequest.id,

                status: {
                  in: [
                    RegistrationRequestStatus.APPROVED,
                    RegistrationRequestStatus.PARTIALLY_APPROVED,
                  ],
                },
              },

              data: {
                status:
                  RegistrationRequestStatus.COMPLETED,
              },
            });

          if (completedRequest.count !== 1) {
            throw createError({
              statusCode: 409,
              message:
                'Состояние заявки изменилось во время создания пользователя.',
            });
          }

          return {
            user,

            email:
                registrationRequest.email,

            fullName:
                registrationRequest.fullName,
            };
        },

        {
          maxWait: 5000,
          timeout: 10000,
        },
      );
    let activationEmailSent = false;
    try {
        await sendActivationEmail({
            email:
            result.email,

            fullName:
            result.fullName,

            token:
            activationToken,
        });

        await prisma.user.update({
            where: {
            id: result.user.id,
            },

            data: {
            activationSentAt:
                new Date(),
            },
        });

        activationEmailSent = true;
        }
        catch (mailError) {
        console.error(
            'Пользователь создан, но письмо активации не отправлено:',
            {
            userId:
                result.user.id,

            email:
                result.email,

            error:
                mailError,
            },
        );
        }

    return {
        success: true,

        userId:
            result.user.id,

        email:
            result.email,

        status:
            result.user.status,

        permissionsCount:
            result.user
            .permissions.length,

        activationEmailSent,

        message:
            activationEmailSent
            ? 'Пользователь создан. Письмо для активации учётной записи отправлено.'
            : 'Пользователь создан, но письмо активации отправить не удалось. Его можно будет отправить повторно.',
        };
  }
  catch (error: any) {
    if (
      error?.statusCode &&
      typeof error.statusCode === 'number'
    ) {
      throw error;
    }

    /*
     * registrationRequestId у User уникален.
     *
     * Если два администратора одновременно нажмут
     * "Создать пользователя", уникальное ограничение
     * станет ещё одним уровнем защиты.
     */
    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw createError({
        statusCode: 409,
        message:
          'Пользователь уже существует или заявка уже была обработана.',
      });
    }

    console.error(
      'Ошибка создания пользователя из заявки:',
      error,
    );

    throw createError({
      statusCode: 500,
      message:
        'Не удалось создать пользователя.',
    });
  }
});