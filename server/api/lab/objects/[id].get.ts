// server/api/lab/test-object/[id].get.ts
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

    const object = await prisma.testObject.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            locations: true,
          },
        },
        locations: {
          take: 10,
          select: {
            id: true,
            name: true,
            note: true,
          },
        },
      },
    });

    if (!object) {
      throw createError({
        statusCode: 404,
        statusMessage: `Объект с ID ${id} не найден`,
      });
    }

    return {
      success: true,
      data: object,
    };

  } catch (error: any) {
    console.error('Ошибка при получении объекта:', error);
    
    if (error.statusCode) throw error;
    
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Ошибка при получении объекта',
    });
  }
});