// server/api/lab/test-location/[id].put.ts
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
        statusMessage: 'Некорректный ID места отбора',
      });
    }

    // Проверяем существование записи
    const existingLocation = await prisma.testLocation.findUnique({
      where: { id },
    });

    if (!existingLocation) {
      throw createError({
        statusCode: 404,
        statusMessage: `Место отбора с ID ${id} не найдено`,
      });
    }

    const body = await readBody(event);

    // Валидация
    if (!body.name?.trim()) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Название места отбора обязательно для заполнения',
      });
    }

    // Проверка на дубликат (если имя или объект изменились)
    if (body.name.trim() !== existingLocation.name || 
        (body.testObjectId && body.testObjectId !== existingLocation.testObjectId)) {
      
      const objectId = body.testObjectId || existingLocation.testObjectId;
      
      const duplicate = await prisma.testLocation.findUnique({
        where: {
          testObjectId_name: {
            testObjectId: objectId,
            name: body.name.trim(),
          },
        },
      });

      if (duplicate && duplicate.id !== id) {
        throw createError({
          statusCode: 400,
          statusMessage: `Место "${body.name}" уже существует для этого объекта`,
        });
      }
    }

    const editorEmail = body.editorEmail || event.context.user?.email || 'system@user';

    const updatedLocation = await prisma.testLocation.update({
      where: { id },
      data: {
        name: body.name.trim(),
        note: body.note || null,
        testObjectId: body.testObjectId || existingLocation.testObjectId,
        editorEmail: editorEmail,
        editedAt: new Date(),
      },
    });

    return {
      success: true,
      data: updatedLocation,
      message: 'Место отбора успешно обновлено',
    };

  } catch (error: any) {
    console.error('Ошибка при обновлении места отбора:', error);
    
    if (error.statusCode) throw error;
    
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Ошибка при обновлении места отбора',
    });
  }
});