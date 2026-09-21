// Установить как server/api/lab/material/all.get.ts
import { AccessAction } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { createError, defineEventHandler, getQuery, isError } from 'h3';

import { prisma } from '~~/server/utils/prisma';
import { requirePermission } from '~~/server/services/access-control.service';

const RESOURCE_KEY = 'lab.materials';

/**
 * Тот же критерий использования, что в обновлённых index.get.ts и DELETE.
 * Учитываем действующий Реестр (даже при несогласованном deletedAt поступления)
 * и отдельное действующее поступление без Реестра.
 * Связь с мягко удалённой записью Реестра использованием не считается.
 */
const blockingReceiptWhere: Prisma.ReceiptMaterialWhereInput = {
  OR: [
    { samplingTest: { is: { deletedAt: null } } },
    { deletedAt: null, samplingTest: { is: null } },
  ],
};

export default defineEventHandler(async (event) => {
  // Право просмотра проверяется до запроса к справочнику.
  // Ожидаемый отказ в доступе не превращается в ошибку сервера.
  await requirePermission(event, RESOURCE_KEY, AccessAction.VIEW);

  try {
    const query = getQuery(event);
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

    // Удалённые материалы никогда не попадают в обычный список выбора.
    const where: Prisma.MaterialWhereInput = { deletedAt: null };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { note: { contains: search, mode: 'insensitive' } },
        {
          // Поиск по изготовителю сохраняем через поступления.
          // Прямой связи Material.manufacturer в новой модели нет.
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
      // sortKey=manufacturer и неизвестный ключ — сортировка по названию,
      // как в index.get.ts. Единственного изготовителя не подставляем.
      default: primaryOrder = { name: sortOrder };
    }

    const orderBy: Prisma.MaterialOrderByWithRelationInput[] = [primaryOrder];
    if (query.sortKey !== 'id') orderBy.push({ id: 'asc' });

    // Без skip/take: ВСЕ действующие материалы, соответствующие поиску.
    // Материал без поступлений тоже доступен для выбора.
    const materials = await prisma.material.findMany({
      where,
      orderBy,
      select: {
        id: true,
        name: true,
        note: true,
        _count: {
          select: {
            receipts: { where: blockingReceiptWhere },
          },
        },
      },
    });

    // Сохраняем оболочку ответа и используемые поля списка.
    // manufacturerId/manufacturer намеренно исключены из Material.
    return { success: true, data: materials, total: materials.length };
  } catch (error: unknown) {
    if (isError(error)) throw error;

    console.error('[lab/material ALL GET] Ошибка получения списка материалов:', error);
    const message = 'Не удалось загрузить список материалов. Повторите попытку.';
    throw createError({
      statusCode: 500,
      statusMessage: 'MATERIAL_OPTIONS_FAILED',
      message,
      data: { code: 'MATERIAL_OPTIONS_FAILED', message },
    });
  }
});
