// server/utils/adCache.ts
import { useStorage } from 'nitropack/runtime';

// Делаем все поля опциональными, так как AD может возвращать неполные данные
interface ADUser {
  sAMAccountName?: string;
  cn?: string;
  mail?: string;
  givenName?: string;
  sn?: string;
  department?: string;
  title?: string;
  telephoneNumber?: string;
  dn?: string;
  [key: string]: any; // Разрешаем любые дополнительные поля
}

interface ADCache {
  users: ADUser[];
  lastUpdated: string;
  totalCount: number;
  version: number;
}

class ADUserCache {
  private static instance: ADUserCache;
  private cacheKey = 'ad:users:global';
  
  static getInstance() {
    if (!ADUserCache.instance) {
      ADUserCache.instance = new ADUserCache();
    }
    return ADUserCache.instance;
  }
  
  async get(): Promise<ADCache | null> {
    try {
      const cached = await useStorage().getItem<ADCache>(this.cacheKey);
      return cached;
    } catch (error) {
      console.error('Ошибка чтения кэша AD:', error);
      return null;
    }
  }
  
  async set(users: any[]): Promise<void> {
    // Приводим данные к нужному типу
    const typedUsers: ADUser[] = users.map(user => ({
      sAMAccountName: user.sAMAccountName || user.cn || 'unknown',
      cn: user.cn,
      mail: user.mail,
      givenName: user.givenName,
      sn: user.sn,
      department: user.department,
      title: user.title,
      telephoneNumber: user.telephoneNumber,
      dn: user.dn,
      ...user // сохраняем все оригинальные поля
    }));
    
    const cache: ADCache = {
      users: typedUsers,
      lastUpdated: new Date().toISOString(),
      totalCount: typedUsers.length,
      version: 1
    };
    
    await useStorage().setItem(this.cacheKey, cache);
    console.log(`[КЭШ] Сохранено ${typedUsers.length} пользователей в общее хранилище`);
  }
  
  async isExpired(): Promise<boolean> {
    const cache = await this.get();
    if (!cache) return true;
    
    const lastUpdate = new Date(cache.lastUpdated);
    const hoursSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60);
    return hoursSinceUpdate > 1; // устаревает через 1 час
  }
  
  async invalidate(): Promise<void> {
    await useStorage().removeItem(this.cacheKey);
    console.log('[КЭШ] Кэш AD очищен');
  }
}

export const adCache = ADUserCache.getInstance();