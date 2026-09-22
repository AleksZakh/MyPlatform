// app/middleware/admin-center.global.ts

export default defineNuxtRouteMiddleware(
  async to => {
    if (
      !to.path.startsWith(
        '/admin',
      )
    ) {
      return
    }


    try {
      await $fetch(
        '/api/admin/guard',
        {
          headers:
            import.meta.server
              ? useRequestHeaders([
                  'cookie',
                ])
              : undefined,
        },
      )
    } catch (error: any) {
      const statusCode =
        Number(
          error?.statusCode ??
          error?.status ??
          error?.response
            ?.status ??
          0,
        )

      if (
        statusCode === 401 ||
        statusCode === 403
      ) {
        return navigateTo(
          '/',
          {
            replace:
              true,
          },
        )
      }

      throw error
    }
  },
)
