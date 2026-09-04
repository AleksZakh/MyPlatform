// server/api/lab/test-location/[id].get.ts
import { PrismaClient } from '@prisma/client';
import { defineEventHandler, getRouterParam } from 'h3';

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  try {
    const idParam = getRouterParam(event, 'id');
    const id = parseInt(idParam || '', 10);

    if (isNaN(id) || id <= 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Некорректный ID места отбора',
      });
    }

    const location = await prisma.testLocation.findUnique({
      where: { id },
      include: {
        testObject: {
          select: {
            id: true,
            name: true,
            note: true,
          },
        },
        _count: {
          select: {
            samplingTests: true,
          },
        },
        samplingTests: {
          take: 10,
          select: {
            id: true,
            sActNumber: true,
            sActDate: true,
          },
        },
      },
    });

    if (!location) {
      throw createError({
        statusCode: 404,
        statusMessage: `Место отбора с ID ${id} не найдено`,
      });
    }

    return {
      success: true,
      data: location,
    };

  } catch (error: any) {
    console.error('Ошибка при получении места отбора:', error);
    
    if (error.statusCode) throw error;
    
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Ошибка при получении места отбора',
    });
  }
});