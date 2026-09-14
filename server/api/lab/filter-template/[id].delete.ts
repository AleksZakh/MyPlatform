// server/api/lab/filter-template/[id].delete.ts
import { PrismaClient } from '@prisma/client';
import { defineEventHandler, getRouterParam } from 'h3';
import { getActorEmail, getRequestMeta } from '~~/server/utils/auditLog';

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  try {
    const id = parseInt(getRouterParam(event, 'id') || '');
    if (isNaN(id) || id <= 0) {
      throw createError({ statusCode: 400, statusMessage: 'Некорректный ID' });
    }

    const currentUserEmail = getActorEmail(event);
    const requestMeta = getRequestMeta(event);

    // Загружаем "до"
    const before = await prisma.filterTemplate.findUnique({ where: { id } });
    if (!before || before.deletedAt) {
      throw createError({ statusCode: 404, statusMessage: 'Шаблон не найден' });
    }

    // Проверка прав
    if (before.authorEmail !== currentUserEmail) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Вы можете удалять только свои шаблоны',
      });
    }

    // Транзакция: мягкое удаление + лог
    const result = await prisma.$transaction(async (tx) => {
      const deleted = await tx.filterTemplate.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          deletedBy: currentUserEmail,
          isDefault: false, // если был дефолтным — снимаем флаг
        },
      });

      await tx.auditLog.create({
        data: {
          entityType: 'FilterTemplate',
          entityId: id,
          action: 'DELETE',
          actorEmail: currentUserEmail,
          note: `Удалён шаблон фильтра "${before.name}"`,
          beforeData: before as any,
          ipAddress: requestMeta.ipAddress ?? null,
          userAgent: requestMeta.userAgent ?? null,
        },
      });

      return deleted;
    });

    return {
      success: true,
      message: 'Шаблон успешно удалён',
    };

  } catch (error: any) {
    console.error('Ошибка при удалении шаблона:', error);
    if (error.statusCode) throw error;
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Ошибка при удалении шаблона',
    });
  }
});