// server/api/lab/test-location/[id].delete.ts
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

    // Проверяем существование записи
    const existingLocation = await prisma.testLocation.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            samplingTests: true,
          },
        },
      },
    });

    if (!existingLocation) {
      throw createError({
        statusCode: 404,
        statusMessage: `Место отбора с ID ${id} не найдено`,
      });
    }

    // Проверяем, есть ли связанные отборы проб
    if (existingLocation._count.samplingTests > 0) {
      throw createError({
        statusCode: 409,
        statusMessage: `Невозможно удалить место, так как оно используется в ${existingLocation._count.samplingTests} отборах проб`,
      });
    }

    await prisma.testLocation.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Место отбора успешно удалено',
    };

  } catch (error: any) {
    console.error('Ошибка при удалении места отбора:', error);
    
    if (error.statusCode) throw error;
    
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Ошибка при удалении места отбора',
    });
  }
});