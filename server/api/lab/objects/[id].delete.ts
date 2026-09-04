// server/api/lab/test-object/[id].delete.ts
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
        statusMessage: 'Некорректный ID объекта',
      });
    }

    // Проверяем существование записи
    const existingObject = await prisma.testObject.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            locations: true,
          },
        },
      },
    });

    if (!existingObject) {
      throw createError({
        statusCode: 404,
        statusMessage: `Объект с ID ${id} не найден`,
      });
    }

    // Проверяем, есть ли связанные места отбора
    if (existingObject._count.locations > 0) {
      throw createError({
        statusCode: 409,
        statusMessage: `Невозможно удалить объект, так как он содержит ${existingObject._count.locations} мест отбора проб`,
      });
    }

    await prisma.testObject.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Объект успешно удален',
    };

  } catch (error: any) {
    console.error('Ошибка при удалении объекта:', error);
    
    if (error.statusCode) throw error;
    
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Ошибка при удалении объекта',
    });
  }
});