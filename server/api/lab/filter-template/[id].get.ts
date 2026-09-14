// server/api/lab/filter-template/[id].get.ts
import { PrismaClient } from '@prisma/client';
import { defineEventHandler, getRouterParam } from 'h3';

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  try {
    const id = parseInt(getRouterParam(event, 'id') || '');
    if (isNaN(id) || id <= 0) {
      throw createError({ statusCode: 400, statusMessage: 'Некорректный ID' });
    }

    const template = await prisma.filterTemplate.findUnique({
      where: { id },
    });

    if (!template || template.deletedAt) {
      throw createError({ statusCode: 404, statusMessage: 'Шаблон не найден' });
    }

    return { success: true, data: template };

  } catch (error: any) {
    if (error.statusCode) throw error;
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Ошибка при получении шаблона',
    });
  }
});