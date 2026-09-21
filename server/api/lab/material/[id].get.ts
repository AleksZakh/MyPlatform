// Установить как server/api/lab/material/[id].get.ts
import { AccessAction } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { createError, defineEventHandler, getRouterParam, isError } from 'h3';

import { prisma } from '~~/server/utils/prisma';
import { requirePermission } from '~~/server/services/access-control.service';

const RESOURCE_KEY = 'lab.materials';
const MAX_DATABASE_INT = 2_147_483_647;
const RECEIPTS_PREVIEW_LIMIT = 10;

/**
 * Тот же критерий использования, что в index.get.ts, all.get.ts и DELETE.
 * - Действующая запись Реестра считается использованием даже при
 *   несогласованном deletedAt самого поступления.
 * - Связь с мягко удалённой записью Реестра использованием не считается.
 * - Отдельное действующее поступление без Реестра тоже учитывается.
 *
 * Один фильтр применяется к общему счётчику и к примерам поступлений.
 */
const blockingReceiptWhere: Prisma.ReceiptMaterialWhereInput = {
  OR: [
    { samplingTest: { is: { deletedAt: null } } },
    { deletedAt: null, samplingTest: { is: null } },
  ],
};

export default defineEventHandler(async (event) => {
  // Право проверяем до чтения материала. Отказы в доступе не превращаем в 500.
  await requirePermission(event, RESOURCE_KEY, AccessAction.VIEW);

  const idParam = getRouterParam(event, 'id') ?? '';
  const id = Number(idParam);

  // Не принимаем дроби, ноль, "12abc" и значения за пределами Prisma Int.
  if (!/^[1-9]\d*$/.test(idParam) || !Number.isSafeInteger(id) || id > MAX_DATABASE_INT) {
    const message = 'Некорректный ID материала.';
    throw createError({
      statusCode: 400,
      statusMessage: 'INVALID_MATERIAL_ID',
      message,
      data: { code: 'INVALID_MATERIAL_ID', message },
    });
  }

  try {
    const material = await prisma.material.findFirst({
      where: {
        id,
        // Обычная карточка справочника не выдаёт мягко удалённые элементы.
        deletedAt: null,
      },
      include: {
        _count: {
          select: {
            // Общее число учитываемых связей, без ограничения в 10 строк.
            receipts: { where: blockingReceiptWhere },
          },
        },
        // Сохраняем небольшой список примеров поступлений из старого API,
        // но используем реальные поля новой схемы и явный порядок.
        receipts: {
          where: blockingReceiptWhere,
          take: RECEIPTS_PREVIEW_LIMIT,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          select: {
            id: true,
            receiptDate: true,
            qualityDocumentDate: true,
            qualityDocumentNumber: true,
          },
        },
      },
    });

    if (!material) {
      const message = 'Материал не найден или удалён из справочника.';
      throw createError({
        statusCode: 404,
        statusMessage: 'MATERIAL_NOT_FOUND',
        message,
        data: { code: 'MATERIAL_NOT_FOUND', message },
      });
    }

    // Оболочка ответа сохранена. Material.manufacturer больше не существует;
    // qualDate/qualDocNumber заменены реальными именами полей ReceiptMaterial.
    return { success: true, data: material };
  } catch (error: unknown) {
    // Ожидаемые HTTP-отказы не логируем как технические ошибки.
    if (isError(error)) throw error;

    console.error('[lab/material DETAIL GET] Ошибка получения материала:', error);
    const message = 'Не удалось загрузить материал. Повторите попытку.';
    throw createError({
      statusCode: 500,
      statusMessage: 'MATERIAL_DETAILS_FAILED',
      message,
      data: { code: 'MATERIAL_DETAILS_FAILED', message },
    });
  }
});
