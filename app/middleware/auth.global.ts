// middleware/auth.global.ts
export default defineNuxtRouteMiddleware(async (to, from) => {
  // ✅ Загружаем сессию с сервера
  const { data } = await useFetch('/api/auth/session')
  
  const loggedIn = data.value?.loggedIn || false
  
  if (to.path === '/login') {
    if (loggedIn) return navigateTo('/')
    return
  }

  if (to.meta.public === true) return

  if (!loggedIn) {
    return navigateTo('/login')
  }
})