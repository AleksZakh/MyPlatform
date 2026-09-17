// app/middleware/auth.global.ts

export default defineNuxtRouteMiddleware(async (to) => {
  const publicPages = [
    '/login',
    '/verify-email',
    '/activate-account',
  ]

  const isPublicPage =
    to.meta.public === true ||
    publicPages.includes(to.path)

  if (isPublicPage) {
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