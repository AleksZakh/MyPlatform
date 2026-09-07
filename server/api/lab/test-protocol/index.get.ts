// server/api/lab/test-protocol/index.get.ts
import { PrismaClient } from '@prisma/client';
import { defineEventHandler, getQuery } from 'h3';

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const page = parseInt(query.page as string) || 1;
    const pageSize = parseInt(query.pageSize as string) || 10;
    const search = (query.search as string) || '';
    const sortKey = (query.sortKey as string) || 'protocolNumber';
    const sortOrder = (query.sortOrder as string) || 'asc';

    // Формируем условия поиска
    const where: any = {};
    if (search) {
      where.OR = [
        { protocolNumber: { contains: search, mode: 'insensitive' as const } },
        { testResult: { contains: search, mode: 'insensitive' as const } },
        { note: { contains: search, mode: 'insensitive' as const } },
        { 
          receiptMaterial: { 
            material: { 
              name: { contains: search, mode: 'insensitive' as const } 
            } 
          } 
        },
        { 
          receiptMaterial: { 
            material: { 
              manufacturer: { 
                name: { contains: search, mode: 'insensitive' as const } 
              } 
            } 
          } 
        },
        {
          samplingTests: {
            some: {
              sActNumber: { contains: search, mode: 'insensitive' as const }
            }
          }
        }
      ];
    }

    // Формируем сортировку
    let orderBy: any = {};
    if (sortKey === 'material') {
      orderBy = {
        receiptMaterial: {
          material: {
            name: sortOrder === 'asc' ? 'asc' : 'desc',
          },
        },
      };
    } else if (sortKey === 'manufacturer') {
      orderBy = {
        receiptMaterial: {
          material: {
            manufacturer: {
              name: sortOrder === 'asc' ? 'asc' : 'desc',
            },
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
      prisma.testProtocol.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
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
          samplingTests: {
            select: {
              id: true,
              sActNumber: true,
              sActDate: true,
            },
            take: 5,
          },
          _count: {
            select: {
              samplingTests: true,
            },
          },
        },
      }),
      prisma.testProtocol.count({ where }),
    ]);

    return {
      success: true,
      data,
      total,
      page,
      pageSize,
    };

  } catch (error: any) {
    console.error('Ошибка при получении списка протоколов:', error);
    
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Ошибка при получении списка протоколов',
    });
  }
});