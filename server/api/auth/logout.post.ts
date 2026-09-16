// server/api/auth/logout.post.ts

import { logger } from '../../utils/logger';

export default defineEventHandler(async (event) => {
  /**
   * Получаем текущего пользователя только для логирования.
   */
  const session = await getUserSession(event);

  const user: any = session?.user;

  const username =
    user?.username ||
    user?.login ||
    'unknown';


  /**
   * Удаляем nuxt-auth-utils session.
   *
   * Не нужно вручную удалять:
   *
   * deleteCookie(event, 'user_data')
   *
   * clearUserSession() удалит правильную session-cookie.
   */
  await clearUserSession(event);


  logger.info(
    `Пользователь ${username} вышел из системы`,
  );


  return {
    success: true,
  };
});