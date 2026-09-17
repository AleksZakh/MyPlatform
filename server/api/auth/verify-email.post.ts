import {
  createHash,
} from 'node:crypto';

import {
  PrismaClient,
  RegistrationRequestStatus,
} from '@prisma/client';

const prisma = new PrismaClient();

type VerifyEmailBody = {
  token?: unknown;
};

const hashToken = (
  token: string,
): string => {
  return createHash('sha256')
    .update(token)
    .digest('hex');
};

export default defineEventHandler(
  async (event) => {
    const body =
      await readBody<VerifyEmailBody>(
        event,
      );

    // ========================================================
    // 1. Проверяем token
    // ========================================================

    // console.log('[VERIFY] body:', body);
    // console.log('[VERIFY] token typeof:', typeof body?.token);
    // console.log('[VERIFY] token value:', JSON.stringify(body?.token));
    // console.log(
    // '[VERIFY] token length:',
    // typeof body?.token === 'string'
    //     ? body.token.length
    //     : 'not string',
    // );
    

    if (
      typeof body?.token !== 'string' ||
      !body.token.trim()
    ) {
      throw createError({
        statusCode: 400,
        statusMessage:
          'Verification token required',
        message:
          'Отсутствует token подтверждения электронной почты.',
      });
    }

    const token =
      body.token.trim();

    // console.log('[VERIFY] normalized token:', JSON.stringify(token));
    // console.log('[VERIFY] normalized length:', token.length);
    // console.log(
    //     '[VERIFY] hex match:',
    //     /^[a-f0-9]{64}$/i.test(token),
    // );

    // Наш token = 32 bytes в hex,
    // поэтому ожидаем 64 hex-символа.
    if (!/^[a-f0-9]{64}$/i.test(token)){
      throw createError({
        statusCode: 400,
        statusMessage:
          'Invalid verification token',
        message:
          'Некорректный token подтверждения.',
      });
    }

    const verificationTokenHash =
      hashToken(token);

    // console.log(
    // '[VERIFY] calculated hash:',
    // verificationTokenHash,
    // );

    try {
      // ======================================================
      // 2. Ищем заявку по HASH, а не по исходному token
      // ======================================================

      const registrationRequest =
        await prisma.registrationRequest.findUnique({
          where: {
            verificationTokenHash,
          },

          select: {
            id: true,
            status: true,
            emailVerifiedAt: true,
            verificationExpiresAt: true,
          },
        });

      if (!registrationRequest) {
        throw createError({
          statusCode: 400,
          statusMessage:
            'Invalid verification token',
          message:
            'Ссылка подтверждения недействительна или уже была использована.',
        });
      }

      // ======================================================
      // 3. Проверяем состояние заявки
      // ======================================================

      if (
        registrationRequest.status !==
        RegistrationRequestStatus.EMAIL_PENDING
      ) {
        throw createError({
          statusCode: 409,
          statusMessage:
            'Email verification already processed',
          message:
            'Подтверждение электронной почты для этой заявки уже обработано.',
        });
      }

      // ======================================================
      // 4. Проверяем срок действия
      // ======================================================

      const expiresAt =
        registrationRequest
          .verificationExpiresAt;

      if (
        !expiresAt ||
        expiresAt.getTime() <= Date.now()
      ) {
        /**
         * Token истёк.
         *
         * Одновременно уничтожаем его,
         * чтобы он больше никогда не мог
         * использоваться.
         */
        await prisma.registrationRequest.updateMany({
          where: {
            id: registrationRequest.id,

            status:
              RegistrationRequestStatus.EMAIL_PENDING,

            verificationTokenHash,
          },

          data: {
            status:
              RegistrationRequestStatus.EXPIRED,

            verificationTokenHash: null,
            verificationExpiresAt: null,
          },
        });

        throw createError({
          statusCode: 410,
          statusMessage:
            'Verification token expired',
          message:
            'Срок действия ссылки подтверждения истёк.',
        });
      }

      // ======================================================
      // 5. Подтверждаем email
      // ======================================================
      //
      // Используем updateMany с дополнительными условиями.
      //
      // Если два запроса с одним token придут одновременно,
      // изменить запись сможет только один.
      // ======================================================

      const result =
        await prisma.registrationRequest.updateMany({
          where: {
            id: registrationRequest.id,

            status:
              RegistrationRequestStatus.EMAIL_PENDING,

            verificationTokenHash,
          },

          data: {
            emailVerifiedAt:
              new Date(),

            status:
              RegistrationRequestStatus.PENDING_REVIEW,

            // Token одноразовый.
            // После подтверждения уничтожаем его.
            verificationTokenHash:
              null,

            verificationExpiresAt:
              null,
          },
        });

      if (result.count !== 1) {
        throw createError({
          statusCode: 409,
          statusMessage:
            'Verification already processed',
          message:
            'Подтверждение уже было обработано.',
        });
      }

      // ======================================================
      // 6. Успешный ответ
      // ======================================================

      return {
        success: true,

        requestId:
          registrationRequest.id,

        status:
          RegistrationRequestStatus.PENDING_REVIEW,

        message:
          'Электронная почта успешно подтверждена. Заявка передана на рассмотрение.',
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
        'Ошибка подтверждения email:',
        error,
      );

      throw createError({
        statusCode: 500,
        statusMessage:
          'Email verification error',
        message:
          'Не удалось подтвердить электронную почту.',
      });
    }
  },
);