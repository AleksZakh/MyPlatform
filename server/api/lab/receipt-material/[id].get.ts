// server/api/lab/receipt-material/[id].get.ts
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
        statusMessage: 'Некорректный ID поступления',
      });
    }

    const receipt = await prisma.receiptMaterial.findUnique({
      where: { id },
      include: {
        material: {
          include: {
            manufacturer: true,
          },
        },
        testProtocols: {
          include: {
            samplingTests: {
              include: {
                plp: true,
                inspector: true,
                testLocation: {
                  include: {
                    testObject: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            testProtocols: true,
          },
        },
      },
    });

    if (!receipt) {
      throw createError({
        statusCode: 404,
        statusMessage: `Поступление с ID ${id} не найдено`,
      });
    }

    return {
      success: true,
      data: receipt,
    };

  } catch (error: any) {
    console.error('Ошибка при получении поступления:', error);
    
    if (error.statusCode) throw error;
    
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Ошибка при получении поступления',
    });
  }
});