// import  getUserSession  from 'nuxt-auth-utils';

export default defineEventHandler(async (event) => {
    const session = await getUserSession(event);
    
    if (!session) {
        throw createError({ statusCode: 401, message: 'No active session' });
    }
    
    return {
        user: session.user,
        loggedIn: true
    };
});