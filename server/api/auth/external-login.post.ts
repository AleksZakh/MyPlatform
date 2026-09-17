import {
  PrismaClient,
  UserAuthType,
  UserStatus,
} from '@prisma/client';

import {
  verifyPassword,
} from '../../utils/password';

const prisma =
  new PrismaClient();

type ExternalLoginBody = {
  email?: unknown;
  password?: unknown;
};

export default defineEventHandler(
  async (event) => {
    const body =
      await readBody<ExternalLoginBody>(
        event,
      );

    const email =
      typeof body?.email === 'string'
        ? body.email
            .trim()
            .toLowerCase()
        : '';

    const password =
      typeof body?.password === 'string'
        ? body.password
        : '';

    if (
      !email ||
      !password
    ) {
      throw createError({
        statusCode: 400,
        message:
          'Необходимо указать email и пароль.',
      });
    }

    const user =
      await prisma.user.findUnique({
        where: {
          email,
        },

        select: {
          id: true,

          email: true,
          fullName: true,

          authType: true,
          status: true,

          passwordHash: true,

          departmentId: true,
        },
      });

    /*
     * Намеренно возвращаем одно и то же сообщение
     * как для отсутствующего email,
     * так и для неправильного пароля.
     */
    const invalidCredentials = (): never => {
        throw createError({
            statusCode: 401,
            statusMessage:
            'Invalid credentials',

            message:
            'Неверный email или пароль.',
        });
    };

    if (!user) {
        throw createError({
            statusCode: 401,
            statusMessage: 'Invalid credentials',
            message: 'Неверный email или пароль.',
        });
        }

        if (
        user.authType !==
        UserAuthType.EXTERNAL
        ) {
        invalidCredentials();
        }

        if (
        user.status !==
        UserStatus.ACTIVE
        ) {
        throw createError({
            statusCode: 403,
            message:
            'Учётная запись ещё не активирована или заблокирована.',
        });
        }

        const passwordHash =
        user.passwordHash;

        if (!passwordHash) {
        throw createError({
            statusCode: 403,
            message:
            'Для учётной записи ещё не установлен пароль.',
        });
        }

        const passwordIsValid =
        await verifyPassword(
            password,
            passwordHash,
        );

        if (!passwordIsValid) {
        invalidCredentials();
        }
    
        if (!user.email) {
            throw createError({
                statusCode: 500,
                message:
                'У внешней учётной записи отсутствует email.',
            });
        }

        const userEmail = user.email;

    await setUserSession(
        event,
        {
            user: {
            id:
                user.id,

            login:
                userEmail,

            email:
                userEmail,

            fullName:
                user.fullName ??
                userEmail,

            authType:
                'EXTERNAL',
            },
        },
        );

    return {
      success: true,

      user: {
        id:
          user.id,

        email:
          user.email,

        fullName:
          user.fullName,

        authType:
          user.authType,
      },

      message:
        'Вход выполнен успешно.',
    };
  },
);