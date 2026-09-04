// server/api/lab/material/[id].put.ts
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
        statusMessage: 'Некорректный ID материала',
      });
    }

    // Проверяем существование записи
    const existingMaterial = await prisma.material.findUnique({
      where: { id },
    });

    if (!existingMaterial) {
      throw createError({
        statusCode: 404,
        statusMessage: `Материал с ID ${id} не найден`,
      });
    }

    const body = await readBody(event);

    // Валидация
    if (!body.name?.trim()) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Название материала обязательно для заполнения',
      });
    }

    // Проверка на дубликат (если имя изменилось)
    if (body.name.trim() !== existingMaterial.name) {
      const duplicate = await prisma.material.findUnique({
        where: { name: body.name.trim() },
      });

      if (duplicate) {
        throw createError({
          statusCode: 400,
          statusMessage: `Материал с названием "${body.name}" уже существует`,
        });
      }
    }

    // Проверяем, существует ли производитель
    if (body.manufacturerId) {
      const manufacturer = await prisma.manufacturer.findUnique({
        where: { id: body.manufacturerId },
      });
      if (!manufacturer) {
        throw createError({
          statusCode: 400,
          statusMessage: `Производитель с ID ${body.manufacturerId} не найден`,
        });
      }
    }

    const editorEmail = body.editorEmail || event.context.user?.email || 'system@user';

    const updatedMaterial = await prisma.material.update({
      where: { id },
      data: {
        name: body.name.trim(),
        manufacturerId: body.manufacturerId || null,
        note: body.note || null,
        editorEmail: editorEmail,
        editedAt: new Date(),
      },
    });

    return {
      success: true,
      data: updatedMaterial,
      message: 'Материал успешно обновлен',
    };

  } catch (error: any) {
    console.error('Ошибка при обновлении материала:', error);
    
    if (error.statusCode) throw error;
    
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Ошибка при обновлении материала',
    });
  }
});