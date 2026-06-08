// server/tasks/refresh-ad-cache.ts
import ActiveDirectory from 'activedirectory2';

export default defineTask({
  meta: {
    name: 'ad:refresh-ad-cache',
    description: 'Обновление кэша пользователей Active Directory',
    // removed unsupported "version" property — TaskMeta does not include it
  },
  
  async run(payload) {
    const startTime = Date.now();
    console.log(`🔄 [TASK] Запуск обновления кэша AD в ${new Date().toISOString()}`);
    
    try {
      const config = useRuntimeConfig();
      
      const adConfig = {
        url: config.ad.url,
        baseDN: config.ad.baseDN,
        username: config.ad.username,
        password: config.ad.password,
        timeout: config.ad.timeout || 30000
      };
      
      const ad = new ActiveDirectory(adConfig);
      
      // Загружаем пользователей из AD
      const users = await new Promise((resolve, reject) => {
        const searchOptions = {
          filter: '(objectClass=user)',
          scope: 'sub',
          sizeLimit: 2000,
          timeLimit: 60,
          attributes: [],
          includeMembership: [],
          includeDeleted: false,
          includeDerivedMembership: []
        };
        
        ad.findUsers(searchOptions as any, (err: any, users: any[]) => {
          if (err) reject(err);
          else resolve(users || []);
        });
      });
      
      // Сохраняем в кэш (используя adCache)
      const { adCache } = await import('../../utils/adCache');
      await adCache.set(users as any[]);
      
      const duration = Date.now() - startTime;
      console.log(`✅ [TASK] Кэш AD обновлён: ${(users as any[]).length} пользователей за ${duration}ms`);
      
      return {
        result: 'success',
        data: {
          userCount: (users as any[]).length,
          durationMs: duration,
          timestamp: new Date().toISOString()
        }
      };
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`❌ [TASK] Ошибка обновления кэша AD: ${error.message}`);
      
      return {
        result: 'error',
        error: error.message,
        durationMs: duration
      };
    }
  }
});