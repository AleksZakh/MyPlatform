export default defineNuxtRouteMiddleware((to, from) => {
  const user = useState('user').value as any;

  // Если у пользователя нет роли admin, перенаправляем на страницу ошибки
  if (!user || !user.roles?.includes('admin')) {
    return navigateTo('/access-denied');
  }
});