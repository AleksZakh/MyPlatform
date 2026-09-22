import {
  AccessAction,
  UserStatus,
} from '@prisma/client';

import type { H3Event,} from 'h3';
import { createError,} from 'h3';
import { prisma,} from '../utils/prisma';
import { logger,} from '../utils/logger';
import {
  auditDenied,
} from '../utils/auditLog';

type PermissionContext = {
  userId: number;
  login: string | null;

  resourceId: number;
  resourceKey: string;

  action: AccessAction;

  isSystemAdmin: boolean;

  source:
    | 'SYSTEM_ADMIN'
    | 'USER'
    | 'DEPARTMENT';

  departmentId?: number;
};


/**
 * Преобразуем NUXT_ADMIN_LOGINS в Set.
 *
 * Поддерживаем:
 *
 * ivanov,petrov
 * ivanov;petrov
 * ivanov petrov
 */
function getAdminLogins(
  value: unknown,
): Set<string> {
  if (Array.isArray(value)) {
    return new Set(
      value
        .filter(
          (
            item,
          ): item is string =>
            typeof item === 'string',
        )
        .map(
          (item) =>
            item
              .trim()
              .toLowerCase(),
        )
        .filter(Boolean),
    );
  }


  if (
    typeof value !== 'string'
  ) {
    return new Set();
  }


  return new Set(
    value
      .split(
        /[,;\s]+/,
      )
      .map(
        (item) =>
          item
            .trim()
            .toLowerCase(),
      )
      .filter(Boolean),
  );
}


/**
 * ============================================================
 * requirePermission()
 * ============================================================
 *
 * Проверяет:
 *
 * session
 *   ↓
 * app_users
 *   ↓
 * ACTIVE
 *   ↓
 * SYSTEM ADMIN ?
 *   ↓
 * UserPermission
 *   ↓
 * DepartmentPermission
 *   ↓
 * ALLOW / 403
 */
