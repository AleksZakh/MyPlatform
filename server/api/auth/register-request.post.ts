import { PrismaClient, RegistrationRequestStatus } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';

const prisma = new PrismaClient();

type RegistrationRequestBody = {
  fullName?: unknown;
  organization?: unknown;
  position?: unknown;
  email?: unknown;
  accessReason?: unknown;
  resourceIds?: unknown;
};

/**
 * Нормализация обычного текстового поля.
 *
 * Убираем:
 * - пробелы в начале и конце;
 * - повторяющиеся пробелы внутри строки.
 */
const normalizeText = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }

  return value
    .trim()
    .replace(/\s+/g, ' ');
};

/**
 * Email дополнительно приводим к нижнему регистру.
 */
const normalizeEmail = (value: unknown): string => {
  return normalizeText(value).toLowerCase();
};

/**
 * Базовая серверная проверка email.
 *
 * Это не попытка реализовать весь RFC email,
 * а нормальная практическая проверка формата.
 */
const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export default defineEventHandler(async (event) => {
  // ============================================================
  // 1. Читаем тело запроса
  // ============================================================

  const body =
    await readBody<RegistrationRequestBody>(event);

  // ============================================================
  // 2. Нормализуем входные данные
  // ============================================================

  const fullName =
    normalizeText(body?.fullName);

  const organization =
    normalizeText(body?.organization);

  const position =
    normalizeText(body?.position);

  const email =
    normalizeEmail(body?.email);

  const accessReason =
    normalizeText(body?.accessReason) || null;

  // ============================================================
  // 3. Проверяем основные поля
  // ============================================================

  if (!fullName) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation error',
      message: 'Необходимо указать ФИО.',
    });
  }

  if (fullName.length > 255) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation error',
      message: 'ФИО слишком длинное.',
    });
  }

  if (!organization) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation error',
      message: 'Необходимо указать организацию.',
    });
  }

  if (organization.length > 255) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation error',
      message: 'Название организации слишком длинное.',
    });
  }

  if (!position) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation error',
      message: 'Необходимо указать должность.',
    });
  }

  if (position.length > 255) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation error',
      message: 'Название должности слишком длинное.',
    });
  }

  if (!email) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation error',
      message: 'Необходимо указать электронную почту.',
    });
  }

  if (
    email.length > 255 ||
    !isValidEmail(email)
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation error',
      message:
        'Укажите корректный адрес электронной почты.',
    });
  }

  if (
    accessReason &&
    accessReason.length > 2000
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation error',
      message:
        'Описание причины доступа слишком длинное.',
    });
  }

  // ============================================================
  // 4. Проверяем resourceIds
  // ============================================================

  if (!Array.isArray(body?.resourceIds)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation error',
      message:
        'Необходимо выбрать ресурсы для доступа.',
    });
  }

  /**
   * Здесь намеренно не "исправляем" плохие ID.
   *
   * Если клиент передал:
   *
   * [1, 2, "3"]
   *
   * весь запрос считаем некорректным.
   */
  const hasInvalidResourceId =
    body.resourceIds.some(
      (id) =>
        typeof id !== 'number' ||
        !Number.isInteger(id) ||
        id <= 0,
    );

  if (hasInvalidResourceId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation error',
      message:
        'Список выбранных ресурсов содержит некорректные значения.',
    });
  }

  /**
   * После проверки TypeScript ещё не знает,
   * что массив содержит только number,
   * поэтому приводим тип явно.
   */
  const rawResourceIds =
    body.resourceIds as number[];

  /**
   * Удаляем возможные дубликаты.
   *
   * [1, 1, 2, 3, 3]
   * ->
   * [1, 2, 3]
   */
  const resourceIds = [
    ...new Set(rawResourceIds),
  ];

  if (resourceIds.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation error',
      message:
        'Выберите хотя бы один ресурс.',
    });
  }

  if (resourceIds.length > 100) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation error',
      message:
        'Выбрано слишком много ресурсов.',
    });
  }

  // ============================================================
  // 5. Проверяем существующую заявку
  // ============================================================

  try {
    const existingRequest =
      await prisma.registrationRequest.findFirst({
        where: {
          email,

          status: {
            in: [
              RegistrationRequestStatus.EMAIL_PENDING,
              RegistrationRequestStatus.PENDING_REVIEW,
              RegistrationRequestStatus.APPROVED,
              RegistrationRequestStatus.PARTIALLY_APPROVED,
            ],
          },
        },

        select: {
          id: true,
          status: true,
        },
      });

    if (existingRequest) {
      throw createError({
        statusCode: 409,
        statusMessage:
          'Registration request already exists',
        message:
          'Для этого адреса электронной почты уже существует активная заявка.',
      });
    }

    // ==========================================================
    // 6. Проверяем выбранные ресурсы
    // ==========================================================

    const resources =
      await prisma.accessResource.findMany({
        where: {
          id: {
            in: resourceIds,
          },

          // Ресурс должен быть активен
          isActive: true,

          // И должен относиться хотя бы
          // к одному активному подразделению
          departments: {
            some: {
              department: {
                isActive: true,
              },
            },
          },
        },

        select: {
          id: true,
          key: true,
          name: true,
        },
      });

    /**
     * Если пользователь прислал:
     *
     * [1, 2, 999]
     *
     * а БД нашла только 1 и 2,
     * значит 999 является недоступным ресурсом.
     */
    const validResourceIds =
      new Set(
        resources.map(
          (resource) => resource.id,
        ),
      );

    const invalidResourceIds =
      resourceIds.filter(
        (id) =>
          !validResourceIds.has(id),
      );

    if (invalidResourceIds.length > 0) {
      console.warn(
        'Попытка регистрации с недоступными ресурсами:',
        {
          email,
          invalidResourceIds,
        },
      );

      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid resources',
        message:
          'Один или несколько выбранных ресурсов недоступны.',
      });
    }

    // ==========================================================
    // 7. Создаём заявку
    // ==========================================================
    //
    // Отдельный prisma.$transaction() здесь НЕ нужен.
    //
    // registrationRequest.create + nested create
    // выполняются Prisma как единая атомарная операция.
    //
    // Если создание хотя бы одного дочернего ресурса
    // завершится ошибкой, заявка целиком не будет создана.
    // ==========================================================

    // ==========================================================
    // Создаём одноразовый token подтверждения email
    // ==========================================================

    const verificationToken =
      randomBytes(32).toString('hex');

    const verificationTokenHash =
      createHash('sha256')
        .update(verificationToken)
        .digest('hex');

    const verificationExpiresAt =
      new Date(
        Date.now() + 24 * 60 * 60 * 1000,
      );

    // console.log(
    //   '[REGISTER] token:',
    //   verificationToken,
    // );

    // console.log(
    //   '[REGISTER] hash:',
    //   verificationTokenHash,
    // );

    const registrationRequest =
      await prisma.registrationRequest.create({
        data: {
          fullName,
          organization,
          position,
          email,
          accessReason,

          status:
            RegistrationRequestStatus.EMAIL_PENDING,

          // ОБЯЗАТЕЛЬНО должны быть здесь
          verificationTokenHash,
          verificationExpiresAt,

          // Пока письмо реально не отправляем
          verificationSentAt: null,

          requestedResources: {
            create: resourceIds.map(
              (resourceId) => ({
                resourceId,
              }),
            ),
          },
        },

        select: {
          id: true,
          status: true,
          createdAt: true,

          requestedResources: {
            select: {
              resourceId: true,
            },
          },
        },
      });

    // const savedRequest =
    //   await prisma.registrationRequest.findUnique({
    //     where: {
    //       id: registrationRequest.id,
    //     },

    //     select: {
    //       id: true,
    //       email: true,
    //       status: true,
    //       verificationTokenHash: true,
    //       verificationExpiresAt: true,
    //       verificationSentAt: true,
    //     },
    //   });

    // console.log(
    //   '[REGISTER] saved request:',
    //   savedRequest,
    // );

    if (import.meta.dev) {
        // console.log(
        //     '\n[DEV] Email verification token:',
        // );

        // console.log(verificationToken);

        // console.log(
        //     '[DEV] POST /api/auth/verify-email',
        // );

        // console.log(
        //     '[DEV] Body:',
        //     {
        //     token: verificationToken,
        //     },
        // );
    }

    // ==========================================================
    // 8. Возвращаем безопасный ответ клиенту
    // ==========================================================

    return {
      success: true,

      requestId:
        registrationRequest.id,

      status:
        registrationRequest.status,

      resourcesCount:
        registrationRequest
          .requestedResources.length,

      createdAt:
        registrationRequest.createdAt,

      message:
        'Заявка на регистрацию успешно создана.',
    };
  }
  catch (error: any) {
    /**
     * createError(), которые мы сами создали выше:
     *
     * 400
     * 409
     *
     * должны уйти клиенту как есть,
     * а не превратиться в 500.
     */
    if (
      error?.statusCode &&
      typeof error.statusCode === 'number'
    ) {
      throw error;
    }

    console.error(
      'Ошибка создания заявки на регистрацию:',
      error,
    );

    throw createError({
      statusCode: 500,
      statusMessage:
        'Registration request error',
      message:
        'Не удалось создать заявку на регистрацию.',
    });
  }
});