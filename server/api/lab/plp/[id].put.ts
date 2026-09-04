// server/api/lab/plp/[id].put.ts - ОБНОВЛЕНИЕ ЗАПИСИ
import { PrismaClient } from '@prisma/client';
import { defineEventHandler, getRouterParam, readBody } from 'h3';

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  try {
    const idParam = getRouterParam(event, 'id');
    const id = parseInt(idParam || '', 10);

    if (isNaN(id) || id <= 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Некорректный ID ПЛП',
      });
    }

    // Проверяем существование записи
    const existingPlp = await prisma.plp.findUnique({
      where: { id },
    });

    if (!existingPlp) {
      throw createError({
        statusCode: 404,
        statusMessage: `ПЛП с ID ${id} не найден`,
      });
    }

    const body = await readBody(event);

    // Валидация
    if (!body.name?.trim()) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Название ПЛП обязательно для заполнения',
      });
    }

    // Проверка на дубликат (если имя изменилось)
    if (body.name.trim() !== existingPlp.name) {
      const duplicate = await prisma.plp.findUnique({
        where: { name: body.name.trim() },
      });

      if (duplicate) {
        throw createError({
          statusCode: 400,
          statusMessage: `ПЛП с названием "${body.name}" уже существует`,
        });
      }
    }

    // Получаем email редактора из сессии или из тела запроса
    const editorEmail = body.editorEmail || event.context.user?.email || 'system@user';

    const updatedPlp = await prisma.plp.update({
      where: { id },
      data: {
        name: body.name.trim(),
        note: body.note || null,
        editorEmail: editorEmail,
        editedAt: new Date(),
      },
    });

    return {
      success: true,
      data: updatedPlp,
      message: 'ПЛП успешно обновлен',
    };

  } catch (error: any) {
    console.error('Ошибка при обновлении ПЛП:', error);
    
    if (error.statusCode) throw error;
    
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Ошибка при обновлении ПЛП',
    });
  }
});