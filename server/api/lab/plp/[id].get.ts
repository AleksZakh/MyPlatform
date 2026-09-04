// server/api/lab/plp/[id].get.ts - ПОЛУЧЕНИЕ ЗАПИСИ ПО ID
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
        statusMessage: 'Некорректный ID ПЛП',
      });
    }

    const plp = await prisma.plp.findUnique({
      where: { id },
      include: {
        _count: {
          select: { samplingTests: true },
        },
      },
    });

    if (!plp) {
      throw createError({
        statusCode: 404,
        statusMessage: `ПЛП с ID ${id} не найден`,
      });
    }

    return {
      success: true,
      data: plp,
    };

  } catch (error: any) {
    console.error('Ошибка при получении ПЛП:', error);
    
    if (error.statusCode) throw error;
    
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Ошибка при получении ПЛП',
    });
  }
});