// server/api/ad/search.get.ts
import ActiveDirectory from 'activedirectory2';

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  const query = getQuery(event);

  const searchFilter = (query.filter as string) || '(objectClass=*)';
  const searchBase = (query.baseDN as string) || config.ad.baseDN;

  const adConfig = {
    url: config.ad.url,
    baseDN: searchBase,
    username: config.ad.username,
    password: config.ad.password,
    timeout: config.ad.timeout,
  };

  const ad = new ActiveDirectory(adConfig);

  return new Promise((resolve, reject) => {
    const searchOptions = {
      filter: searchFilter,
      scope: (query.scope as string) || 'sub',
      sizeLimit: parseInt(query.limit as string) || 100,
      attributes: ['*'], // Все атрибуты
    };

    ad.find(searchOptions as any, (err, results) => {
      if (err) {
        const error = err as any;
        console.error('Ошибка поиска:', error.message);
        reject({ success: false, error: error.message });
      } else {
        console.log(`Найдено объектов: ${results?.users?.length || 0}`);
        console.log('Пример первого объекта:', results?.users?.[0]); // Вывод в консоль сервера

        resolve({
          success: true,
          count: results?.users?.length || 0,
          results: results || [],
        });
      }
    });
  });
});
