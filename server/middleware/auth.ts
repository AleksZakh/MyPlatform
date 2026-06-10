export default defineEventHandler((event) => {
  // Извлекаем заголовок, добавленный Nginx
  const remoteUser = getHeader(event, 'x-remote-user')

  if (remoteUser) {
    // Имя пользователя обычно приходит в формате user@COMPANY.LOCAL или COMPANY\user
    const username = remoteUser.split('@')[0]

    // Сохраняем имя пользователя в контекст запроса
    event.context.user = {
      username: username,
      authenticated: true
    }
  } else {
    event.context.user = {
      username: null,
      authenticated: false
    }
  }
})