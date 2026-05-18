import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'
// import  setUserSession  from 'nuxt-auth-utils';


const prisma = new PrismaClient()


export default defineEventHandler(async (event) => {
    // 1. Читаем данные из тела POST-запроса
    console.log("Получен запрос на авторизацию");
    const { login, email, password, sessionId } = await readBody(event);

    // 2. Ищем пользователя в БД через Prisma
    try {
        console.log("Ищем пользователя в БД с помощью Prisma:", { login, email });
        const user = await prisma.users.findUnique({
            where: {
                login,
            },
        });

        if (!user) {
            console.warn("Пользователь не найден:", { login });
            return sendError(event, createError({ statusCode: 404, message: "Пользователь не найден" }));
        }

        // 3. Сравниваем введенный пароль с хэшем из БД
        if (!(await bcrypt.compare(password, user.password))) {
            console.warn("Неверный пароль для пользователя:", { login });
            return sendError(event, createError({ statusCode: 400, message: "Неверный пароль" }));
        } else {
            try {
                // Устанавливаем сессию
                await setUserSession(event, {
                    user: {
                        id: user.id,
                        name: user.userName,
                        login: user.login,
                        email: user.email
                    },
                    sessionId: sessionId,
                    loggedInAt: new Date().toISOString()
                });
                // 4. Если пароль верный, создаем сессию пользователя в БД
                await prisma.sessions.create({
                    data: {
                        userId: user.id,
                        sessionId,
                        timestamp: Date.now(),
                    },
                });
            } catch (error) {
                console.error("Ошибка при создании сессии:", error);
                return sendError(event, createError({ statusCode: 500, message: "Ошибка сервера при создании сессии" }));
            }

            // 5. Возвращаем данные пользователя (можно исключить пароль)
            const { password, ...userData } = user; // Исключаем пароль из ответа
            
            return userData;
            
        }
    } catch (err: any) {
        console.error("Ошибка при поиске пользователя:", err.message);
        return sendError(event, createError({ statusCode: 500, statusMessage: "Ошибка сервера" }));
    }
})

