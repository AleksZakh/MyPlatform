import { PrismaClient } from '@prisma/client';
import { defineEventHandler, getRouterParams } from 'h3';

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
    // 1. Получаем ID из параметров пути и приводим к числу
    const idParam = getRouterParam(event, 'id')
    const id = parseInt(idParam || '', 10)
    // console.log('idParam ====> ', idParam)
    // 2. Валидация: если ID не число, возвращаем ошибку 400
    if (isNaN(id)) {
        throw createError({
        statusCode: 400,
        statusMessage: 'Некорректный ID записи',
        })
    }
    try {
        // 3. Ищем запись в базе данных PostgreSQL
        const record = await prisma.aEng.findUnique({
        where: { id },
        })
        // 4. Если запись не найдена, возвращаем ошибку 404
        if (!record) {
            throw createError({
                statusCode: 404,
                statusMessage: `Запись с ID ${id} не найдена`,
            })
        }

        // 5. Возвращаем найденную запись
        return record
        
    } catch (error: any) {
        // Пробрасываем ошибку Nuxt, если она уже создана выше
        if (error.statusCode) throw error

        // Обработка непредвиденных ошибок БД
        throw createError({
            statusCode: 500,
            statusMessage: 'Ошибка при получении данных с сервера',
            data: error.message,
        })
        
    }
})