// server/api/lab/test-protocol/[id].delete.ts
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

    // Проверяем существование записи
    const existingProtocol = await prisma.testProtocol.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            samplingTests: true,
          },
        },
      },
    });

    if (!existingProtocol) {
      throw createError({
        statusCode: 404,
        statusMessage: `Протокол с ID ${id} не найден`,
      });
    }

    // Удаление заблокировано!
    // Если нужно разрешить удаление, раскомментируйте код ниже
    // Но сначала нужно проверить связи
    
    // Проверяем, есть ли связанные акты отбора
    if (existingProtocol._count.samplingTests > 0) {
      throw createError({
        statusCode: 409,
        statusMessage: `Невозможно удалить протокол, так как он используется в ${existingProtocol._count.samplingTests} актах отбора проб`,
      });
    }

    // Временно заблокировано
    throw createError({
      statusCode: 403,
      statusMessage: 'Удаление протоколов временно заблокировано',
    });

    // Если нужно разрешить удаление:
    // await prisma.testProtocol.delete({
    //   where: { id },
    // });
    //
    // return {
    //   success: true,
    //   message: 'Протокол успешно удален',
    // };

  } catch (error: any) {
    console.error('Ошибка при удалении протокола:', error);
    
    if (error.statusCode) throw error;
    
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Ошибка при удалении протокола',
    });
  }
});