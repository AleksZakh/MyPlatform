// server/tasks/ad/refresh-ad-cache.ts

import {
  listDomainUsers,
} from '../../services/ad-directory.service';


export default defineTask({
  meta: {
    name:
      'ad:refresh-ad-cache',

    description:
      'Обновление кэша пользователей Active Directory',
  },


  async run() {
    const startTime =
      Date.now();

    console.log(
      `🔄 [TASK] Запуск обновления кэша AD в ${new Date().toISOString()}`,
    );


    try {
      /**
       * ========================================================
       * 1. Получаем нормализованный список DOMAIN-пользователей
       * ========================================================
       *
       * Работа с Active Directory теперь полностью вынесена
       * в ad-directory.service.ts.
       */
      const users =
        await listDomainUsers();


      /**
       * ========================================================
       * 2. Сохраняем пользователей в AD cache
       * ========================================================
       */
      const {
        adCache,
      } =
        await import(
          '../../utils/adCache'
        );


      await adCache.set(
        users,
      );


      /**
       * ========================================================
       * 3. Статистика выполнения
       * ========================================================
       */
      const duration =
        Date.now() -
        startTime;


      console.log(
        `✅ [TASK] Кэш AD обновлён: ${users.length} пользователей за ${duration}ms`,
      );


      return {
        result:
          'success',

        data: {
          userCount:
            users.length,

          durationMs:
            duration,

          timestamp:
            new Date()
              .toISOString(),
        },
      };
    }
    catch (error: any) {
      const duration =
        Date.now() -
        startTime;


      console.error(
        `❌ [TASK] Ошибка обновления кэша AD: ${
          error?.message ||
          String(error)
        }`,
      );


      return {
        result:
          'error',

        error:
          error?.message ||
          String(error),

        durationMs:
          duration,
      };
    }
  },
});