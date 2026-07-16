import ActiveDirectory from 'activedirectory2'

interface ADConfig {
  url: string
  baseDN: string
  username: string
  password: string
}

/**
 * Получает расширенные данные пользователя из Active Directory
 * @param sAMAccountName Логин пользователя (без домена)
 * @param config Настройки подключения к AD из Runtime Config
 */
function getUserFromAD(sAMAccountName: string, config: ADConfig): Promise<any> {
  return new Promise((resolve) => {
    // 1. Создаем экземпляр ActiveDirectory. 
    // Передаем техническую учетную запись прямо в конфигурацию.
    const ad = new ActiveDirectory({
      url: config.url,
      baseDN: config.baseDN,
      username: config.username,
      password: config.password
    })

    // 2. Формируем опции поиска по вашей схеме
    const searchOptions = {
      filter: `(&(objectClass=user)(sAMAccountName=${sAMAccountName}))`,
      scope: 'sub' as const,
      attributes: [
        'cn',
        'sn',
        'givenName',
        'mail',
        'sAMAccountName',
        'department',
        'title'
      ],
      // В activedirectory2 эти параметры управляют парсингом групп (если понадобятся)
      includeMembership: [], 
      includeDeleted: false,
      includeDerivedMembership: [],
    }

    // 3. Выполняем поиск пользователя
    ad.findUsers(searchOptions, (findErr, users) => {
      // Если произошла ошибка или пользователь не найден в домене
      if (findErr || !users || users.length === 0) {
        console.warn(
          `⚠️ Не удалось найти дополнительные данные в AD для ${sAMAccountName}.`
        )
        // Возвращаем null, чтобы вызывающий код (middleware) знал, 
        // что расширенных данных нет, и мог применить свой fallback/обработку
        return resolve(null)
      }

      // 4. Пользователь успешно найден. activedirectory2 уже распарсила 
      // LDAP-ответ в удобный плоский JavaScript-объект.
      const fullUserData = users[0]
      console.log(`📦 Данные пользователя ${sAMAccountName} успешно загружены из AD.`)

      // Формируем чистый объект с данными для приложения
      const userInfo = {
        login: fullUserData.sAMAccountName,
        name: fullUserData.cn || `${fullUserData.givenName} ${fullUserData.sn}`.trim(),
        email: fullUserData.mail || null,
        department: fullUserData.department || null,
        title: fullUserData.title || null // Добавили должность, так как она есть в вашем списке attributes
      }

      resolve(userInfo)
    })
  })
}
export default defineEventHandler(async (event) => {
  // Пропускаем роуты авторизации
  if (event.path.startsWith('/login') || event.path.startsWith('/api/auth/login')) {
    return
  }

  const xUser = getHeader(event, 'x-user')
  if (!xUser) {
    event.context.user = null
    return
  }

  const [username] = xUser.split('@')
  if (!username) return

  const config = useRuntimeConfig(event)
  const adConfig: ADConfig = {
    url: config.ad.url,
    baseDN: config.ad.baseDN,
    username: config.ad.username,
    password: config.ad.password,
  }

  // Вызываем обновленную функцию
  const adUser = await getUserFromAD(username, adConfig)

  if (!adUser) {
    // Сценарий FALLBACK: В AD данных нет, но Nginx пользователя пустил.
    // Создаем сессию с минимальными данными.
    const fallbackUser = { username: username }
    
    event.context.user = fallbackUser
    
    // Если вы используетеnuxt-auth-utils или сессии, можно вызвать запись сессии здесь:
    // await setUserSession(event, { user: fallbackUser, loggedInAt: new Date().toISOString() })
    return
  }

  // Сценарий УСПЕХ: Записываем в контекст Nuxt полностью обогащенный объект
  event.context.user = {
    username: adUser.login,
    name: adUser.name,
    department: adUser.department,
    email: adUser.email || xUser,
    title: adUser.title
    // Если позже понадобятся группы, достаточно будет добавить 'memberOf' в attributes схемы поиска
  }
})