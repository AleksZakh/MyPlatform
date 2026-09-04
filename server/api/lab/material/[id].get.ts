// server/api/lab/material/[id].get.ts
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

    const material = await prisma.material.findUnique({
      where: { id },
      include: {
        manufacturer: true,
        _count: {
          select: {
            receipts: true,
          },
        },
        receipts: {
          take: 10,
          select: {
            id: true,
            qualDate: true,
            qualDocNumber: true,
          },
        },
      },
    });

    if (!material) {
      throw createError({
        statusCode: 404,
        statusMessage: `Материал с ID ${id} не найден`,
      });
    }

    return {
      success: true,
      data: material,
    };

  } catch (error: any) {
    console.error('Ошибка при получении материала:', error);
    
    if (error.statusCode) throw error;
    
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Ошибка при получении материала',
    });
  }
});