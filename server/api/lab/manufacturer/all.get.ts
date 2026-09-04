// server/api/lab/manufacturer/all.get.ts
import { PrismaClient } from '@prisma/client';
import { defineEventHandler, getQuery } from 'h3';

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
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

    // Получаем всех производителей без пагинации
    const manufacturers = await prisma.manufacturer.findMany({
      where,
      orderBy,
      select: {
        id: true,
        name: true,
        note: true,
      },
    });

    return {
      success: true,
      data: manufacturers,
      total: manufacturers.length,
    };

  } catch (error: any) {
    console.error('Ошибка при получении списка производителей:', error);
    
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Ошибка при получении списка производителей',
    });
  }
});