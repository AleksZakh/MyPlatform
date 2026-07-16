// выполнится ТОЛЬКО при SSR

export default defineNuxtPlugin((nuxtApp) => {
  // Получаем доступ к серверному событию Nitro
  const event = useRequestEvent();

  // Создаем общую стейт-переменную, которая долетит до клиента
  const sharedUser = useState('auth_user_bridge', () => null);

  // Если мы на сервере и в контексте есть данные из AD — перекладываем их в useState
  if (event && event.context.user) {
    sharedUser.value = event.context.user;
  }
});
