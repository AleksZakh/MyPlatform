import ActiveDirectory from 'activedirectory2';
// server/tasks/refreshADCache.ts (для Nuxt 3.10+)
export default defineTask({
  meta: {
    name: 'refresh-ad-cache',
    description: 'Обновление кэша пользователей AD'
  },
  async run() {
    console.log('[TASK] Начало обновления кэша AD...');
    
    const config = useRuntimeConfig();
    const ad = new ActiveDirectory({
      url: config.ad.url,
      baseDN: config.ad.baseDN,
      username: config.ad.username,
      password: config.ad.password
    });
    
    return new Promise<{ result: 'error'; message: string } | { result: 'success'; userCount?: number }>((resolve) => {
      const searchOptions = {
        filter: '(objectClass=user)',
        scope: 'sub',
        sizeLimit: 2000,
        timeLimit: 60,
        attributes: []
      };
      
      ad.findUsers(searchOptions as any, async (err, users) => {
        if (err) {
          console.error('[TASK] Ошибка обновления кэша:', err);
          const errorMessage = err instanceof Error ? err.message : String(err);
          resolve({ result: 'error', message: errorMessage });
        } else {
          await adCache.set(users || []);
          console.log(`[TASK] Кэш обновлён: ${users?.length} пользователей`);
          resolve({ result: 'success', userCount: users?.length });
        }
      });
    });
  }
});