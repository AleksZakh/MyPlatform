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

  function getShortName(displayName: string | undefined): string {
    if (!displayName) return '';
    
    // Очищаем от лишних пробелов и разделяем на слова
    const parts = displayName.trim().split(/\s+/);
    
    // Если в поле только одно слово (например, просто Фамилия), возвращаем как есть
    if (parts.length === 1) return parts[0] ?? '';
    
    const lastName = parts[0]; // Фамилия
    const firstNameInit = parts[1] ? `${parts[1][0]}.` : ''; // И.
    const middleNameInit = parts[2] ? `${parts[2][0]}.` : ''; // И.
    
    return `${lastName} ${firstNameInit}${middleNameInit}`.trim();
  }

  return new Promise((resolve, reject) => {
    const searchOptions = {
      filter: searchFilter,
      scope: (query.scope as string) || 'sub',
      sizeLimit: parseInt(query.limit as string) || 100,
      // attributes: ['*'], // Все атрибуты
      attributes: ['displayName', 'mail', 'department', 'title', 'sAMAccountName'], 
    };

    ad.find(searchOptions as any, (err, results) => {
      if (err) {
        const error = err as any;
        console.error('Ошибка поиска:', error.message);
        reject({ success: false, error: error.message });
      } else {
        const rawUsers = results?.users || [];

        // Маппим пользователей, добавляя новое поле shortName
        const formattedUsers = rawUsers.map((user: any) => ({
          sAMAccountName: user.sAMAccountName,
          displayName: user.displayName,
          shortName: getShortName(user.displayName), // "Иванов И.И."
          mail: user.mail,
          department: user.department,
          title: user.title,
        }));
        console.log(`Найдено объектов: ${results?.users?.length || 0}`);
        // console.log('Пример первого объекта:', results?.users?.[0]); // Вывод в консоль сервера

        resolve({
          success: true,
          count: formattedUsers.length,
          results: {
            users: formattedUsers // Возвращаем уже отформатированный массив
          },
        });
      }
    });
  });
});
