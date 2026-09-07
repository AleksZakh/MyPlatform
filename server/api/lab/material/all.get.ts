// server/api/lab/material/all.get.ts (расширенная версия)
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
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' as const } },
        { note: { contains: search, mode: 'insensitive' as const } },
        { manufacturer: { name: { contains: search, mode: 'insensitive' as const } } },
      ];
    }

    // Формируем сортировку
    const orderBy: any = {};
    if (sortKey === 'manufacturer') {
      orderBy.manufacturer = {
        name: sortOrder === 'asc' ? 'asc' : 'desc',
      };
    } else {
      orderBy[sortKey] = sortOrder === 'asc' ? 'asc' : 'desc';
    }

    // Получаем все материалы без пагинации
    const materials = await prisma.material.findMany({
      where,
      orderBy,
      select: {
        id: true,
        name: true,
        note: true,
        manufacturerId: true,
        manufacturer: {
          select: {
            id: true,
            name: true,
            note: true,
          },
        },
        _count: {
          select: {
            receipts: true,
          },
        },
      },
    });

    return {
      success: true,
      data: materials,
      total: materials.length,
    };

  } catch (error: any) {
    console.error('Ошибка при получении списка материалов:', error);
    
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Ошибка при получении списка материалов',
    });
  }
});