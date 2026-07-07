// ~/server/middleware/log.ts
// import { getServerSession } from '#auth' // если используете sidebase/nuxt-auth

export default defineEventHandler(async (event) => {
//   console.log('--- New request ---');
//   console.log('URL:', getRequestURL(event).pathname);
  // Пример логирования сессии, если используете модуль аутентификации
  // const session = await getServerSession(event);
  // console.log('Session user:', session?.user);
});