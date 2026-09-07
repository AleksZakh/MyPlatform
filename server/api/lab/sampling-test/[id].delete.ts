// server/api/lab/sampling-test/[id].delete.ts
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

    // Проверяем существование записи
    const existingSamplingTest = await prisma.samplingTest.findUnique({
      where: { id },
    });

    if (!existingSamplingTest) {
      throw createError({
        statusCode: 404,
        statusMessage: `Акт отбора с ID ${id} не найден`,
      });
    }

    // Временно заблокировано
    throw createError({
      statusCode: 403,
      statusMessage: 'Удаление актов отбора временно заблокировано',
    });

    // Если нужно разрешить удаление:
    // await prisma.samplingTest.delete({
    //   where: { id },
    // });
    //
    // return {
    //   success: true,
    //   message: 'Акт отбора успешно удален',
    // };

  } catch (error: any) {
    console.error('Ошибка при удалении акта отбора:', error);
    
    if (error.statusCode) throw error;
    
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Ошибка при удалении акта отбора',
    });
  }
});