// server/api/lab/test-location/index.post.ts
import { PrismaClient } from '@prisma/client';
import { defineEventHandler, readBody } from 'h3';

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    
    // Валидация
    if (!body.name?.trim()) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Название места отбора обязательно для заполнения',
      });
    }

    if (!body.testObjectId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Необходимо указать объект',
      });
    }

    // Проверяем существование объекта
    const object = await prisma.testObject.findUnique({
      where: { id: body.testObjectId },
    });

    if (!object) {
      throw createError({
        statusCode: 404,
        statusMessage: `Объект с ID ${body.testObjectId} не найден`,
      });
    }

    // Проверка на дубликат (уникальная пара объект + место)
    const existing = await prisma.testLocation.findUnique({
      where: {
        testObjectId_name: {
          testObjectId: body.testObjectId,
          name: body.name.trim(),
        },
      },
    });

    if (existing) {
      throw createError({
        statusCode: 400,
        statusMessage: `Место "${body.name}" уже существует для этого объекта`,
      });
    }

    const authorEmail = body.authorEmail || event.context.user?.email || 'system@user';

    const newLocation = await prisma.testLocation.create({
      data: {
        name: body.name.trim(),
        note: body.note || null,
        testObjectId: body.testObjectId,
        authorEmail: authorEmail,
        createdAt: new Date(),
      },
    });

    return {
      success: true,
      data: newLocation,
      message: 'Место отбора успешно создано',
    };

  } catch (error: any) {
    console.error('Ошибка при создании места отбора:', error);
    
    if (error.statusCode) throw error;
    
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Ошибка при создании места отбора',
    });
  }
});