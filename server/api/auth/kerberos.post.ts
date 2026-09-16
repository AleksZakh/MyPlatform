// server/api/auth/kerberos.post.ts

import ActiveDirectory from 'activedirectory2';
import { logger } from '../../utils/logger';


/**
 * Данные пользователя, которые нас интересуют в Active Directory.
 */
interface ADUser {
  sAMAccountName?: string;
  cn?: string;
  displayName?: string;
  givenName?: string;
  sn?: string;
  mail?: string;
  department?: string;
  title?: string;
}


/**
 * Приводим Kerberos principal к обычному login.
 *
 * Возможные варианты:
 *
 *   ivanov@CORP.AVTODOR-ENG.RU
 *   CORP\ivanov
 *   ivanov
 *
 * Результат:
 *
 *   ivanov
 */
function normalizeKerberosLogin(remoteUser: string): string {
  let login = remoteUser.trim();

  /**
   * DOMAIN\username
   */
  if (login.includes('\\')) {
    const parts = login.split('\\');
    login = parts[parts.length - 1] || '';
  }

  /**
   * username@REALM
   */
  if (login.includes('@')) {
    login = login.split('@')[0] || '';
  }

  return login
    .trim()
    .toLowerCase();
}


/**
 * Получаем пользователя из Active Directory.
 *
 * ВАЖНО:
 * используем findUser(), а не собираем LDAP filter вручную.
 */
function getUserFromAD(
  username: string,
  config: {
    url: string;
    baseDN: string;
    username: string;
    password: string;
  },
): Promise<ADUser | null> {
  return new Promise((resolve, reject) => {
    /**
     * Указываем дополнительные атрибуты пользователя,
     * которые нужны приложению.
     */
    const ad = new ActiveDirectory({
      url: config.url,
      baseDN: config.baseDN,
      username: config.username,
      password: config.password,

      attributes: {
        user: [
          'cn',
          'displayName',
          'givenName',
          'sn',
          'mail',
          'sAMAccountName',
          'department',
          'title',
          'userPrincipalName',
        ],

        group: [
          'dn',
          'cn',
          'description',
          'distinguishedName',
          'objectCategory',
        ],
      } as any,
    });


    /**
     * findUser умеет искать в том числе по sAMAccountName.
     */
    ad.findUser(
      username,

      (
        error: any,
        user: ADUser | undefined,
      ) => {
        /**
         * Ошибка соединения / LDAP / AD.
         *
         * Это НЕ означает "пользователь не существует".
         * Поэтому ошибку передаём наверх отдельно.
         */
        if (error) {
          reject(error);
          return;
        }


        /**
         * Запрос к AD успешен,
         * но пользователь не найден.
         */
        if (!user) {
          resolve(null);
          return;
        }


        resolve(user);
      },
    );
  });
}


/**
 * ============================================================
 * POST /api/auth/kerberos
 * ============================================================
 *
 * Этот endpoint должен быть защищён nginx:
 *
 * location = /api/auth/kerberos {
 *     auth_gss on;
 *     ...
 *
 *     proxy_set_header X-Remote-User $remote_user;
 *     proxy_set_header Remote-User   $remote_user;
 *
 *     proxy_pass http://127.0.0.1:3000;
 * }
 *
 *
 * Поэтому endpoint НЕ проверяет пароль.
 *
 * Факт появления X-Remote-User означает, что nginx
 * уже выполнил Kerberos/SPNEGO-аутентификацию.
 */
