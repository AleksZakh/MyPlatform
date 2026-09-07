// server/api/lab/test-protocol/all.get.ts
import { PrismaClient } from '@prisma/client';
import { defineEventHandler, getQuery } from 'h3';

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const search = (query.search as string) || '';
    const sortKey = (query.sortKey as string) || 'protocolNumber';
    const sortOrder = (query.sortOrder as string) || 'asc';

    const where: any = {};
    if (search) {
      where.OR = [
        { protocolNumber: { contains: search, mode: 'insensitive' as const } },
        { testResult: { contains: search, mode: 'insensitive' as const } },
        { note: { contains: search, mode: 'insensitive' as const } },
      ];
    }

    const protocols = await prisma.testProtocol.findMany({
      where,
      orderBy: {
        [sortKey]: sortOrder === 'asc' ? 'asc' : 'desc',
      },
      select: {
        id: true,
        protocolNumber: true,
        protocolDate: true,
        testResult: true,
        note: true,
      },
    });

    return {
      success: true,
      data: protocols,
      total: protocols.length,
    };

  } catch (error: any) {
    console.error('Ошибка при получении списка протоколов:', error);
    
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Ошибка при получении списка протоколов',
    });
  }
});