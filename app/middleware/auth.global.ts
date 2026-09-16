// middleware/auth.global.ts

export default defineNuxtRouteMiddleware(async (to) => {
  if (to.meta.public) {
    return
  }

  const {
    loggedIn,
    ready,
    fetch,
  } = useUserSession()


  if (!ready.value) {
    await fetch()
  }


  if (!loggedIn.value) {
    return navigateTo({
      path: '/login',
      query: {
        redirect: to.fullPath,
      },
    })
  }
})