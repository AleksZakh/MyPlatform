import { adCache } from '../utils/adCache';
import { listDomainUsers } from '../services/ad-directory.service';

export default defineTask({
  meta: { name: 'refresh-ad-cache', description: 'Обновление кэша пользователей AD' },
  async run() {
    try {
      const users = await listDomainUsers();
      await adCache.set(users);
      return { result: 'success', userCount: users.length };
    } catch (error) {
      console.error('[TASK] Ошибка обновления кэша AD:', error);
      return { result: 'error', message: error instanceof Error ? error.message : String(error) };
    }
  },
});
