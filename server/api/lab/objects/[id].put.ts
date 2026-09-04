// server/api/lab/test-object/[id].put.ts
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
        statusMessage: 'Некорректный ID объекта',
      });
    }

    // Проверяем существование записи
    const existingObject = await prisma.testObject.findUnique({
      where: { id },
    });

    if (!existingObject) {
      throw createError({
        statusCode: 404,
        statusMessage: `Объект с ID ${id} не найден`,
      });
    }

    const body = await readBody(event);

    // Валидация
    if (!body.name?.trim()) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Название объекта обязательно для заполнения',
      });
    }

    // Проверка на дубликат (если имя изменилось)
    if (body.name.trim() !== existingObject.name) {
      const duplicate = await prisma.testObject.findUnique({
        where: { name: body.name.trim() },
      });

      if (duplicate) {
        throw createError({
          statusCode: 400,
          statusMessage: `Объект с названием "${body.name}" уже существует`,
        });
      }
    }

    const editorEmail = body.editorEmail || event.context.user?.email || 'system@user';

    const updatedObject = await prisma.testObject.update({
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
      data: updatedObject,
      message: 'Объект успешно обновлен',
    };

  } catch (error: any) {
    console.error('Ошибка при обновлении объекта:', error);
    
    if (error.statusCode) throw error;
    
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Ошибка при обновлении объекта',
    });
  }
});