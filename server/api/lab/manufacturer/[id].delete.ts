// server/api/lab/manufacturer/[id].delete.ts
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

    // Проверяем существование записи
    const existingManufacturer = await prisma.manufacturer.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            materials: true,
          },
        },
      },
    });

    if (!existingManufacturer) {
      throw createError({
        statusCode: 404,
        statusMessage: `Производитель с ID ${id} не найден`,
      });
    }

    // Проверяем, есть ли связанные материалы
    if (existingManufacturer._count.materials > 0) {
      throw createError({
        statusCode: 409, // Conflict
        statusMessage: `Невозможно удалить производителя, так как он используется в ${existingManufacturer._count.materials} материалах`,
      });
    }

    await prisma.manufacturer.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Производитель успешно удален',
    };

  } catch (error: any) {
    console.error('Ошибка при удалении производителя:', error);
    
    if (error.statusCode) throw error;
    
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Ошибка при удалении производителя',
    });
  }
});