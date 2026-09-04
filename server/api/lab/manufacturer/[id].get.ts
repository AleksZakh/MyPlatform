// server/api/lab/manufacturer/[id].get.ts
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
        statusMessage: 'Некорректный ID производителя',
      });
    }

    const manufacturer = await prisma.manufacturer.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            materials: true,
          },
        },
        materials: {
          take: 10,
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!manufacturer) {
      throw createError({
        statusCode: 404,
        statusMessage: `Производитель с ID ${id} не найден`,
      });
    }

    return {
      success: true,
      data: manufacturer,
    };

  } catch (error: any) {
    console.error('Ошибка при получении производителя:', error);
    
    if (error.statusCode) throw error;
    
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Ошибка при получении производителя',
    });
  }
});