export async function requirePermission(
  event: H3Event,
  resourceKey: string,
  action: AccessAction,
): Promise<PermissionContext> {

  /**
   * ----------------------------------------------------------
   * 1. Session
   * ----------------------------------------------------------
   */
  const session =
    await getUserSession(
      event,
    );


  const sessionUser =
    session?.user;


  const userId =
    sessionUser?.id;


  if (
    typeof userId !== 'number' ||
    !Number.isInteger(userId) ||
    userId <= 0
  ) {
    throw createError({
      statusCode: 401,

      statusMessage:
        'Authentication required',

      message:
        'Не удалось определить пользователя.',
    });
  }


  /**
   * ----------------------------------------------------------
   * 2. Проверяем локального пользователя
   * ----------------------------------------------------------
   *
   * Не доверяем одному только содержимому session.
   *
   * Статус мог измениться после создания cookie.
   */
  const appUser =
    await prisma.user.findUnique({
      where: {
        id: userId,
      },

      select: {
        id: true,
        login: true,
        email: true,
        status: true,

        departmentId: true,

        department: {
          select: {
            id: true,
            isActive: true,
          },
        },
      },
    });


  if (!appUser) {
    logger.warn(
      `ACCESS DENIED: userId=${userId} отсутствует в app_users`,
    );


    throw createError({
      statusCode: 401,

      statusMessage:
        'User not found',

      message:
        'Учётная запись пользователя не найдена.',
    });
  }


  /**
   * Заблокированный пользователь не получает доступ,
   * даже если session была создана раньше.
   */
  if (
    appUser.status !==
    UserStatus.ACTIVE
  ) {
    logger.warn(
      `ACCESS DENIED: userId=${appUser.id}, status=${appUser.status}`,
    );


    throw createError({
      statusCode: 403,

      statusMessage:
        'User is not active',

      message:
        'Учётная запись пользователя заблокирована или отключена.',
    });
  }


  /**
   * ----------------------------------------------------------
   * 3. Проверяем ресурс
   * ----------------------------------------------------------
   */
  const resource =
    await prisma.accessResource.findUnique({
      where: {
        key: resourceKey,
      },

      select: {
        id: true,
        key: true,
        isActive: true,
      },
    });


  /**
   * Если разработчик указал несуществующий resourceKey —
   * это ошибка конфигурации приложения,
   * а не отсутствие прав у пользователя.
   */
  if (!resource) {
    logger.error(
      `Неизвестный AccessResource: ${resourceKey}`,
    );


    throw createError({
      statusCode: 500,

      statusMessage:
        'Access resource configuration error',
    });
  }


  if (!resource.isActive) {
    logger.warn(
      `ACCESS DENIED: resource=${resourceKey} отключён`,
    );


    throw createError({
      statusCode: 403,

      statusMessage:
        'Resource unavailable',

      message:
        'Доступ к ресурсу временно отключён.',
    });
  }


  /**
   * ----------------------------------------------------------
   * 4. Bootstrap SYSTEM ADMIN
   * ----------------------------------------------------------
   *
   * Пока полноценные административные роли
   * ещё не введены.
   *
   * ВАЖНО:
   * bypass идёт только ПОСЛЕ проверки ACTIVE.
   */
  const config =
    useRuntimeConfig(
      event,
    );


  const adminLogins =
    getAdminLogins(
      config.adminLogins,
    );


  const normalizedLogin =
    appUser.login
      ?.trim()
      .toLowerCase() ??
    null;

    const actorIdentifier =
    normalizedLogin ||
    appUser.email
        ?.trim()
        .toLowerCase() ||
    `userId:${appUser.id}`;


  const isSystemAdmin =
    Boolean(
      normalizedLogin &&
      adminLogins.has(
        normalizedLogin,
      ),
    );


  if (isSystemAdmin) {
    return {
      userId:
        appUser.id,

      login:
        normalizedLogin,

      resourceId:
        resource.id,

      resourceKey:
        resource.key,

      action,

      isSystemAdmin:
        true,

      source:
        'SYSTEM_ADMIN',
    };
  }


  /**
   * ----------------------------------------------------------
   * 5. UserPermission + DepartmentPermission
   * ----------------------------------------------------------
   *
   * Effective permission сейчас аддитивный:
   *
   * UserPermission
   *       OR
   * DepartmentPermission активного подразделения пользователя.
   *
   * DENY пока намеренно не вводим.
   */
  const activeDepartmentId =
    appUser.department?.isActive
      ? appUser.department.id
      : null;


  const [
    userPermission,
    departmentPermission,
  ] =
    await Promise.all([
      prisma.userPermission.findFirst({
        where: {
          userId:
            appUser.id,

          resourceId:
            resource.id,

          action,
        },

        select: {
          id: true,
        },
      }),

      activeDepartmentId
        ? prisma.departmentPermission.findFirst({
            where: {
              departmentId:
                activeDepartmentId,

              resourceId:
                resource.id,

              action,
            },

            select: {
              id: true,
            },
          })
        : Promise.resolve(null),
    ]);


  const grantedByUser =
    Boolean(
      userPermission,
    );


  const grantedByDepartment =
    Boolean(
      departmentPermission,
    );


  if (
    !grantedByUser &&
    !grantedByDepartment
  ) {

    logger.warn(
      `ACCESS DENIED: userId=${appUser.id}, ` +
      `actor=${actorIdentifier}, ` +
      `departmentId=${activeDepartmentId ?? 'none'}, ` +
      `resource=${resource.key}, action=${action}`,
    );

    await auditDenied({
      event,

      actorUserId:
        appUser.id,

      actorLogin:
        normalizedLogin,

      actorEmail:
        appUser.email,

      actorAuthType:
        sessionUser?.authType ??
        null,

      resourceKey:
        resource.key,

      action:
        String(action),
    });


    throw createError({
      statusCode: 403,

      statusMessage:
        'Permission denied',

      message:
        'Недостаточно прав для выполнения операции.',

      data: {
        code:
          'PERMISSION_DENIED',

        resource:
          resource.key,

        action,
      },
    });
  }


  /**
   * ----------------------------------------------------------
   * 6. ACCESS GRANTED
   * ----------------------------------------------------------
   */
  return {
    userId:
      appUser.id,

    login:
      normalizedLogin,

    resourceId:
      resource.id,

    resourceKey:
      resource.key,

    action,

    isSystemAdmin:
      false,

    /**
     * Если право есть и персонально, и через подразделение,
     * для диагностики считаем персональное более конкретным.
     */
    source:
      grantedByUser
        ? 'USER'
        : 'DEPARTMENT',

    ...(grantedByUser
      ? {}
      : {
          departmentId:
            activeDepartmentId!,
        }),
  };
}
