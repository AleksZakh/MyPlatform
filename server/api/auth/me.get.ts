export default defineEventHandler(async (event) => {
  // Достаем токен из куки
  console.log('Получаем токен из куки на сервере...')
  const token = getCookie(event, 'user_data')

  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthenticated' });
    // return { user: { id: 2, name: 'Ivan' } } // Возвращаем данные пользователя
  }

  try {
    // Здесь обычно идет проверка JWT или поиск сессии в базе через Prisma
    // const user = await prisma.user.findFirst({ where: { sessions: { contains: token } } })
    
    return { user: { id: 1, name: 'Ivan' } } // Возвращаем данные пользователя
  } catch (e) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid token' })
  }
})