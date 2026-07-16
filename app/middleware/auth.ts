// middleware/auth.ts
import { useUserStore } from '~/stores/user'

export default defineNuxtRouteMiddleware((to) => {
  const userStore = useUserStore()

  // Если пользователь НЕ авторизован (нет данных в Pinia) и он пытается зайти НЕ на страницу логина
  if (!userStore.isAuthenticated && to.path !== '/login') {
    // Запоминаем страницу, на которую он хотел попасть, чтобы вернуть его туда после ввода пароля
    return navigateTo(`/login?redirect=${to.fullPath}`)
  }
})
