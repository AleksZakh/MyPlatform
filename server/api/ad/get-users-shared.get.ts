// server/api/ad/get-users-shared.get.ts
import ActiveDirectory from 'activedirectory2';
import { adCache } from '../../utils/adCache';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const forceRefresh = query.refresh === 'true';

  // Проверяем кэш
  const cached = await adCache.get();
  const isExpired = await adCache.isExpired();

  if (!forceRefresh && cached && !isExpired) {
    console.log('[КЭШ] Возвращаем общие кэшированные данные AD');
    return {
      success: true,
      users: cached.users,
      count: cached.totalCount,
      fromCache: true,
      lastUpdated: cached.lastUpdated,
    };
  }

  console.log('[AD] Загрузка свежих данных из Active Directory...');

  const config = useRuntimeConfig(event);

  const adConfig = {
    url: config.ad.url,
    baseDN: config.ad.baseDN,
    username: config.ad.username,
    password: config.ad.password,
    timeout: config.ad.timeout,
  };

  const ad = new ActiveDirectory(adConfig);

  return new Promise((resolve, reject) => {
    const searchOptions = {
      filter: '(objectClass=user)',
      scope: 'sub',
      sizeLimit: 2000,
      timeLimit: 60,
      attributes: [],
      includeMembership: [],
      includeDeleted: false,
      includeDerivedMembership: [],
    };

    ad.findUsers(searchOptions as any, async (err, users) => {
      if (err) {
        const error = err as any;
        console.error('[AD] Ошибка:', error.message);
        reject({ success: false, error: error.message });
      } else {
        // Фильтруем пустые записи и нормализуем данные
        const validUsers = (users || []).filter(
          (user: any) => user && (user.sAMAccountName || user.cn)
        );

        // Сохраняем в общий кэш
        await adCache.set(validUsers);

        console.log(`[AD] Загружено ${validUsers.length} пользователей`);

        resolve({
          success: true,
          users: validUsers,
          count: validUsers.length,
          fromCache: false,
          lastUpdated: new Date().toISOString(),
        });
      }
    });
  });
});
