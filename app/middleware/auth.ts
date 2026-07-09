export default defineNuxtRouteMiddleware((to, from) => {
  const { data, error } = useFetch('/api/auth/me');

  if (data.value) {
    // Этот console.log сработает в ТЕРМИНАЛЕ (на сервере),
    // так как Nuxt делает SSR.
    console.log('Данные пользователя на сервере:', data.value);
  }

  if (error.value) {
    console.error('Ошибка на сервере:', error.value.statusMessage);
    return navigateTo('/login');
  }

  // const session = useCookie('user_data')
  // const session = useCookie<{ name?: string }>('user_data')

  // // Если куки нет и мы не на странице логина — редирект
  // if (!session.value) {
  //   console.log('Нет сессии, перенаправляем на логин')
  //   return navigateTo('/login')
  // } else {

  //   const router = useRouter();

  //   console.log('Данные куки в middleware:', session.value.name) // Посмотрите в терминал (сервер) и консоль браузера

  //   if (!session.value.name) {
  //     return navigateTo('/login')
  //   } else {
  //     console.log('Пользователь авторизован, имя:', session.value.name)
  //     router.push("/");
  //   }
  // }

  // if (!userData.value || typeof userData.value === 'string' || !userData.value.name) {
  //   return navigateTo('/login')
  // }
});
