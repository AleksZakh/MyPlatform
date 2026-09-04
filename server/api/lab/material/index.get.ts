// server/api/lab/material/index.get.ts
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

    // Формируем условия поиска с явным указанием типа
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' as const } },
        { note: { contains: search, mode: 'insensitive' as const } },
        { manufacturer: { name: { contains: search, mode: 'insensitive' as const } } },
      ];
    }

    // Формируем сортировку
    let orderBy: any = {};
    if (sortKey === 'manufacturer') {
      orderBy = {
        manufacturer: {
          name: sortOrder === 'asc' ? 'asc' : 'desc',
        },
      };
    } else {
      orderBy = {
        [sortKey]: sortOrder === 'asc' ? 'asc' : 'desc',
      };
    }

    // Выполняем запросы параллельно
    const [data, total] = await Promise.all([
      prisma.material.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          manufacturer: true,
          _count: {
            select: {
              receipts: true,
            },
          },
        },
      }),
      prisma.material.count({ where }),
    ]);

    return {
      success: true,
      data,
      total,
      page,
      pageSize,
    };

  } catch (error: any) {
    console.error('Ошибка при получении списка материалов:', error);
    
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Ошибка при получении списка материалов',
    });
  }
});