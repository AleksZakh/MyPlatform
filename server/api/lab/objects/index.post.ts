// server/api/lab/test-object/index.post.ts
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
        statusMessage: 'Название объекта обязательно для заполнения',
      });
    }

    // Проверка на дубликат
    const existing = await prisma.testObject.findUnique({
      where: { name: body.name.trim() },
    });

    if (existing) {
      throw createError({
        statusCode: 400,
        statusMessage: `Объект с названием "${body.name}" уже существует`,
      });
    }

    const authorEmail = body.authorEmail || event.context.user?.email || 'system@user';

    const newObject = await prisma.testObject.create({
      data: {
        name: body.name.trim(),
        note: body.note || null,
        authorEmail: authorEmail,
        createdAt: new Date(),
      },
    });

    return {
      success: true,
      data: newObject,
      message: 'Объект успешно создан',
    };

  } catch (error: any) {
    console.error('Ошибка при создании объекта:', error);
    
    if (error.statusCode) throw error;
    
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Ошибка при создании объекта',
    });
  }
});