export default defineEventHandler(async (event) => {
  /**
   * ------------------------------------------------------------
   * 1. Получаем пользователя, подтверждённого nginx/Kerberos
   * ------------------------------------------------------------
   */

  const remoteUser =
    getRequestHeader(event, 'x-remote-user') ||
    getRequestHeader(event, 'remote-user') ||
    getRequestHeader(event, 'x-forwarded-user');


  /**
   * В нормальной конфигурации сюда вообще не должны попасть
   * без Kerberos-заголовка:
   *
   * nginx должен остановить такой запрос раньше.
   */
  if (!remoteUser) {
    logger.warn(
      'Kerberos endpoint вызван без X-Remote-User.',
    );

    throw createError({
      statusCode: 401,
      statusMessage: 'Kerberos authentication required',
      message:
        'Не удалось определить пользователя Kerberos.',
    });
  }


  /**
   * ------------------------------------------------------------
   * 2. Нормализуем Kerberos principal
   * ------------------------------------------------------------
   */

  const login =
    normalizeKerberosLogin(remoteUser);


  if (!login) {
    logger.warn(
      `Получено некорректное имя Kerberos-пользователя: ${remoteUser}`,
    );

    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid Kerberos user',
      message:
        'Получено некорректное имя пользователя Kerberos.',
    });
  }


  logger.info(
    `Kerberos подтвердил пользователя: ${login}`,
  );


  /**
   * ------------------------------------------------------------
   * 3. Получаем конфигурацию Active Directory
   * ------------------------------------------------------------
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


  const adConfig = {
    url: String(config.ad.url),
    baseDN: String(config.ad.baseDN),
    username: String(config.ad.username),
    password: String(config.ad.password),
  };


  /**
   * ------------------------------------------------------------
   * 4. Получаем профиль пользователя из AD
   * ------------------------------------------------------------
   */

  let adUser: ADUser | null;


  try {
    logger.debug(
      `Получение данных пользователя ${login} из Active Directory.`,
    );


    adUser = await getUserFromAD(
      login,
      adConfig,
    );
  }
  catch (error: any) {
    /**
     * Очень важно:
     *
     * если AD недоступен, НЕ создаём fallback-session.
     *
     * Раньше ваш middleware делал:
     *
     * finalUser = {
     *     username,
     *     fallback: true
     * }
     *
     * Теперь такого поведения нет.
     */

    logger.error(
      `Ошибка обращения к Active Directory для ${login}: ` +
      `${error?.message || String(error)}`,
    );


    throw createError({
      statusCode: 503,
      statusMessage:
        'Active Directory unavailable',
      message:
        'Не удалось получить данные пользователя из Active Directory.',
    });
  }


  /**
   * ------------------------------------------------------------
   * 5. Kerberos пользователь есть, но в AD он не найден
   * ------------------------------------------------------------
   */

  if (!adUser) {
    logger.warn(
      `Kerberos-пользователь ${login} не найден в Active Directory.`,
    );


    throw createError({
      statusCode: 403,
      statusMessage: 'User not found',
      message:
        'Пользователь не найден в Active Directory.',
    });
  }


  /**
   * ------------------------------------------------------------
   * 6. Дополнительная проверка полученного пользователя
   * ------------------------------------------------------------
   */

  const adLogin =
    adUser.sAMAccountName
      ?.trim()
      .toLowerCase();


  if (!adLogin) {
    logger.error(
      `AD вернул пользователя ${login} без sAMAccountName.`,
    );


    throw createError({
      statusCode: 403,
      statusMessage:
        'Invalid Active Directory user',
    });
  }


  /**
   * ------------------------------------------------------------
   * 7. Формируем единую структуру пользователя приложения
   * ------------------------------------------------------------
   *
   * Я оставляю username для совместимости с вашим старым кодом
   * и добавляю login для новой схемы.
   */

  const user = {
    login: adLogin,

    username: adLogin,

    name:
      adUser.cn ||
      adUser.displayName ||
      `${adUser.givenName || ''} ${adUser.sn || ''}`.trim() ||
      adLogin,

    department:
      adUser.department || null,

    email:
      adUser.mail || null,

    title:
      adUser.title || null,

    authType:
      'Kerberos',
  };


  /**
   * ------------------------------------------------------------
   * 8. Создаём Nuxt session
   * ------------------------------------------------------------
   *
   * После этого Kerberos больше не нужен для каждого запроса.
   *
   * Пользователь работает так же, как пользователь,
   * вошедший по login/password:
   *
   * browser
   *    ↓
   * nuxt-session cookie
   *    ↓
   * server/middleware/auth.ts
   *    ↓
   * session.user
   */

  await setUserSession(event, {
    user,

    loggedInAt:
      new Date().toISOString(),
  });


  /**
   * Также помещаем пользователя в context
   * текущего запроса.
   */
  event.context.user = user;


  logger.info(
    `Kerberos-авторизация завершена успешно: ${user.username}`,
  );


  /**
   * ------------------------------------------------------------
   * 9. Ответ login.vue
   * ------------------------------------------------------------
   */

  return {
    success: true,

    user,
  };
});