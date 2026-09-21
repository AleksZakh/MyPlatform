// Установить как server/api/lab/material/index.get.ts
import { AccessAction } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { createError, defineEventHandler, getQuery, isError } from 'h3';

import { prisma } from '~~/server/utils/prisma';
import { requirePermission } from '~~/server/services/access-control.service';

const RESOURCE_KEY = 'lab.materials';
const MAX_PAGE_SIZE = 100;
const MAX_DATABASE_INT = 2_147_483_647;

/**
 * Тот же критерий использования, что в обновлённом [id].delete.ts.
 * - Действующий Реестр считается использованием даже при несогласованном
 *   deletedAt поступления.
 * - Удалённый Реестр не считается использованием.
 * - Отдельное действующее поступление без Реестра считается использованием.
 */
const blockingReceiptWhere: Prisma.ReceiptMaterialWhereInput = {
  OR: [
    { samplingTest: { is: { deletedAt: null } } },
    { deletedAt: null, samplingTest: { is: null } },
  ],
};

function positiveInteger(value: unknown, fallback: number): number {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return fallback;

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export default defineEventHandler(async (event) => {
  // Отказ в доступе не подменяем ошибкой загрузки данных.
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
        statusMessage: 'INVALID_PAGE',
        message,
        data: { code: 'INVALID_PAGE', message },
      });
    }

    const search = typeof query.search === 'string' ? query.search.trim() : '';
    const sortOrder: Prisma.SortOrder = query.sortOrder === 'desc' ? 'desc' : 'asc';

    if (search.includes('\u0000')) {
      const message = 'Поисковая строка содержит недопустимый символ.';
      throw createError({
        statusCode: 400,
        statusMessage: 'INVALID_MATERIAL_SEARCH',
        message,
        data: { code: 'INVALID_MATERIAL_SEARCH', message },
      });
    }

    // Этот фильтр используется и для страницы, и для общего количества.
    const where: Prisma.MaterialWhereInput = { deletedAt: null };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { note: { contains: search, mode: 'insensitive' } },
        {
          // Производитель относится к поступлению, а не к виду материала.
          // Сохраняем поиск по изготовителю, но только через учитываемые
          // действующие связи. Единственного производителя не выдумываем.
          receipts: {
            some: {
              AND: [
                blockingReceiptWhere,
                { manufacturer: { is: { name: { contains: search, mode: 'insensitive' } } } },
              ],
            },
          },
        },
      ];
    }

    let primaryOrder: Prisma.MaterialOrderByWithRelationInput;
    switch (query.sortKey) {
      case 'id': primaryOrder = { id: sortOrder }; break;
      case 'note': primaryOrder = { note: sortOrder }; break;
      case 'createdAt': primaryOrder = { createdAt: sortOrder }; break;
      case 'editedAt': primaryOrder = { editedAt: sortOrder }; break;
      case 'authorEmail': primaryOrder = { authorEmail: sortOrder }; break;
      case 'editorEmail': primaryOrder = { editorEmail: sortOrder }; break;
      // Старый sortKey=manufacturer, как и неизвестный ключ, получает
      // сортировку по названию материала. У материала нет одного изготовителя.
      default: primaryOrder = { name: sortOrder };
    }

    const orderBy: Prisma.MaterialOrderByWithRelationInput[] = [primaryOrder];
    if (query.sortKey !== 'id') orderBy.push({ id: 'asc' });

    const [data, total] = await Promise.all([
      prisma.material.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        include: {
          _count: {
            select: {
              // Значение показывает число связей, препятствующих удалению,
              // а не все исторические поступления этого материала.
              receipts: { where: blockingReceiptWhere },
            },
          },
        },
      }),
      prisma.material.count({ where }),
    ]);

    // Внешний контракт прежний. В data остаются поля Material и _count.receipts;
    // manufacturer/manufacturerId не добавляем: их нет в модели Material.
    return { success: true, data, total, page, pageSize };
  } catch (error: unknown) {
    if (isError(error)) throw error;

    console.error('[lab/material GET] Ошибка получения списка материалов:', error);
    const message = 'Не удалось загрузить список материалов. Повторите попытку.';
    throw createError({
      statusCode: 500,
      statusMessage: 'MATERIAL_LIST_FAILED',
      message,
      data: { code: 'MATERIAL_LIST_FAILED', message },
    });
  }
});
