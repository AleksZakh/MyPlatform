import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { z } from 'zod';
// import  setUserSession  from 'nuxt-auth-utils';

const prisma = new PrismaClient();

// Схема валидации входных данных
const registerSchema = z.object({
    name: z.string().min(1, 'Имя обязательно').max(50),
    login: z.string().min(3, 'Логин должен содержать минимум 3 символа').max(50),
    email: z.string().email('Неверный формат email'),
    password: z.string().min(6, 'Пароль должен содержать минимум 6 символов'),
    sessionId: z.string().uuid('Неверный формат sessionId').optional()
});

export default defineEventHandler(async (event) => {
    try {
        // Получаем данные из тела запроса
        const body = await readBody(event);

        // Валидируем входные данные
        const validationResult = registerSchema.safeParse(body);

        if (!validationResult.success) {
            const errors = validationResult.error.format();
            const firstError = validationResult.error.issues[0];
            
            throw createError({
                statusCode: 400,
                statusMessage: 'Bad Request',
                message: firstError?.message || 'Ошибка валидации данных',
                data: errors
            });
        }

        const { name, login, email, password, sessionId } = validationResult.data;
        
        // Проверяем, существует ли пользователь с таким email или логином
        const existingUser = await prisma.users.findFirst({
            where: {
                OR: [
                    { email: email },
                    { login: login }
                ]
            }
        });
        
        if (existingUser) {
            throw createError({
                statusCode: 409,
                statusMessage: 'Conflict',
                message: 'Пользователь с таким email или логином уже существует'
            });
        }

        // Хешируем пароль
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        // Создаем нового пользователя
        const newUser = await prisma.users.create({
            data: {
                login: login,
                email: email,
                userName: name,
                password: hashedPassword,
                role: 'user', // Значение по умолчанию для роли

                sessions: sessionId ? {
                    create: {
                        sessionId: sessionId,
                        timestamp: BigInt(Date.now())
                    }
                } : undefined
            },
            include: {
                sessions: sessionId ? {
                    select: {
                        sessionId: true
                    }
                } : false
            }
        });

        await setUserSession(event, {
            user: {
                id: newUser.id,
                name: newUser.userName,
                login: newUser.login,
                email: newUser.email
            },
            sessionId: sessionId,
            registeredAt: new Date().toISOString()
        });
        
        // Логируем успешную регистрацию
        console.log(`New user registered: ${login} (${email})`);
        
        // Возвращаем успешный ответ
        return {
            success: true,
            statusCode: 201,
            message: 'Пользователь успешно зарегистрирован',
            data: newUser
        };
    } catch (error: any) {
        // Обработка ошибок Prisma
        if (error.code === 'P2002') {
            throw createError({
                statusCode: 409,
                statusMessage: 'Conflict',
                message: 'Пользователь с такими данными уже существует'
            });
        }
        
        // Если ошибка уже создана через createError, пробрасываем её дальше
        if (error.statusCode) {
            throw error;
        }
        
        // Логируем неожиданные ошибки
        console.error('Registration error:', error);
        
        // Возвращаем общую ошибку
        throw createError({
            statusCode: 500,
            statusMessage: 'Internal Server Error',
            message: 'Ошибка при регистрации пользователя'
        });
    }
})