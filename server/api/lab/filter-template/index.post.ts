// server/api/lab/filter-template/index.post.ts
import { PrismaClient } from '@prisma/client';
import { defineEventHandler, readBody } from 'h3';
import { logAudit, getActorEmail, getRequestMeta } from '~~/server/utils/auditLog';

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const currentUserEmail = getActorEmail(event);
    const requestMeta = getRequestMeta(event);

    // ========================================
    // ВАЛИДАЦИЯ
    // ========================================
    if (!body.name?.trim()) {
      throw createError({ statusCode: 400, statusMessage: 'Название шаблона обязательно' });
    }

    if (!body.filters || typeof body.filters !== 'object') {
      throw createError({ statusCode: 400, statusMessage: 'Фильтры не переданы или некорректны' });
    }

    // ========================================
    // ПРОВЕРКА УНИКАЛЬНОСТИ ИМЕНИ
    // ========================================
    const existing = await prisma.filterTemplate.findFirst({
      where: {
        authorEmail: currentUserEmail,
        name: body.name.trim(),
        deletedAt: null,
      },
    });

    if (existing) {
      throw createError({
        statusCode: 400,
        statusMessage: `Шаблон с названием "${body.name}" уже существует`,
      });
    }

    // ========================================
    // ТРАНЗАКЦИЯ
    // ========================================
    const result = await prisma.$transaction(async (tx) => {
      // Если шаблон помечен как дефолтный — снимаем флаг со всех остальных
      if (body.isDefault === true) {
        await tx.filterTemplate.updateMany({
          where: {
            authorEmail: currentUserEmail,
            isDefault: true,
            deletedAt: null,
          },
          data: { isDefault: false },
        });
      }

      // Создаём шаблон
      const template = await tx.filterTemplate.create({
        data: {
          timestamp: BigInt(Date.now()),
          name: body.name.trim(),
          authorEmail: currentUserEmail,
          filters: body.filters,
          isDefault: body.isDefault === true,
          editorEmail: currentUserEmail,
        },
      });

      // Логируем создание
      await tx.auditLog.create({
        data: {
          entityType: 'FilterTemplate',
          entityId: template.id,
          action: 'CREATE',
          actorEmail: currentUserEmail,
          note: `Создан шаблон фильтра "${template.name}"`,
          afterData: template as any,
          ipAddress: requestMeta.ipAddress ?? null,
          userAgent: requestMeta.userAgent ?? null,
        },
      });

      return template;
      
    },
    {
      timeout: 15000, // ✅ вот сюда — во второй аргумент
    }
  
  );
    

    return {
      success: true,
      data: result,
      message: 'Шаблон успешно создан',
    };

  } catch (error: any) {
    console.error('Ошибка при создании шаблона:', error);
    if (error.statusCode) throw error;
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Ошибка при создании шаблона',
    });
  }
});