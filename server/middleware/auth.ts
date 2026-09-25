// server/middleware/auth.ts

import { logger } from '../utils/logger';

/**
 * Серверный middleware авторизации.
 *
 * Его задача:
 *
 * 1. Пропустить публичные страницы и auth-endpoints.
 * 2. Проверить существующую Nuxt user session.
 * 3. Для неавторизованного API вернуть HTTP 401.
 * 4. Для неавторизованной страницы перенаправить на:
 *
 *      /login?redirect=<исходный URL>
 *
 *
 * ВАЖНО:
 *
 * Kerberos-аутентификация здесь НЕ выполняется.
 *
 * Kerberos работает только через:
 *
 *      POST /api/auth/kerberos
 *
 * Этот endpoint защищён auth_gss непосредственно в nginx.
 *
 * Обычная авторизация работает через:
 *
 *      POST /api/auth/login
 *
 * Оба endpoint после успешного входа должны вызывать
 * setUserSession().
 */
export default defineEventHandler(async (event) => {
  const url = getRequestURL(event);
  const path = url.pathname;

  /**
   * ============================================================
   * 1. ПУБЛИЧНЫЕ ROUTES
   * ============================================================
   *
   * Эти запросы должны работать даже без пользовательской session.
   */


  const isPublicApi = path.startsWith('/api/public/');

  const isLoginPage =
    path === '/login' ||
    path.startsWith('/login/');

  /**
   * Обычная авторизация по login/password.
   */
  const isPasswordLogin =
    path === '/api/auth/login' ||
    path.startsWith('/api/auth/login/');

  /**
   * Kerberos endpoint.
   *
   * В Nitro мы его пропускаем без session,
   * но на уровне nginx именно этот URL защищён auth_gss.
   *
   * Поэтому фактически он НЕ является публичным с точки зрения сети.
   */
  const isKerberosLogin =
    path === '/api/auth/kerberos' ||
    path.startsWith('/api/auth/kerberos/');

  const isDevTestEmail =
    path === '/api/dev/test-email' ||
    path.startsWith('/api/dev/test-email/');

  const isFileUpload =
    path === '/api/lab/sampling-test' ||
    path.startsWith('/api/lab/sampling-test/');

  const isDevRefreshAdCache =
  process.env.NODE_ENV ===
    'development' &&
  path ===
    '/api/dev/refresh-ad-cache';


  /**
   * Регистрация и подтверждение email.
   *
   * Эти endpoint'ы должны быть доступны без session,
   * чтобы пользователь мог зарегистрироваться и подтвердить email.
   * После подтверждения email пользователь может войти в систему.
   */
  const isRegistration =
  path === '/api/auth/register-request' ||
  path.startsWith(
    '/api/auth/verify-email',
  ) ||
  path.startsWith(
    '/api/auth/activate-account',
  );

  const isActivateAccountPage =
  path === '/activate-account';

  const isVerifyEmailPage =
  path === '/verify-email';

  const isExternalLogin =
  path === '/api/auth/external-login';

  

  /**
   * Служебные endpoint'ы nuxt-auth-utils.
   *
   * В частности useUserSession().fetch() должен иметь возможность
   * проверить session даже тогда, когда пользователя ещё нет.
   */
  const isNuxtAuthUtils =
    path === '/api/_auth/session' ||
    path.startsWith('/api/_auth/');

  /**
   * Ресурсы Nuxt.
   *
   * Значительная часть этих URL обычно обрабатывается nginx раньше,
   * но оставляем исключение и здесь.
   */
  const isNuxtAsset =
  path.startsWith('/_nuxt/') ||
  path.startsWith('/_nuxt_icon/') ||
  path.startsWith('/api/_nuxt_icon/') ||
  path.startsWith('/_ipx/');

  /**
   * Общие публичные файлы.
   */
  const isPublicFile =
    path === '/favicon.ico' ||
    path === '/robots.txt' ||
    path === '/apple-touch-icon.png';

  const isPublicRoute =
    isLoginPage ||
    isPasswordLogin ||
    isKerberosLogin ||
    isPublicApi ||
    isRegistration ||
    isNuxtAuthUtils ||
    isNuxtAsset ||
    isPublicFile ||
    isDevTestEmail ||
    isFileUpload ||
    isActivateAccountPage ||
    isExternalLogin ||
    isDevRefreshAdCache ||
    isVerifyEmailPage
    ;
// console.log('[AUTH MIDDLEWARE]', {
//   path,
//   isVerifyEmailPage,
//   isActivateAccountPage,
//   isPublicRoute,
// });
  if (isPublicRoute) {
    return;
  }


  /**
   * ============================================================
   * 2. ПРОВЕРЯЕМ СУЩЕСТВУЮЩУЮ USER SESSION
   * ============================================================
   */

  try {
    const session = await getUserSession(event);

    /**
     * Авторизованный пользователь.
     */
    if (session?.user) {
      event.context.user = session.user;

      return;
    }
  }
  catch (error) {
    /**
     * Ошибка чтения session не должна приводить
     * к автоматическому доступу пользователя.
     *
     * Считаем такую session недействительной.
     */

    logger.error(
      'Ошибка чтения пользовательской session',
      error,
    );
  }


  /**
   * ============================================================
   * 3. ПОЛЬЗОВАТЕЛЬ НЕ АВТОРИЗОВАН
   * ============================================================
   */

  event.context.user = null;


  /**
   * ============================================================
   * 4. API REQUEST
   * ============================================================
   *
   * API никогда не перенаправляем на HTML-страницу /login.
   *
   * Клиент должен получить нормальный HTTP 401.
   */

  if (path.startsWith('/api/')) {
    logger.info(
      `Неавторизованный API-запрос: ${path}`,
    );

    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication required',
      message: 'Для выполнения запроса необходимо авторизоваться.',
    });
  }


  /**
   * ============================================================
   * 5. ОБЫЧНАЯ СТРАНИЦА
   * ============================================================
   *
   * Пользователь попытался открыть защищённую страницу,
   * но session отсутствует.
   *
   * Сохраняем страницу назначения:
   *
   * /documents/123?tab=files
   *
   * ->
   *
   * /login?redirect=%2Fdocuments%2F123%3Ftab%3Dfiles
   */

  const originalUrl = `${path}${url.search}`;

  const loginUrl =
    `/login?redirect=${encodeURIComponent(originalUrl)}`;


  logger.info(
    `Неавторизованный запрос: ${originalUrl}. ` +
    `Перенаправление: ${loginUrl}`,
  );


  /**
   * 302 здесь подходит, поскольку речь идёт
   * об обычном GET-запросе страницы.
   */
  return sendRedirect(
    event,
    loginUrl,
    302,
  );
});