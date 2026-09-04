// server/api/lab/material/[id].delete.ts
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
        statusMessage: 'Некорректный ID материала',
      });
    }

    // Проверяем существование записи
    const existingMaterial = await prisma.material.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            receipts: true,
          },
        },
      },
    });

    if (!existingMaterial) {
      throw createError({
        statusCode: 404,
        statusMessage: `Материал с ID ${id} не найден`,
      });
    }

    // Проверяем, есть ли связанные поступления
    if (existingMaterial._count.receipts > 0) {
      throw createError({
        statusCode: 409,
        statusMessage: `Невозможно удалить материал, так как он используется в ${existingMaterial._count.receipts} поступлениях`,
      });
    }

    await prisma.material.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Материал успешно удален',
    };

  } catch (error: any) {
    console.error('Ошибка при удалении материала:', error);
    
    if (error.statusCode) throw error;
    
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Ошибка при удалении материала',
    });
  }
});