import { getUserGroups } from '../../utils/ad';

export default defineEventHandler(async (event) => {
  // Получаем имя пользователя из заголовка прокси (предыдущий шаг)
  const fullRawUser = getHeader(event, 'x-remote-user') || ''; // DOMAIN\ivanov_ii
  
  if (!fullRawUser) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  // Очищаем имя от префикса домена
  const username = fullRawUser.split('\\')[1] || fullRawUser;

  try {
    // Запрашиваем группы пользователя напрямую из контроллера домена
    const adGroups = await getUserGroups(username);

    // Маппинг доменных групп во внутренние роли приложения
    const roles = [];
    if (adGroups.includes('App_Admins_Group')) roles.push('admin');
    if (adGroups.includes('App_Managers_Group')) roles.push('manager');
    if (adGroups.includes('Domain Users')) roles.push('user');

    // Возвращаем данные пользователя на фронтенд
    return {
      username,
      roles,
      groups: adGroups // Полный список групп для точечных проверок
    };
  } catch (error) {
    throw createError({ statusCode: 500, message: 'AD Connection Error' });
  }
});