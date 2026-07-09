export default defineEventHandler((event) => {
  // Удаляем куку 'user_data'
  deleteCookie(event, 'user_data', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });

  return { success: true };
});
