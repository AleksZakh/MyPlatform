// server/api/lab/filter-template/[id].put.ts
import { PrismaClient } from '@prisma/client';
import { defineEventHandler, getRouterParam, readBody } from 'h3';
import { computeChangedFields, getActorEmail, getRequestMeta } from '~~/server/utils/auditLog';

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  try {
    const id = parseInt(getRouterParam(event, 'id') || '');
    if (isNaN(id) || id <= 0) {
      throw createError({ statusCode: 400, statusMessage: 'Некорректный ID' });
    }

    const body = await readBody(event);
    const currentUserEmail = getActorEmail(event);
    const requestMeta = getRequestMeta(event);

    // ========================================
    // ЗАГРУЗКА СОСТОЯНИЯ "ДО"
    // ========================================
    const before = await prisma.filterTemplate.findUnique({ where: { id } });
    if (!before || before.deletedAt) {
      throw createError({ statusCode: 404, statusMessage: 'Шаблон не найден' });
    }

    // Проверка прав: только автор или админ
    // (роли реализуем позже, сейчас — только автор)
    if (before.authorEmail !== currentUserEmail) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Вы можете редактировать только свои шаблоны',
      });
    }

    // ========================================
    // ВАЛИДАЦИЯ
    // ========================================
    if (body.name !== undefined && !body.name?.trim()) {
      throw createError({ statusCode: 400, statusMessage: 'Название не может быть пустым' });
    }

    // Проверка уникальности имени (если изменилось)
    if (body.name && body.name.trim() !== before.name) {
      const duplicate = await prisma.filterTemplate.findFirst({
        where: {
          authorEmail: currentUserEmail,
          name: body.name.trim(),
          deletedAt: null,
          id: { not: id },
        },
      });
      if (duplicate) {
        throw createError({
          statusCode: 400,
          statusMessage: `Шаблон с названием "${body.name}" уже существует`,
        });
      }
    }

    // ========================================
    // ТРАНЗАКЦИЯ
    // ========================================
    const result = await prisma.$transaction(async (tx) => {
      // Если устанавливается isDefault = true — снимаем флаг с остальных
      if (body.isDefault === true) {
        await tx.filterTemplate.updateMany({
          where: {
            authorEmail: currentUserEmail,
            isDefault: true,
            deletedAt: null,
            id: { not: id },
          },
          data: { isDefault: false },
        });
      }

      // Обновляем
      const updated = await tx.filterTemplate.update({
        where: { id },
        data: {
          name: body.name?.trim() ?? undefined,
          filters: body.filters ?? undefined,
          isDefault: body.isDefault ?? undefined,
          editorEmail: currentUserEmail,
          editedAt: new Date(),
        },
      });

      // Логируем
      const changedFields = computeChangedFields(before as any, updated as any);
      if (changedFields.length > 0) {
        await tx.auditLog.create({
          data: {
            entityType: 'FilterTemplate',
            entityId: id,
            action: 'UPDATE',
            actorEmail: currentUserEmail,
            note: `Изменён шаблон фильтра "${updated.name}". Поля: ${changedFields.join(', ')}`,
            beforeData: before as any,
            afterData: updated as any,
            changedFields,
            ipAddress: requestMeta.ipAddress ?? null,
            userAgent: requestMeta.userAgent ?? null,
          },
        });
      }

      return updated;
    });

    return {
      success: true,
      data: result,
      message: 'Шаблон успешно обновлён',
    };

  } catch (error: any) {
    console.error('Ошибка при обновлении шаблона:', error);
    if (error.statusCode) throw error;
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Ошибка при обновлении шаблона',
    });
  }
});