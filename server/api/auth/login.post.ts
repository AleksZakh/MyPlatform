// server/api/auth/login.post.ts

import ActiveDirectory from 'activedirectory2';
import { logger } from '../../utils/logger';


interface LoginBody {
  login?: string;
  password?: string;
  sessionId?: string;
}


interface ADUser {
  sAMAccountName?: string;
  userPrincipalName?: string;
  cn?: string;
  displayName?: string;
  givenName?: string;
  sn?: string;
  mail?: string;
  department?: string;
  title?: string;
}


/**
 * Получаем обычный sAMAccountName.
 *
 * Поддерживаем:
 *
 * ibanov_II
 * ibanov_II@corp.avtodor-eng.ru
 * CORP\ibanov_II
 */
function normalizeLogin(value: string): string {
  let login = value.trim();

  if (login.includes('\\')) {
    const parts = login.split('\\');
    login = parts[parts.length - 1] || '';
  }

  if (login.includes('@')) {
    login = login.split('@')[0] || '';
  }

  return login.trim();
}


/**
 * Получаем DNS-домен из baseDN.
 *
 * Например:
 *
 * DC=corp,DC=avtodor-eng,DC=ru
 *
 * ->
 *
 * corp.avtodor-eng.ru
 */
function domainFromBaseDN(baseDN: string): string {
  return baseDN
    .split(',')
    .map((part) => part.trim())
    .filter((part) => /^DC=/i.test(part))
    .map((part) => part.replace(/^DC=/i, ''))
    .filter(Boolean)
    .join('.');
}


/**
 * Проверяем login/password непосредственно в Active Directory.
 */
function authenticateUser(
  ad: ActiveDirectory,
  username: string,
  password: string,
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    ad.authenticate(
      username,
      password,

      (error: any, authenticated: boolean) => {
        if (error) {
          /**
           * LDAP error 49 = invalid credentials.
           *
           * В зависимости от ldapjs/activedirectory2
           * ошибка может приходить немного по-разному.
           */
          const invalidCredentials =
            error?.code === 49 ||
            error?.name === 'InvalidCredentialsError' ||
            String(error?.message || '')
              .toLowerCase()
              .includes('invalid credentials');

          if (invalidCredentials) {
            resolve(false);
            return;
          }

          reject(error);
          return;
        }

        resolve(Boolean(authenticated));
      },
    );
  });
}


/**
 * Получаем данные пользователя из AD после успешной
 * проверки пароля.
 */
function findUser(
  ad: ActiveDirectory,
  username: string,
): Promise<ADUser | null> {
  return new Promise((resolve, reject) => {
    ad.findUser(
      username,

      (error: any, user: ADUser | undefined) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(user || null);
      },
    );
  });
}


/**
 * ============================================================
 * POST /api/auth/login
 * ============================================================
 *
 * Ручная авторизация пользователя по доменному
 * login/password.
 *
 * Kerberos здесь НЕ используется.
 */
