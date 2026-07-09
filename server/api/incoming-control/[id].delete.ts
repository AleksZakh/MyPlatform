// server/api/incoming-control/[id].delete.ts
import { PrismaClient } from '@prisma/client';
import { defineEventHandler, getRouterParams } from 'h3';

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  try {
    // Получаем ID из параметров маршрута
    const params = getRouterParams(event);
    const id = parseInt(params.id as string, 10);
    console.log(`🗑️ Запрос на удаление записи с ID: `, params);

    // Проверяем, что ID корректен
    if (isNaN(id) || id <= 0) {
      return {
        success: false,
        error: 'Неверный ID записи',
      };
    }

    console.log(`🗑️ Запрос на удаление записи с ID: ${id}`);

    // Проверяем, существует ли запись
    const existingRecord = await prisma.aEng.findUnique({
      where: { id: id },
    });

    if (!existingRecord) {
      return {
        success: false,
        error: `Запись с ID ${id} не найдена`,
      };
    }

    // Удаляем запись
    const deletedRecord = await prisma.aEng.delete({
      where: { id: id },
    });

    console.log(`✅ Удалена запись с ID: ${id}`);

    return {
      success: true,
      message: `Запись с ID ${id} успешно удалена`,
      data: deletedRecord,
    };
  } catch (error: any) {
    console.error('❌ Ошибка при удалении записи:', error);

    // Обработка специфических ошибок Prisma
    if (error.code === 'P2025') {
      return {
        success: false,
        error: 'Запись не найдена',
      };
    }

    return {
      success: false,
      error: error.message || 'Ошибка при удалении записи',
    };
  }
});
