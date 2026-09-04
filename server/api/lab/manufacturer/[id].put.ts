// server/api/lab/manufacturer/[id].put.ts
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
        statusMessage: 'Некорректный ID производителя',
      });
    }

    // Проверяем существование записи
    const existingManufacturer = await prisma.manufacturer.findUnique({
      where: { id },
    });

    if (!existingManufacturer) {
      throw createError({
        statusCode: 404,
        statusMessage: `Производитель с ID ${id} не найден`,
      });
    }

    const body = await readBody(event);

    // Валидация
    if (!body.name?.trim()) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Название производителя обязательно для заполнения',
      });
    }

    // Проверка на дубликат (если имя изменилось)
    if (body.name.trim() !== existingManufacturer.name) {
      const duplicate = await prisma.manufacturer.findUnique({
        where: { name: body.name.trim() },
      });

      if (duplicate) {
        throw createError({
          statusCode: 400,
          statusMessage: `Производитель с названием "${body.name}" уже существует`,
        });
      }
    }

    // Получаем email редактора
    const editorEmail = body.editorEmail || event.context.user?.email || 'system@user';

    const updatedManufacturer = await prisma.manufacturer.update({
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
      data: updatedManufacturer,
      message: 'Производитель успешно обновлен',
    };

  } catch (error: any) {
    console.error('Ошибка при обновлении производителя:', error);
    
    if (error.statusCode) throw error;
    
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Ошибка при обновлении производителя',
    });
  }
});