// server/api/lab/test-protocol/[id].get.ts
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
        statusMessage: 'Некорректный ID протокола',
      });
    }

    const protocol = await prisma.testProtocol.findUnique({
      where: { id },
      include: {
        receiptMaterial: {
          include: {
            material: {
              include: {
                manufacturer: true,
              },
            },
          },
        },
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
        _count: {
          select: {
            samplingTests: true,
          },
        },
      },
    });

    if (!protocol) {
      throw createError({
        statusCode: 404,
        statusMessage: `Протокол с ID ${id} не найден`,
      });
    }

    return {
      success: true,
      data: protocol,
    };

  } catch (error: any) {
    console.error('Ошибка при получении протокола:', error);
    
    if (error.statusCode) throw error;
    
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Ошибка при получении протокола',
    });
  }
});