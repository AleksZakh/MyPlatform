import { getDateTime } from '@@/utils/dateUtils';
import type { SessionUser, UserSession } from '@@/server/types/session'; // 👈 ИМПОРТ ТИПОВ

export default defineEventHandler(async (event) => {
  const url = getRequestURL(event);
  // 1. БЕЛОЙ СПИСОК: Пропускаем технические запросы, иконки и статику без проверок
  const isInternal =
    url.pathname.startsWith('/api/_nuxt_icon/') ||
    url.pathname.startsWith('/_nuxt/') ||
    url.pathname.includes('favicon.ico');

  if (isInternal) {
    // Выставляем системный флаг аутентификации, чтобы эндпоинт иконки отдал её успешно
    event.context.user = {
      user_: 'system_internal',
      domain: 'local',
      auth_: true,
      loggedInAt: getDateTime(),
    };
    return; // Выходим из middleware, не мучая запрос проверками Kerberos
  }

  //  2. ИГНОРИРУЕМ ЗАПРОСЫ К СТРАНИЦАМ (SSR): Проверяем только реальное API данных
  // (Опционально, если авторизация нужна только на уровне /api/data/...)
  if (!url.pathname.startsWith('/api/')) return;

  // Отлавливаем только самый первый запрос к главной странице (или страницам SSR)
  // Игнорируем запросы к API, чтобы не засорять консоль
  if (url.pathname === '/' || !url.pathname.startsWith('/api/')) {
    // Получаем объект со всеми заголовками в формате { имя: значение }
    const allHeaders = getHeaders(event);

    console.log('===================================================');
    console.log(`[DEBUG LOG] САМЫЙ ПЕРВЫЙ ЗАПРОС К СТРАНИЦЕ: ${url.pathname}`);
    console.log('===================================================');
    console.dir(allHeaders, { depth: null, colors: true });
    console.log('===================================================');
  }

  const authHeader = getHeader(event, 'authorization');

  // Объект пользователя по умолчанию
  event.context.user = {
    user_: null,
    domain: null,
    auth_: false,
    dateTime: getDateTime(),
  };
   // Сохраняем оригинальный URL для редиректа
  const originalUrl = url.pathname + url.search;

  // 1. Проверяем, передал ли Nginx данные через X-Remote-User
  let remoteUser =
    getHeader(event, 'x-remote-user') || getHeader(event, 'remote-user');

  if (remoteUser && typeof remoteUser === 'string') {
    const session = await getUserSession(event);

    if (remoteUser.includes('@')) {
      const parts = remoteUser.split('@');

      event.context.user.user_ = parts[0]; //
      event.context.user.domain = parts[1]; //
    } else {
      // На случай, если Nginx передал только логин без домена
      event.context.user.user_ = remoteUser;
      event.context.user.domain = 'corp.avtodor-eng.ru'; // Дефолтный домен компании
    }
    event.context.user.auth_ = true;
    event.context.dateTime = getDateTime();
    if (!session || !session.user) {
      if (authHeader && authHeader.startsWith('Basic ')) {
        const token = authHeader.slice(6);

        try {
          // Создаем сессию из токена
          const parts = event.context.user.user_.split('_');
          const userEmail = `${parts[1].charAt(0).toLowerCase()}.${parts[2].toLowerCase()}${event.context.user.domain.replace('corp', '@')}`;
          // ✅ СОЗДАЕМ СЕССИЮ С ПРАВИЛЬНЫМ ТИПОМ
          const userData: SessionUser = {
            sessionId: token,
            login: event.context.user.user_,
            email: userEmail,
            role: 'adUser',
            dateTime: event.context.dateTime,
            loggedIn: true, // 👈 ДОБАВЛЯЕМ
          };
          await setUserSession(event, {
            user: userData,
          });
          // ✅ ПОЛУЧАЕМ СЕССИЮ С ПРАВИЛЬНОЙ ТИПИЗАЦИЕЙ
          const newSession = await getUserSession(event) as unknown as UserSession;
          const loggedIn = newSession?.user?.loggedIn || false;
          
          console.log(`✅ Сессия создана для: ${event.context.user.user_}`);
          console.log(`🔑 Статус авторизации: ${loggedIn ? '✅ Вход выполнен' : '❌ Не авторизован'}`);
          
          // ✅ ПЕРЕНАПРАВЛЕНИЕ
          const query = getQuery(event);
          let redirectUrl = (query.redirect as string) || originalUrl || '/';
          
          if (redirectUrl.startsWith('http') && !redirectUrl.startsWith('http://localhost')) {
            redirectUrl = '/';
          }
          
          console.log(`🔄 Перенаправление пользователя ${event.context.user.user_} на: ${redirectUrl}`);
          
          if (!url.pathname.startsWith('/api/')) {
            return sendRedirect(event, redirectUrl, 302);
          }
        } catch (error) {
          // Токен невалидный - ничего не делаем
        }
      }
    }
  }
  // 2. Если X-Remote-User пуст, достаем имя из встроенного фиктивного заголовка Nginx!
  else if (authHeader && authHeader.startsWith('Basic ')) {
    console.log('Basic ', authHeader);
    try {
      // Декодируем строку "emFraGFyb3ZfYXY6Ym9ndXNfYXV0aF9nc3NfcGFzc3dk"
      const base64Credentials = authHeader.substring(6);
      const credentials = Buffer.from(base64Credentials, 'base64').toString(
        'utf-8'
      );

      // Разделяем по двоеточию логин и фейковый пароль (login:bogus_auth_gss_passwd)
      const [user_, password] = credentials.split(':');

      if (user_ && password === 'bogus_auth_gss_passwd') {
        event.context.user.user_ = user_;
        event.context.user.auth_ = true;
      }
    } catch (err) {
      console.error('Ошибка декодирования заголовка Kerberos:', err);
    }
  }

  // Вывод в консоль для финальной проверки разработчиком
  console.log('РЕЗУЛЬТАТ SSO В NUXT ===>', event.context.user);
});
