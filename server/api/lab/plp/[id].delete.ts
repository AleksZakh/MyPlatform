// server/api/lab/plp/[id].delete.ts - УДАЛЕНИЕ ЗАПИСИ
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

    // Проверяем существование записи
    const existingPlp = await prisma.plp.findUnique({
      where: { id },
      include: {
        _count: {
          select: { samplingTests: true },
        },
      },
    });

    if (!existingPlp) {
      throw createError({
        statusCode: 404,
        statusMessage: `ПЛП с ID ${id} не найден`,
      });
    }

    // Проверяем, есть ли связанные записи
    if (existingPlp._count.samplingTests > 0) {
      throw createError({
        statusCode: 409, // Conflict
        statusMessage: `Невозможно удалить ПЛП, так как он используется в ${existingPlp._count.samplingTests} актах отбора проб`,
      });
    }

    await prisma.plp.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'ПЛП успешно удален',
    };

  } catch (error: any) {
    console.error('Ошибка при удалении ПЛП:', error);
    
    if (error.statusCode) throw error;
    
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Ошибка при удалении ПЛП',
    });
  }
});