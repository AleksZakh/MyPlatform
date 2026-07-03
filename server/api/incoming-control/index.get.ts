import { PrismaClient } from '@prisma/client';
import { defineEventHandler, getQuery } from 'h3';
const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  try {

    // Получаем параметры запроса
    const query = getQuery(event)
    
    // Параметры пагинации с значениями по умолчанию
    const page = parseInt(query.page as string) || 1
    const pageSize = parseInt(query.pageSize as string) || 25

    // Валидация параметров
    const validPage = Math.max(1, page)
    const validPageSize = Math.min(100, Math.max(1, pageSize)) // Ограничиваем максимум 100 записей
    // Вычисляем количество пропускаемых записей
    const skip = (validPage - 1) * validPageSize

    // Получаем данные с пагинацией
    const [data, totalCount] = await Promise.all([
      prisma.aEng.findMany({
        skip: skip,
        take: validPageSize,
        orderBy: {
          id: 'desc', // Сортировка по умолчанию
        },
      }),
      prisma.aEng.count(),
    ])

  // Возвращаем данные с информацией о пагинации
    return {
      success: true,
      data: data,
      pagination: {
        currentPage: validPage,
        pageSize: validPageSize,
        totalCount: totalCount,
        totalPages: Math.ceil(totalCount / validPageSize),
        hasNext: validPage < Math.ceil(totalCount / validPageSize),
        hasPrev: validPage > 1,
      },
    }
  } catch (error) {
    console.error('Ошибка при получении данных:', error)
    return {
      success: false,
      error: 'Ошибка при получении данных',
    }
  }
})