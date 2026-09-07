// server/api/lab/sampling-test/[id].get.ts
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
        statusMessage: 'Некорректный ID акта отбора',
      });
    }

    const samplingTest = await prisma.samplingTest.findUnique({
      where: { id },
      include: {
        plp: true,
        inspector: true,
        testLocation: {
          include: {
            testObject: true,
          },
        },
        testProtocol: {
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
          },
        },
        receiptMaterial: {
          include: {
            material: {
              include: {
                manufacturer: true,
              },
            },
          },
        },
      },
    });

    if (!samplingTest) {
      throw createError({
        statusCode: 404,
        statusMessage: `Акт отбора с ID ${id} не найден`,
      });
    }

    return {
      success: true,
      data: samplingTest,
    };

  } catch (error: any) {
    console.error('Ошибка при получении акта отбора:', error);
    
    if (error.statusCode) throw error;
    
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Ошибка при получении акта отбора',
    });
  }
});