
// server/api/lab/receipt-material/all.get.ts
import { PrismaClient } from '@prisma/client';
import { defineEventHandler, getQuery } from 'h3';

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const search = (query.search as string) || '';
    const sortKey = (query.sortKey as string) || 'qualDate';
    const sortOrder = (query.sortOrder as string) || 'desc';

    const where: any = {};
    if (search) {
      where.OR = [
        { qualDocNumber: { contains: search, mode: 'insensitive' as const } },
        { note: { contains: search, mode: 'insensitive' as const } },
        { material: { name: { contains: search, mode: 'insensitive' as const } } },
      ];
    }

    const receipts = await prisma.receiptMaterial.findMany({
      where,
      orderBy: {
        [sortKey]: sortOrder === 'asc' ? 'asc' : 'desc',
      },
      select: {
        id: true,
        qualDate: true,
        qualDocNumber: true,
        qualDocPath: true,
        note: true,
        material: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return {
      success: true,
      data: receipts,
      total: receipts.length,
    };

  } catch (error: any) {
    console.error('Ошибка при получении списка поступлений:', error);
    
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Ошибка при получении списка поступлений',
    });
  }
});