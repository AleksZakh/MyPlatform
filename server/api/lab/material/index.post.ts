// server/api/lab/material/index.post.ts
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
        statusMessage: 'Название материала обязательно для заполнения',
      });
    }

    // Проверка на дубликат
    const existing = await prisma.material.findUnique({
      where: { name: body.name.trim() },
    });

    if (existing) {
      throw createError({
        statusCode: 400,
        statusMessage: `Материал с названием "${body.name}" уже существует`,
      });
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

    const authorEmail = body.authorEmail || event.context.user?.email || 'system@user';

    const newMaterial = await prisma.material.create({
      data: {
        name: body.name.trim(),
        manufacturerId: body.manufacturerId || null,
        note: body.note || null,
        authorEmail: authorEmail,
        createdAt: new Date(),
      },
    });

    return {
      success: true,
      data: newMaterial,
      message: 'Материал успешно создан',
    };

  } catch (error: any) {
    console.error('Ошибка при создании материала:', error);
    
    if (error.statusCode) throw error;
    
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Ошибка при создании материала',
    });
  }
});