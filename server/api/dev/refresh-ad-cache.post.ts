import {
  listDomainUsers,
} from '../../services/ad-directory.service';

import {
  adCache,
} from '../../utils/adCache';


export default defineEventHandler(
  async (event) => {
    /**
     * Этот endpoint существует исключительно
     * для локальной разработки.
     */
    if (
      process.env.NODE_ENV !==
      'development'
    ) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Not Found',
      });
    }


    const startedAt =
      Date.now();


    /**
     * Получаем пользователей через новый
     * единый AD service.
     */
    const users =
      await listDomainUsers(
        event,
      );


    /**
     * Сохраняем уже нормализованные
     * DirectoryUser[] в cache.
     */
    await adCache.set(
      users,
    );


    const withDirectoryObjectId =
      users.filter(
        (user) =>
          Boolean(
            user.directoryObjectId,
          ),
      ).length;


    const disabledCount =
      users.filter(
        (user) =>
          user.accountDisabled,
      ).length;


    return {
      success: true,

      userCount:
        users.length,

      withDirectoryObjectId,

      withoutDirectoryObjectId:
        users.length -
        withDirectoryObjectId,

      disabledCount,

      durationMs:
        Date.now() -
        startedAt,
    };
  },
);