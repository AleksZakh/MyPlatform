// server/api/lab/filter-template/index.get.ts
import { PrismaClient } from '@prisma/client';
import { defineEventHandler, getQuery } from 'h3';
import { getActorEmail } from '~~/server/utils/auditLog';

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const onlyMine = query.onlyMine === 'true'; // флаг "Только мои"
    const currentUserEmail = getActorEmail(event);

    // Формируем условия фильтрации
    const where: any = {
      deletedAt: null, // ← не показываем удалённые
    };

    // Если пользователь включил "Только мои" — фильтруем по автору
    if (onlyMine && currentUserEmail) {
      where.authorEmail = currentUserEmail;
    }

    const templates = await prisma.filterTemplate.findMany({
      where,
      orderBy: [
        { isDefault: 'desc' },  // дефолтные наверху
        { timestamp: 'desc' },  // потом по дате создания
      ],
    });

    return {
      success: true,
      data: templates,
      total: templates.length,
    };

  } catch (error: any) {
    console.error('Ошибка при получении шаблонов фильтров:', error);
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Ошибка при получении шаблонов',
    });
  }
});