// server/api/lab/plp/index.post.ts - СОЗДАНИЕ НОВОЙ ЗАПИСИ
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
        statusMessage: 'Название ПЛП обязательно для заполнения',
      });
    }

    // Проверка на дубликат
    const existing = await prisma.plp.findUnique({
      where: { name: body.name.trim() },
    });

    if (existing) {
      throw createError({
        statusCode: 400,
        statusMessage: `ПЛП с названием "${body.name}" уже существует`,
      });
    }

    // Получаем email автора из сессии или из тела запроса
    const authorEmail = body.authorEmail || event.context.user?.email || 'system@user';

    const newPlp = await prisma.plp.create({
      data: {
        name: body.name.trim(),
        note: body.note || null,
        authorEmail: authorEmail,
        createdAt: new Date(),
      },
    });

    return {
      success: true,
      data: newPlp,
      message: 'ПЛП успешно создан',
    };

  } catch (error: any) {
    console.error('Ошибка при создании ПЛП:', error);
    
    if (error.statusCode) throw error;
    
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Ошибка при создании ПЛП',
    });
  }
});