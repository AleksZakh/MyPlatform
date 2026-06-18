export default defineEventHandler((event) => {
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
    event.context.user.username = remoteUser.split('@')[0]
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
