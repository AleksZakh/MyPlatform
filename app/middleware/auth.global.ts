// middleware/auth.global.ts
export default defineNuxtRouteMiddleware((to, from) => {
  const authStore = useAuthStore()
  // Используем встроенный модуль
  const { loggedIn } = useUserSession();

 //  console.log('loggedIn:', loggedIn.value);
  // console.log('authStore.isAuth:', authStore.isAuth);
  // Следим за изменением переменной loggedIn
  watch(loggedIn, (newValue) => {
    if (newValue === true) {
      // console.log('Сессия успешно обновилась! Данные пользователя:', user.value)
      // Выполняйте вашу команду здесь
    }
  }, { immediate: true }) // immediate проверит статус даже если он уже был true при загрузке
  
  // console.log(`Проверяем доступ к ${to.path}...`, loggedIn.value ? '(Пользователь авторизован)' : '(Пользователь НЕ авторизован)')

  // 1. Исключаем саму страницу логина из проверок, чтобы избежать зацикливания
  if (to.path === '/login') {
    // Если пользователь УЖЕ авторизован и зачем-то идет на /login, 
    // отправляем его на главную или в панель редактирования
    if (loggedIn.value) {
      return navigateTo('/')
    }
    return // Если не авторизован, просто разрешаем открыть страницу /login
  }

  // 2. Проверяем meta-поле public (например, для страниц "О нас", "Контакты")
  if (to.meta.public === true) {
    return
  }

  // 3. Если пользователь НЕ авторизован и пытается зайти на защищенную страницу
  if (!loggedIn.value) {
    // console.warn(`Доступ запрещен к ${to.path}. Редирект на /login`)
    return navigateTo('/login')
  }
})
