// server/api/lab/receipt-material/index.get.ts
import { PrismaClient } from '@prisma/client';
import { defineEventHandler, getQuery } from 'h3';

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const page = parseInt(query.page as string) || 1;
    const pageSize = parseInt(query.pageSize as string) || 10;
    const search = (query.search as string) || '';
    const sortKey = (query.sortKey as string) || 'qualDate';
    const sortOrder = (query.sortOrder as string) || 'desc';

    // Формируем условия поиска
    const where: any = {};
    if (search) {
      where.OR = [
        { qualDocNumber: { contains: search, mode: 'insensitive' as const } },
        { note: { contains: search, mode: 'insensitive' as const } },
        { material: { name: { contains: search, mode: 'insensitive' as const } } },
        { material: { manufacturer: { name: { contains: search, mode: 'insensitive' as const } } } },
      ];
    }

    // Формируем сортировку
    let orderBy: any = {};
    if (sortKey === 'material') {
      orderBy = {
        material: {
          name: sortOrder === 'asc' ? 'asc' : 'desc',
        },
      };
    } else if (sortKey === 'manufacturer') {
      orderBy = {
        material: {
          manufacturer: {
            name: sortOrder === 'asc' ? 'asc' : 'desc',
          },
        },
      };
    } else {
      orderBy = {
        [sortKey]: sortOrder === 'asc' ? 'asc' : 'desc',
      };
    }

    // Выполняем запросы параллельно
    const [data, total] = await Promise.all([
      prisma.receiptMaterial.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          material: {
            include: {
              manufacturer: true,
            },
          },
          testProtocols: {
            include: {
              samplingTests: {
                select: {
                  id: true,
                  sActNumber: true,
                  sActDate: true,
                },
              },
            },
            take: 5,
          },
          _count: {
            select: {
              testProtocols: true,
            },
          },
        },
      }),
      prisma.receiptMaterial.count({ where }),
    ]);

    return {
      success: true,
      data,
      total,
      page,
      pageSize,
    };

  } catch (error: any) {
    console.error('Ошибка при получении списка поступлений:', error);
    
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Ошибка при получении списка поступлений',
    });
  }
});