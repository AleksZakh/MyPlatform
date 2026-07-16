import ActiveDirectory from 'activedirectory2';
import { logger } from '../utils/logger';

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
    // @ts-ignore
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
        // @ts-ignore
        login: fullUserData.sAMAccountName,
        // @ts-ignore
        name: fullUserData.cn || `${fullUserData.givenName} ${fullUserData.sn}`.trim(),
        // @ts-ignore
        email: fullUserData.mail || null,
        // @ts-ignore
        department: fullUserData.department || null,
        // @ts-ignore
        title: fullUserData.title || null // Добавили должность, так как она есть в вашем списке attributes
      }

      resolve(userInfo)
    })
  })
}

export default defineEventHandler(async (event) => {
  // 1. Пропускаем эндпоинты авторизации (если они есть)
  if (event.path.startsWith('/login') || event.path.startsWith('/api/auth/login')) {
    return
  }

  // 2. Проверяем, существует ли уже валидная сессия куки
  const session = await getUserSession(event)
  
  if (session.user) {
    // Сессия есть! Перекладываем данные в контекст запроса, чтобы они были доступны в приложении
    event.context.user = session.user
    return 
  }

  // 3. Сессии нет. Проверяем заголовок от Nginx (доменный ПК)
  const xUser = getHeader(event, 'x-remote-user') || getHeader(event, 'remote-user');

  if (!xUser) {
    // Нет ни сессии, ни заголовка — значит это недоменный ПК (гость)
    logger.info('Входящий запрос без заголовка x-remote-user. Перенаправление на гостя.')
    event.context.user = null
    return
  }

  const [username] = xUser.split('@')
  if (!username) return

  const config = useRuntimeConfig(event)
  const adConfig = {
    url: config.ad.url,
    baseDN: config.ad.baseDN,
    username: config.ad.username,
    password: config.ad.password,
  }

  // 4. Запрашиваем данные из AD через нашу функцию на activedirectory2
  logger.debug(`Попытка обогатить данные для пользователя: ${username}`);
  const adUser = await getUserFromAD(username, adConfig);
  let finalUser: any = null

  if (adUser) {
    // Данные успешно получены
    logger.info(`Пользователь ${username} успешно авторизован. Отдел: ${adUser.department}`);
    finalUser = {
      username: adUser.login,
      name: adUser.name,
      department: adUser.department,
      email: adUser.email || xUser,
      title: adUser.title
    }
    
  } else {
    // Fallback: В AD произошел сбой, но Nginx пользователя пустил
    finalUser = { username: username, fallback: true }
  }

  // 5.Записываем данные в зашифрованную сессию nuxt-auth-utils
  // и автоматически создаём защищенную Cookie у пользователя в браузере
  await setUserSession(event, {
    user: finalUser,
    loggedInAt: new Date().toISOString()
  })
  // Также дублируем в контекст текущего запроса
  event.context.user = finalUser
})
