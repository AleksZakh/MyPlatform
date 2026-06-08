// server/api/ad/get-users.get.ts
import ActiveDirectory from 'activedirectory2';

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  
  const adConfig = {
    url: config.ad.url,
    baseDN: config.ad.baseDN,
    username: config.ad.username,
    password: config.ad.password,
    timeout: config.ad.timeout
  };
  
  const ad = new ActiveDirectory(adConfig);
  
  return new Promise((resolve, reject) => {
    // ✅ Полный объект с поддержкой всех полей ReqProps
    const searchOptions = {
      filter: '(objectClass=user)',           // Только объекты пользователей
      scope: 'sub',                            // Поиск во всех подразделениях
      sizeLimit: 500,                          // Ограничиваем количество
      timeLimit: 30,                           // Таймаут в секундах
      attributes: [],
      // attributes: ['cn', 'sn', 'givenName', 'mail', 'sAMAccountName', 'department', 'telephoneNumber', 'title', 'l'],
      includeMembership: [],                   // Обязательное поле
      includeDeleted: false,                   // Обязательное поле
      includeDerivedMembership: []             // Обязательное поле
    };
    
    ad.findUsers(searchOptions as any, (err, users) => {
      if (err) {
        const error = err as any;
        console.error('Ошибка поиска:', error.message);
        reject({ success: false, error: error.message });
      } else {
        console.log(`Найдено пользователей: ${users?.length || 0}`);
        // Выводим содержимое в консоль
        // if (users && users.length > 0) {
          // console.log('=== СОДЕРЖИМОЕ AD (первые 5 пользователей) ===');
          // users.slice(0, 5).forEach((user: any, index: number) => {
            // console.log(`\n${index + 1}. ${user.cn || user.sAMAccountName || 'Unknown'}:`);
            // console.log(`   - Логин: ${user.sAMAccountName}`);
            // console.log(`   - Email: ${user.mail || 'не указан'}`);
            // console.log(`   - Имя: ${user.givenName || ''} ${user.sn || ''}`);
            // console.log(`   - Отдел: ${user.department || 'не указан'}`);
            // console.log(`   - DN: ${user.dn}`);
          // });
        // }
        
        resolve({
          success: true,
          count: users?.length || 0,
          users: users || []
        });
      }
    });
  });
});