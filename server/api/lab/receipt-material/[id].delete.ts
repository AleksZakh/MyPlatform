// server/api/lab/receipt-material/[id].delete.ts
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

    // Проверяем существование записи
    const existingReceipt = await prisma.receiptMaterial.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            testProtocols: true,
          },
        },
      },
    });

    if (!existingReceipt) {
      throw createError({
        statusCode: 404,
        statusMessage: `Поступление с ID ${id} не найдено`,
      });
    }

    // Проверяем, есть ли связанные протоколы
    if (existingReceipt._count.testProtocols > 0) {
      throw createError({
        statusCode: 409,
        statusMessage: `Невозможно удалить поступление, так как оно используется в ${existingReceipt._count.testProtocols} протоколах испытаний`,
      });
    }

    // Временно заблокировано
    throw createError({
      statusCode: 403,
      statusMessage: 'Удаление поступлений временно заблокировано',
    });

    // Если нужно разрешить удаление:
    // await prisma.receiptMaterial.delete({
    //   where: { id },
    // });
    //
    // return {
    //   success: true,
    //   message: 'Поступление успешно удалено',
    // };

  } catch (error: any) {
    console.error('Ошибка при удалении поступления:', error);
    
    if (error.statusCode) throw error;
    
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Ошибка при удалении поступления',
    });
  }
});