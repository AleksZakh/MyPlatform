// server/api/auth/kerberos.post.ts

import { logger } from '../../utils/logger';

import {
  findDomainUser,
} from '../../services/ad-directory.service';

import {
  ensureDomainUser,
  assertDomainUserCanLogin,
} from '../../services/domain-user.service';


/**
 * ============================================================
 * POST /api/auth/kerberos
 * ============================================================
 *
 * Kerberos-аутентификация выполняется nginx.
 *
 * nginx:
 *
 *   auth_gss on;
 *        ↓
 *   X-Remote-User
 *        ↓
 *   этот endpoint
 *
 * Сам endpoint пароль НЕ проверяет.
 */
export default defineEventHandler(async (event) => {

  /**
   * ----------------------------------------------------------
   * 1. Получаем пользователя, подтверждённого nginx/Kerberos
   * ----------------------------------------------------------
   */
  const remoteUser =
    getRequestHeader(
      event,
      'x-remote-user',
    ) ||
    getRequestHeader(
      event,
      'remote-user',
    ) ||
    getRequestHeader(
      event,
      'x-forwarded-user',
    );


  if (!remoteUser) {
    logger.warn(
      'Kerberos endpoint вызван без X-Remote-User.',
    );

    throw createError({
      statusCode: 401,

      statusMessage:
        'Kerberos authentication required',

      message:
        'Не удалось определить пользователя Kerberos.',
    });
  }


  logger.info(
    `Kerberos подтвердил пользователя: ${remoteUser}`,
  );


  /**
   * ----------------------------------------------------------
   * 2. Получаем нормализованный профиль из Active Directory
   * ----------------------------------------------------------
   *
   * Нормализация login, objectGUID и других полей
   * выполняется внутри ad-directory.service.ts.
   */
  let directoryUser;


  try {
    directoryUser =
      await findDomainUser(
        remoteUser,
        event,
      );
  }
  catch (error: any) {
    logger.error(
      `Ошибка получения DOMAIN-пользователя ${remoteUser}: ` +
      `${error?.message || String(error)}`,
    );


    /**
     * Если service уже сформировал осмысленную H3-ошибку,
     * не затираем её.
     */
    if (error?.statusCode) {
      throw error;
    }


    throw createError({
      statusCode: 503,

      statusMessage:
        'Active Directory unavailable',

      message:
        'Не удалось получить данные пользователя из Active Directory.',
    });
  }


  /**
   * ----------------------------------------------------------
   * 3. Пользователь Kerberos не найден в AD
   * ----------------------------------------------------------
   */
  if (!directoryUser) {
    logger.warn(
      `Kerberos-пользователь ${remoteUser} не найден в Active Directory.`,
    );


    throw createError({
      statusCode: 403,

      statusMessage:
        'User not found',

      message:
        'Пользователь не найден в Active Directory.',
    });
  }


  /**
   * ----------------------------------------------------------
   * 4. Создаём / синхронизируем локального app_users
   * ----------------------------------------------------------
   *
   * Первый вход:
   *
   * AD
   *  ↓
   * CREATE app_users
   *
   * Следующие входы:
   *
   * AD
   *  ↓
   * UPDATE только AD-полей
   *
   * status / departmentId / permissions здесь не меняются.
   */
  const appUser =
    await ensureDomainUser(
      directoryUser,
    );


  /**
   * ----------------------------------------------------------
   * 5. Проверяем возможность входа
   * ----------------------------------------------------------
   *
   * Здесь проверяем:
   *
   * - accountDisabled в AD;
   * - ACTIVE / BLOCKED / DISABLED в Space.
   */
  assertDomainUserCanLogin(
    directoryUser,
    appUser,
  );


  /**
   * ----------------------------------------------------------
   * 6. Формируем пользователя для Nuxt session
   * ----------------------------------------------------------
   *
   * ВАЖНО:
   *
   * id — теперь это реальный app_users.id.
   *
   * Именно его позднее будет использовать
   * requirePermission().
   *
   * username/name/department/title пока сохраняем
   * для совместимости со старым frontend.
   */
  const user = {
  id:
    appUser.id,

  login:
    appUser.login ||
    directoryUser.login,

  fullName:
    appUser.fullName ||
    directoryUser.fullName,

  email:
    appUser.email ??
    undefined,

  authType:
    'DOMAIN' as const,

  authMethod:
    'KERBEROS' as const,

  username:
    appUser.login ||
    directoryUser.login,

  name:
    appUser.fullName ||
    directoryUser.fullName ||
    directoryUser.login,

  department:
    directoryUser.department ??
    undefined,

  title:
    appUser.position ??
    directoryUser.position ??
    undefined,
};


  /**
   * ----------------------------------------------------------
   * 7. Создаём Nuxt session
   * ----------------------------------------------------------
   */
  await setUserSession(
    event,
    {
      user,

      loggedInAt:
        new Date()
          .toISOString(),
    },
  );


  /**
   * Делаем пользователя доступным текущему request.
   */
  event.context.user =
    user;


  logger.info(
    `Kerberos-авторизация завершена успешно: ` +
    `${user.login}, appUserId=${appUser.id}`,
  );


  /**
   * ----------------------------------------------------------
   * 8. Ответ login.vue
   * ----------------------------------------------------------
   */
  return {
    success: true,

    user,
  };
});