export default defineEventHandler(async (event) => {

  /**
   * ----------------------------------------------------------
   * 1. Получаем login/password
   * ----------------------------------------------------------
   */

  const body =
    await readBody<LoginBody>(event);


  const rawLogin =
    body?.login?.trim() || '';

  const password =
    body?.password || '';

  const sessionId =
    body?.sessionId || crypto.randomUUID();


  /**
   * Никогда не логируем body целиком,
   * потому что там находится пароль.
   */

  if (!rawLogin || !password) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Login and password required',
      message: 'Введите логин и пароль.',
    });
  }


  /**
   * Дополнительная базовая защита от явно некорректных данных.
   */

  if (
    rawLogin.length > 256 ||
    password.length > 1024
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid credentials format',
    });
  }


  const login =
    normalizeLogin(rawLogin);


  if (!login) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid login',
      message: 'Некорректный логин.',
    });
  }


  /**
   * ----------------------------------------------------------
   * 2. Конфигурация Active Directory
   * ----------------------------------------------------------
   */

  const config =
    useRuntimeConfig(event);


  if (
    !config.ad?.url ||
    !config.ad?.baseDN ||
    !config.ad?.username ||
    !config.ad?.password
  ) {
    logger.error(
      'Не заполнена конфигурация Active Directory.',
    );

    throw createError({
      statusCode: 500,
      statusMessage:
        'Active Directory configuration error',
    });
  }


  const baseDN =
    String(config.ad.baseDN);


  /**
   * Предпочтительный вариант:
   *
   * runtimeConfig.ad.userPrincipalSuffix
   *
   * Например:
   *
   * corp.avtodor-eng.ru
   *
   * Если параметра пока нет, пробуем получить его
   * из baseDN.
   */

  const configuredSuffix =
    (config.ad as { userPrincipalSuffix?: string })
      .userPrincipalSuffix
      ? String(
        (config.ad as { userPrincipalSuffix?: string })
          .userPrincipalSuffix,
      )
      : '';


  const domain =
    configuredSuffix ||
    domainFromBaseDN(baseDN);


  if (!domain) {
    logger.error(
      'Не удалось определить UPN suffix Active Directory.',
    );

    throw createError({
      statusCode: 500,
      statusMessage:
        'Active Directory domain configuration error',
    });
  }


  /**
   * Если пользователь написал:
   *
   * user@domain
   *
   * или:
   *
   * DOMAIN\user
   *
   * используем введённое значение.
   *
   * Если только:
   *
   * ibanov_II
   *
   * превращаем в:
   *
   * ibanov_II@corp.avtodor-eng.ru
   */

  const bindUsername =
    rawLogin.includes('@') ||
    rawLogin.includes('\\')
      ? rawLogin
      : `${login}@${domain}`;


  /**
   * ----------------------------------------------------------
   * 3. Создаём AD client
   * ----------------------------------------------------------
   *
   * Техническая учётка используется для поиска пользователя
   * и получения его дополнительных атрибутов.
   */

  const ad =
    new ActiveDirectory({
      url:
        String(config.ad.url),

      baseDN,

      username:
        String(config.ad.username),

      password:
        String(config.ad.password),

      attributes: {
        user: [
          'dn',
          'distinguishedName',
          'userPrincipalName',
          'sAMAccountName',
          'cn',
          'displayName',
          'givenName',
          'sn',
          'mail',
          'department',
          'title',
        ] as any,

        group: [
          'dn',
          'cn',
          'description',
          'distinguishedName',
          'objectCategory',
        ],
      },
    });


  /**
   * ----------------------------------------------------------
   * 4. Проверяем пароль пользователя
   * ----------------------------------------------------------
   */

  let authenticated = false;


  try {
    logger.info(
      `Попытка password-авторизации пользователя ${login}`,
    );


    authenticated =
      await authenticateUser(
        ad,
        bindUsername,
        password,
      );
  }
  catch (error: any) {
    /**
     * Ошибка соединения с AD != неправильный пароль.
     */

    logger.error(
      `Ошибка Active Directory при авторизации ${login}: ` +
      `${error?.message || String(error)}`,
    );


    throw createError({
      statusCode: 503,
      statusMessage:
        'Active Directory unavailable',
      message:
        'Служба авторизации временно недоступна.',
    });
  }


  /**
   * Пароль неправильный.
   */

  if (!authenticated) {
    logger.warn(
      `Неудачная попытка авторизации пользователя ${login}`,
    );


    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid credentials',
      message:
        'Неверный логин или пароль.',
    });
  }


  /**
   * ----------------------------------------------------------
   * 5. Пароль правильный.
   *
   * Получаем профиль пользователя.
   * ----------------------------------------------------------
   */

  let adUser: ADUser | null;


  try {
    adUser =
      await findUser(
        ad,
        login,
      );
  }
  catch (error: any) {
    logger.error(
      `Ошибка получения профиля AD ${login}: ` +
      `${error?.message || String(error)}`,
    );


    throw createError({
      statusCode: 503,
      statusMessage:
        'Active Directory unavailable',
      message:
        'Не удалось получить данные пользователя.',
    });
  }


  if (!adUser) {
    logger.warn(
      `Авторизованный пользователь ${login} не найден при поиске в AD.`,
    );


    throw createError({
      statusCode: 403,
      statusMessage: 'User not found',
      message:
        'Пользователь не найден в Active Directory.',
    });
  }


  /**
   * ----------------------------------------------------------
   * 6. Формируем пользователя приложения
   * ----------------------------------------------------------
   *
   * Структура специально совпадает с той,
   * которую мы используем в kerberos.post.ts.
   */

  const username =
    adUser.sAMAccountName?.trim() ||
    login;


  const user = {
    login:
      username,

    username:
      username,

    name:
      adUser.cn ||
      adUser.displayName ||
      `${adUser.givenName || ''} ${adUser.sn || ''}`.trim() ||
      username,

    department:
      adUser.department || null,

    email:
      adUser.mail || null,

    title:
      adUser.title || null,

    /**
     * Отличается только способ авторизации.
     */
    authType:
      'Password',

    sessionId,
  };


  /**
   * ----------------------------------------------------------
   * 7. Создаём nuxt-auth-utils session
   * ----------------------------------------------------------
   */

  await setUserSession(event, {
    user,

    loggedInAt:
      new Date().toISOString(),
  });


  event.context.user =
    user;


  logger.info(
    `Пользователь ${username} успешно авторизован по login/password.`,
  );


  /**
   * ----------------------------------------------------------
   * 8. Отвечаем login.vue
   * ----------------------------------------------------------
   */

  return {
    success: true,

    user,
  };
});