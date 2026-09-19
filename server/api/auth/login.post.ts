// server/api/auth/login.post.ts

import { logger } from '../../utils/logger';

import {
  authenticateDomainUser,
  findDomainUser,
} from '../../services/ad-directory.service';

import {
  ensureDomainUser,
  assertDomainUserCanLogin,
} from '../../services/domain-user.service';


interface LoginBody {
  login?: string;
  password?: string;
  sessionId?: string;
}


/**
 * ============================================================
 * POST /api/auth/login
 * ============================================================
 *
 * Ручная DOMAIN-авторизация:
 *
 * login/password
 *      ↓
 * Active Directory
 *      ↓
 * app_users
 *      ↓
 * Nuxt session
 *
 * Kerberos здесь НЕ используется.
 */
export default defineEventHandler(async (event) => {

  /**
   * ----------------------------------------------------------
   * 1. Получаем credentials
   * ----------------------------------------------------------
   */
  const body =
    await readBody<LoginBody>(
      event,
    );


  const rawLogin =
    body?.login?.trim() || '';

  /**
   * Пароль намеренно НЕ trim().
   *
   * Пробел может быть частью реального пароля.
   */
  const password =
    body?.password || '';

  const sessionId =
    body?.sessionId ||
    crypto.randomUUID();


  /**
   * Никогда не логируем body:
   * внутри находится пароль.
   */
  if (
    !rawLogin ||
    !password
  ) {
    throw createError({
      statusCode: 400,

      statusMessage:
        'Login and password required',

      message:
        'Введите логин и пароль.',
    });
  }


  if (
    rawLogin.length > 256 ||
    password.length > 1024
  ) {
    throw createError({
      statusCode: 400,

      statusMessage:
        'Invalid credentials format',
    });
  }


  /**
   * ----------------------------------------------------------
   * 2. Проверяем пароль непосредственно в AD
   * ----------------------------------------------------------
   */
  let authenticated:
    boolean;


  try {
    logger.info(
      `Попытка DOMAIN password-авторизации пользователя ${rawLogin}`,
    );


    authenticated =
      await authenticateDomainUser(
        rawLogin,
        password,
        event,
      );
  }
  catch (error: any) {
    logger.error(
      `Ошибка Active Directory при авторизации ${rawLogin}: ` +
      `${error?.message || String(error)}`,
    );


    /**
     * LDAP/network error не выдаём за
     * неправильный пароль.
     */
    throw createError({
      statusCode: 503,

      statusMessage:
        'Active Directory unavailable',

      message:
        'Служба авторизации временно недоступна.',
    });
  }


  /**
   * Неверный login/password.
   */
  if (!authenticated) {
    logger.warn(
      `Неудачная DOMAIN password-авторизация: ${rawLogin}`,
    );


    throw createError({
      statusCode: 401,

      statusMessage:
        'Invalid credentials',

      message:
        'Неверный логин или пароль.',
    });
  }


  /**
   * ----------------------------------------------------------
   * 3. Получаем нормализованный профиль пользователя из AD
   * ----------------------------------------------------------
   */
  let directoryUser;


  try {
    directoryUser =
      await findDomainUser(
        rawLogin,
        event,
      );
  }
  catch (error: any) {
    logger.error(
      `Ошибка получения DOMAIN-профиля ${rawLogin}: ` +
      `${error?.message || String(error)}`,
    );


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


  if (!directoryUser) {
    logger.warn(
      `Пользователь ${rawLogin} успешно прошёл authentication, ` +
      'но не найден при чтении профиля AD.',
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
   * 4. Получаем локального пользователя Space
   * ----------------------------------------------------------
   *
   * Если DOMAIN-пользователь уже заходил через Kerberos,
   * здесь будет найдена ТА ЖЕ запись app_users
   * по directoryObjectId.
   */
  const appUser =
    await ensureDomainUser(
      directoryUser,
    );


  /**
   * ----------------------------------------------------------
   * 5. Проверяем статус учётной записи
   * ----------------------------------------------------------
   */
  assertDomainUserCanLogin(
    directoryUser,
    appUser,
  );


  /**
   * ----------------------------------------------------------
   * 6. Формируем session user
   * ----------------------------------------------------------
   *
   * Структура максимально совпадает
   * с kerberos.post.ts.
   *
   * Разница только:
   *
   * authMethod = AD_PASSWORD
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
      'AD_PASSWORD' as const,


    /**
     * Compatibility fields для старого frontend.
     */
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

    sessionId,
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


  event.context.user =
    user;


  logger.info(
    `DOMAIN password-авторизация завершена успешно: ` +
    `${user.login}, appUserId=${appUser.id}`,
  );


  /**
   * ----------------------------------------------------------
   * 8. Ответ frontend
   * ----------------------------------------------------------
   */
  return {
    success: true,

    user,
  };
});