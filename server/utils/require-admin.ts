import type { H3Event } from 'h3';

export const requireAdmin = async (
  event: H3Event,
) => {
  // Если сессии нет, nuxt-auth-utils сам вернёт 401.
  const session =
    await requireUserSession(event);

  const login =
    session.user?.login
      ?.trim()
      .toLowerCase();

  if (!login) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message:
        'Не удалось определить пользователя.',
    });
  }

  const config =
    useRuntimeConfig(event);

  const adminLogins =
    String(config.adminLogins || '')
      .split(',')
      .map((item) =>
        item.trim().toLowerCase(),
      )
      .filter(Boolean);

  if (!adminLogins.includes(login)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message:
        'Недостаточно прав для доступа к панели администратора.',
    });
  }

  return {
    session,
    user: session.user,
    login,
  };
};