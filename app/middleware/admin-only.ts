export default defineNuxtRouteMiddleware((to, from) => {
  const user = useState('user').value as any;

  // Если у пользователя нет роли admin, перенаправляем на страницу ошибки
  if (!user || !user.roles?.includes('admin')) {
    const actorId = useUserSession().user.value?.id;
    if (typeof actorId === 'number') useState<{ id: string; actorId: number; target: string } | null>('usage-access-denial', () => null).value = { id: crypto.randomUUID(), actorId, target: to.path };
    return navigateTo('/access-denied');
  }
});
