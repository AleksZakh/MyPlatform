// server/api/lab/sampling-test/index.get.ts
import { PrismaClient } from '@prisma/client';
import { defineEventHandler, getQuery } from 'h3';

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const page = parseInt(query.page as string) || 1;
    const pageSize = parseInt(query.pageSize as string) || 10;
    const search = (query.search as string) || '';
    const sortKey = (query.sortKey as string) || 'sActNumber';
    const sortOrder = (query.sortOrder as string) || 'asc';

    // Формируем условия поиска
    const where: any = {};
    if (search) {
      where.OR = [
        { sActNumber: { contains: search, mode: 'insensitive' as const } },
        { note: { contains: search, mode: 'insensitive' as const } },
        { plp: { name: { contains: search, mode: 'insensitive' as const } } },
        { inspector: { name: { contains: search, mode: 'insensitive' as const } } },
        { testLocation: { name: { contains: search, mode: 'insensitive' as const } } },
        { testLocation: { testObject: { name: { contains: search, mode: 'insensitive' as const } } } },
        { testProtocol: { protocolNumber: { contains: search, mode: 'insensitive' as const } } },
        { receiptMaterial: { material: { name: { contains: search, mode: 'insensitive' as const } } } },
      ];
    }

    // Формируем сортировку
    let orderBy: any = {};
    if (sortKey === 'plp') {
      orderBy = { plp: { name: sortOrder === 'asc' ? 'asc' : 'desc' } };
    } else if (sortKey === 'inspector') {
      orderBy = { inspector: { name: sortOrder === 'asc' ? 'asc' : 'desc' } };
    } else if (sortKey === 'object') {
      orderBy = { testLocation: { testObject: { name: sortOrder === 'asc' ? 'asc' : 'desc' } } };
    } else if (sortKey === 'location') {
      orderBy = { testLocation: { name: sortOrder === 'asc' ? 'asc' : 'desc' } };
    } else {
      orderBy = { [sortKey]: sortOrder === 'asc' ? 'asc' : 'desc' };
    }

    // Выполняем запросы параллельно
    const [data, total] = await Promise.all([
      prisma.samplingTest.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          plp: true,
          inspector: true,
          testLocation: {
            include: {
              testObject: true,
            },
          },
          testProtocol: {
            include: {
              receiptMaterial: {
                include: {
                  material: {
                    include: {
                      manufacturer: true,
                    },
                  },
                },
              },
            },
          },
          receiptMaterial: {
            include: {
              material: {
                include: {
                  manufacturer: true,
                },
              },
            },
          },
        },
      }),
      prisma.samplingTest.count({ where }),
    ]);

    return {
      success: true,
      data,
      total,
      page,
      pageSize,
    };

  } catch (error: any) {
    console.error('Ошибка при получении списка актов отбора:', error);
    
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Ошибка при получении списка актов отбора',
    });
  }
});