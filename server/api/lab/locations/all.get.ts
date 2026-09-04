// server/api/lab/test-location/all.get.ts
import { PrismaClient } from '@prisma/client';
import { defineEventHandler, getQuery } from 'h3';

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const testObjectId = parseInt(query.testObjectId as string) || 0;
    const search = (query.search as string) || '';
    const sortKey = (query.sortKey as string) || 'name';
    const sortOrder = (query.sortOrder as string) || 'asc';

    const where: any = {};
    
    if (testObjectId > 0) {
      where.testObjectId = testObjectId;
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' as const } },
        { note: { contains: search, mode: 'insensitive' as const } },
      ];
    }

    const locations = await prisma.testLocation.findMany({
      where,
      orderBy: {
        [sortKey]: sortOrder === 'asc' ? 'asc' : 'desc',
      },
      select: {
        id: true,
        name: true,
        note: true,
      },
    });

    return {
      success: true,
      data: locations,
      total: locations.length,
    };

  } catch (error: any) {
    console.error('Ошибка при получении списка мест отбора:', error);
    
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Ошибка при получении списка мест отбора',
    });
  }
});