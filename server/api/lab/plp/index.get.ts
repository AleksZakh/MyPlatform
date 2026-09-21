// Установить как server/api/lab/plp/index.get.ts
import { AccessAction } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { createError, defineEventHandler, getQuery, isError } from 'h3';

import { prisma } from '~~/server/utils/prisma';
import { requirePermission } from '~~/server/services/access-control.service';

const RESOURCE_KEY = 'lab.plps';
const MAX_PAGE_SIZE = 100;
const MAX_DATABASE_INT = 2_147_483_647;

function positiveInteger(value: unknown, fallback: number): number {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return fallback;

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export default defineEventHandler(async (event) => {
  await requirePermission(event, RESOURCE_KEY, AccessAction.VIEW);

  try {
    const query = getQuery(event);
    const page = positiveInteger(query.page, 1);
    const pageSize = Math.min(MAX_PAGE_SIZE, positiveInteger(query.pageSize, 10));
    const skip = (page - 1) * pageSize;

    if (!Number.isSafeInteger(skip) || skip > MAX_DATABASE_INT) {
      const message = 'Указан слишком большой номер страницы.';
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid page',
        message,
        data: { code: 'INVALID_PAGE', message },
      });
    }

    const search = typeof query.search === 'string' ? query.search.trim() : '';
    const sortOrder: Prisma.SortOrder = query.sortOrder === 'desc' ? 'desc' : 'asc';

    // Один фильтр для списка и total. Удалённые ПЛП в выдачу не попадают.
    // Явный тип сохраняет корректный тип mode: 'insensitive'.
    const where: Prisma.PlpWhereInput = { deletedAt: null };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { note: { contains: search, mode: 'insensitive' } },
      ];
    }

    // В сортировку пропускаем только известные скалярные поля.
    let primaryOrder: Prisma.PlpOrderByWithRelationInput;
    switch (query.sortKey) {
      case 'id': primaryOrder = { id: sortOrder }; break;
      case 'note': primaryOrder = { note: sortOrder }; break;
      case 'createdAt': primaryOrder = { createdAt: sortOrder }; break;
      case 'editedAt': primaryOrder = { editedAt: sortOrder }; break;
      case 'authorEmail': primaryOrder = { authorEmail: sortOrder }; break;
      case 'editorEmail': primaryOrder = { editorEmail: sortOrder }; break;
      default: primaryOrder = { name: sortOrder };
    }

    // При одинаковых значениях основного поля порядок определяет id.
    const orderBy: Prisma.PlpOrderByWithRelationInput[] = [primaryOrder];
    if (query.sortKey !== 'id') orderBy.push({ id: 'asc' });

    const [data, total] = await Promise.all([
      prisma.plp.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        include: {
          _count: {
            select: {
              // Мягко удалённые записи Реестра использованием не считаем.
              samplingTests: { where: { deletedAt: null } },
            },
          },
        },
      }),
      prisma.plp.count({ where }),
    ]);

    // Прежний контракт ответа: форма таблицы не требует изменения.
    return { success: true, data, total, page, pageSize };
  } catch (error: unknown) {
    if (isError(error)) throw error;

    console.error('[lab/plp GET] Ошибка получения списка ПЛП:', error);
    const message = 'Не удалось загрузить список ПЛП. Повторите попытку.';
    throw createError({
      statusCode: 500,
      statusMessage: 'PLP list loading failed',
      message,
      data: { code: 'PLP_LIST_FAILED', message },
    });
  }
});
