// Установить как server/api/lab/plp/all.get.ts
import { AccessAction } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { createError, defineEventHandler, getQuery, isError } from 'h3';

import { prisma } from '~~/server/utils/prisma';
import { requirePermission } from '~~/server/services/access-control.service';

const RESOURCE_KEY = 'lab.plps';

export default defineEventHandler(async (event) => {
  // Отказ в доступе не превращаем в ошибку загрузки (500).
  await requirePermission(event, RESOURCE_KEY, AccessAction.VIEW);

  try {
    const query = getQuery(event);
    const search = typeof query.search === 'string' ? query.search.trim() : '';
    const sortOrder: Prisma.SortOrder = query.sortOrder === 'desc' ? 'desc' : 'asc';

    // Списки выбора содержат только действующие ПЛП.
    // query не может отменить этот фильтр.
    const where: Prisma.PlpWhereInput = { deletedAt: null };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { note: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Те же разрешённые поля сортировки, что в index.get.ts.
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

    const orderBy: Prisma.PlpOrderByWithRelationInput[] = [primaryOrder];
    if (query.sortKey !== 'id') orderBy.push({ id: 'asc' });

    // Без skip/take: возвращаем ВСЕ действующие элементы,
    // соответствующие поиску, а не только одну страницу.
    const plps = await prisma.plp.findMany({
      where,
      orderBy,
      select: {
        id: true,
        name: true,
        note: true,
      },
    });

    // Прежний контракт ответа для выпадающих списков.
    return {
      success: true,
      data: plps,
      total: plps.length,
    };
  } catch (error: unknown) {
    if (isError(error)) throw error;

    console.error('[lab/plp ALL GET] Ошибка получения списка ПЛП:', error);
    const message = 'Не удалось загрузить список ПЛП. Повторите попытку.';
    throw createError({
      statusCode: 500,
      statusMessage: 'PLP options loading failed',
      message,
      data: { code: 'PLP_OPTIONS_FAILED', message },
    });
  }
});
