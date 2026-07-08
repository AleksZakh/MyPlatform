export default defineEventHandler((event) => {
  const url = getRequestURL(event)
  // 1. БЕЛОЙ СПИСОК: Пропускаем технические запросы, иконки и статику без проверок
  const isInternal = url.pathname.startsWith('/api/_nuxt_icon/') || url.pathname.startsWith('/_nuxt/') || url.pathname.includes('favicon.ico')

  if (isInternal) {
    // Выставляем системный флаг аутентификации, чтобы эндпоинт иконки отдал её успешно
    event.context.user = {
      username: 'system_internal',
      domain: 'local',
      authenticated: true
    }
    return // Выходим из middleware, не мучая запрос проверками Kerberos
  }

   // 2. ИГНОРИРУЕМ ЗАПРОСЫ К СТРАНИЦАМ (SSR): Проверяем только реальное API данных
  // (Опционально, если авторизация нужна только на уровне /api/data/...)
  // if (!url.pathname.startsWith('/api/')) return

  // Отлавливаем только самый первый запрос к главной странице (или страницам SSR)
  // Игнорируем запросы к API, чтобы не засорять консоль
  // if (url.pathname === '/' || !url.pathname.startsWith('/api/')) {
    
  //   // Получаем объект со всеми заголовками в формате { имя: значение }
  //   const allHeaders = getHeaders(event)
    
  //   console.log('===================================================')
  //   console.log(`[DEBUG LOG] САМЫЙ ПЕРВЫЙ ЗАПРОС К СТРАНИЦЕ: ${url.pathname}`)
  //   console.log('===================================================')
  //   console.dir(allHeaders, { depth: null, colors: true })
  //   console.log('===================================================')
    
  // }

  const authHeader = getHeader(event, 'authorization')
  
  // Объект пользователя по умолчанию
  event.context.user = {
    username: null,
    domain: null,
    authenticated: false
  }

  // 1. Проверяем, передал ли Nginx данные через X-Remote-User
  let remoteUser = getHeader(event, 'x-remote-user') || getHeader(event, 'remote-user')

  if (remoteUser && typeof remoteUser === 'string') {
    // remoteUser имеет вид "Zakharov_AV@CORP.AVTODOR-ENG.RU"
    if (remoteUser.includes('@')) {
      const parts = remoteUser.split('@')
      
      event.context.user.username = parts[0]          // 'Zakharov_AV'
      event.context.user.domain   = parts[1]          // 'CORP.AVTODOR-ENG.RU'
    } else {
      // На случай, если Nginx передал только логин без домена
      event.context.user.username = remoteUser
      event.context.user.domain   = 'corp.avtodor-eng.ru' // Дефолтный домен компании
    }
    
    event.context.user.authenticated = true
  } 
  // 2. Если X-Remote-User пуст, достаем имя из встроенного фиктивного заголовка Nginx!
  else if (authHeader && authHeader.startsWith('Basic ')) {
    try {
      // Декодируем строку "emFraGFyb3ZfYXY6Ym9ndXNfYXV0aF9nc3NfcGFzc3dk"
      const base64Credentials = authHeader.substring(6)
      const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8')
      
      // Разделяем по двоеточию логин и фейковый пароль (login:bogus_auth_gss_passwd)
      const [username, password] = credentials.split(':')

      if (username && password === 'bogus_auth_gss_passwd') {
        event.context.user.username = username
        event.context.user.authenticated = true
      }
    } catch (err) {
      console.error('Ошибка декодирования заголовка Kerberos:', err)
    }
  }

  // Вывод в консоль для финальной проверки разработчиком
  console.log('РЕЗУЛЬТАТ SSO В NUXT ===>', event.context.user)
})
