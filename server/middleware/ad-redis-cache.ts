// server/middleware/ad-redis-cache.ts
import { getUserGroups } from '../utils/ad'

// Подключаемся к настроенному в config хранилищу adCache
const redisStorage = useStorage('adCache')
const CACHE_TTL_SECONDS = 15 * 60 // 15 минут

export default defineEventHandler(async (event) => {
  // Игнорируем запросы к статике и внутренним механизмам Nuxt
  if (event.path.startsWith('/_nuxt') || event.path.startsWith('/__')) return

  // Получаем имя пользователя из заголовка от обратного прокси (IIS / Nginx)
  const rawUser = getHeader(event, 'x-remote-user') || ''
  if (!rawUser) return

  const username = rawUser.split('\\')[1] || rawUser
  const cacheKey = `user:${username.toLowerCase()}:groups`

  let groups: string[] | null = null

  try {
    // 1. Пытаемся получить массив групп из Redis
    groups = await redisStorage.getItem<string[]>(cacheKey)

    if (!groups) {
      // 2. Если в Redis ничего нет, делаем один тяжелый запрос в Active Directory через LDAP
      groups = await getUserGroups(username)

      // 3. Записываем полученные группы в Redis со временем жизни (TTL)
      // Опция ttl передается третьим аргументом для автоматического удаления ключа из базы
      await redisStorage.setItem(cacheKey, groups, { ttl: CACHE_TTL_SECONDS })
    }
  } catch (error) {
    console.error(`[Cache/LDAP Error] Failed to process AD groups for ${username}:`, error)
    // В случае падения Redis или AD, инициализируем пустой массив, чтобы приложение не падало
    groups = groups || []
  }

  // 4. Помещаем данные в контекст запроса.
  // Они будут доступны в любом серверном API-маршруте (/server/api/...) через event.context.user
  event.context.user = {
    username,
    groups
  }
})
