import ldap from 'ldapjs';

// 1. Интерфейс для типизации настроек (чтобы TS не ругался)
interface ADConfig {
  url: string;
  baseDN: string;
  username: string;
  password: string;
}

// 2. Переписанная функция: теперь она принимает конфиг вторым аргументом
function getUserFromAD(sAMAccountName: string, config: ADConfig): Promise<any> {
  return new Promise((resolve, reject) => {
    // Используем URL из переменных окружения
    const client = ldap.createClient({ url: config.url });

    // Аутентификация под технической учетной записью из .env
    client.bind(config.username, config.password, (err) => {
      if (err) return reject(err);

      const opts = {
        filter: `(sAMAccountName=${sAMAccountName})`,
        scope: 'sub' as const,
        attributes: ['cn', 'department', 'memberOf', 'mail'],
      };

      // Используем Base DN из переменных окружения
      client.search(config.baseDN, opts, (err, res) => {
        if (err) return reject(err);

        let userData: any = null;

        res.on('searchEntry', (entry) => {
          const pojo = entry.pojo;
          const attrs: Record<string, any> = {};

          for (const attr of pojo.attributes) {
            attrs[attr.type] =
              attr.values.length === 1 ? attr.values[0] : attr.values;
          }

          userData = {
            dn: pojo.objectName,
            ...attrs,
          };
        });

        res.on('error', (searchErr) => reject(searchErr));

        res.on('end', () => {
          client.unbind();
          resolve(userData);
        });
      });
    });
  });
}

// 3. Основной серверный middleware
export default defineEventHandler(async (event) => {
  if (event.path.startsWith('/login') || event.path.startsWith('/api/auth/login')) {
    return
  }

  const allHeaders = getHeaders(event);
  // console.log('allHeaders === ', allHeaders);
  const xUser = getHeader(event, 'x-remote-user') || getHeader(event, 'remote-user');

  if (!xUser) {
    event.context.user = null
    return
  }

  const username = xUser.split('@')[0] as string;
  if (!username) return

  // Получаем конфигурацию из Nuxt Runtime Config
  const config = useRuntimeConfig(event);
  const adConfig: ADConfig = {
    url: config.ad.url,
    baseDN: config.ad.baseDN,
    username: config.ad.username,
    password: config.ad.password,
  };

  try {
    // Передаем username и adConfig в функцию поиска
    const adData = await getUserFromAD(username, adConfig);

    if (!adData) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User not found in AD',
      });
    }

    // Записываем данные в контекст сервера
    event.context.user = {
      username: username,
      name: adData.cn,
      department: adData.department,
      groups: Array.isArray(adData.memberOf)
        ? adData.memberOf
        : [adData.memberOf].filter(Boolean),
      email: adData.mail || xUser,
    };
  } catch (error) {
    console.error('AD Fetch Error:', error);
  }
});
