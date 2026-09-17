import {
  createHash,
} from 'node:crypto';

import {
  PrismaClient,
  UserStatus,
} from '@prisma/client';

const prisma =
  new PrismaClient();

type ActivateAccountBody = {
  token?: unknown;
  password?: unknown;
};

export default defineEventHandler(
  async (event) => {
    const body =
      await readBody<ActivateAccountBody>(
        event,
      );

    // --------------------------------------------------------
    // 1. Проверяем token
    // --------------------------------------------------------

    const token =
      typeof body?.token === 'string'
        ? body.token.trim()
        : '';

    if (
      !/^[a-f0-9]{64}$/i.test(token)
    ) {
      throw createError({
        statusCode: 400,
        message:
          'Некорректная ссылка активации.',
      });
    }

    // --------------------------------------------------------
    // 2. Проверяем пароль
    // --------------------------------------------------------

    const password =
      typeof body?.password === 'string'
        ? body.password
        : '';

    if (password.length < 12) {
      throw createError({
        statusCode: 400,
        message:
          'Пароль должен содержать не менее 12 символов.',
      });
    }

    if (password.length > 128) {
      throw createError({
        statusCode: 400,
        message:
          'Пароль слишком длинный.',
      });
    }

    // --------------------------------------------------------
    // 3. Хэшируем activation token
    // --------------------------------------------------------

    const activationTokenHash =
      createHash('sha256')
        .update(token)
        .digest('hex');

    // --------------------------------------------------------
    // 4. Ищем пользователя
    // --------------------------------------------------------

    const user =
      await prisma.user.findUnique({
        where: {
          activationTokenHash,
        },

        select: {
          id: true,
          status: true,
          activationExpiresAt: true,
        },
      });

    if (!user) {
      throw createError({
        statusCode: 400,
        message:
          'Ссылка активации недействительна или уже была использована.',
      });
    }

    if (
      user.status !==
      UserStatus.PENDING_ACTIVATION
    ) {
      throw createError({
        statusCode: 409,
        message:
          'Учётная запись уже активирована или недоступна для активации.',
      });
    }

    // --------------------------------------------------------
    // 5. Проверяем срок действия
    // --------------------------------------------------------

    const now =
      new Date();

    if (
      !user.activationExpiresAt ||
      user.activationExpiresAt <= now
    ) {
      await prisma.user.updateMany({
        where: {
          id: user.id,

          status:
            UserStatus.PENDING_ACTIVATION,

          activationTokenHash,
        },

        data: {
          activationTokenHash: null,
          activationExpiresAt: null,
        },
      });

      throw createError({
        statusCode: 410,
        message:
          'Срок действия ссылки активации истёк.',
      });
    }

    // --------------------------------------------------------
    // 6. Хэшируем НОВЫЙ ПАРОЛЬ
    // --------------------------------------------------------

    const passwordHash =
      await hashPassword(password);

    // --------------------------------------------------------
    // 7. Активируем пользователя
    //
    // updateMany здесь ещё и защищает от двойного
    // использования token.
    // --------------------------------------------------------

    const result =
      await prisma.user.updateMany({
        where: {
          id: user.id,

          status:
            UserStatus.PENDING_ACTIVATION,

          activationTokenHash,

          activationExpiresAt: {
            gt: new Date(),
          },
        },

        data: {
          passwordHash,

          status:
            UserStatus.ACTIVE,

          activatedAt:
            new Date(),

          activationTokenHash:
            null,

          activationExpiresAt:
            null,
        },
      });

    if (result.count !== 1) {
      throw createError({
        statusCode: 409,
        message:
          'Ссылка активации уже была использована или срок её действия истёк.',
      });
    }

    return {
      success: true,

      userId:
        user.id,

      status:
        UserStatus.ACTIVE,

      message:
        'Учётная запись успешно активирована. Теперь вы можете войти в Space.',
    };
  },
);