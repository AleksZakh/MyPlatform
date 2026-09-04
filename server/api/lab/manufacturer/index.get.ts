// server/api/lab/manufacturer/index.get.ts
import { PrismaClient } from '@prisma/client';
import { defineEventHandler, getQuery } from 'h3';

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const page = parseInt(query.page as string) || 1;
    const pageSize = parseInt(query.pageSize as string) || 10;
    const search = (query.search as string) || '';
    const sortKey = (query.sortKey as string) || 'name';
    const sortOrder = (query.sortOrder as string) || 'asc';

    // Формируем условия поиска
    const where = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { note: { contains: search, mode: 'insensitive' } },
      ],
    } : {};

    // Формируем сортировку
    const orderBy = {
      [sortKey]: sortOrder === 'asc' ? 'asc' : 'desc',
    };

    // Выполняем запросы параллельно
    const [data, total] = await Promise.all([
      prisma.manufacturer.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          _count: {
            select: {
              materials: true,
            },
          },
        },
      }),
      prisma.manufacturer.count({ where }),
    ]);

    return {
      success: true,
      data,
      total,
      page,
      pageSize,
    };

  } catch (error: any) {
    console.error('Ошибка при получении списка производителей:', error);
    
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Ошибка при получении списка производителей',
    });
  }
});