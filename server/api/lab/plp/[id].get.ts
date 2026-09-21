// Установить как server/api/lab/plp/[id].get.ts
import { AccessAction } from '@prisma/client';
import { createError, defineEventHandler, getRouterParam, isError } from 'h3';

import { prisma } from '~~/server/utils/prisma';
import { requirePermission } from '~~/server/services/access-control.service';

const RESOURCE_KEY = 'lab.plps';
const MAX_DATABASE_INT = 2_147_483_647;

export default defineEventHandler(async (event) => {
  // Проверяем право до чтения ПЛП. Отказы 401/403 не превращаем в 500.
  await requirePermission(event, RESOURCE_KEY, AccessAction.VIEW);

  const idParam = getRouterParam(event, 'id') ?? '';
  const id = Number(idParam);

  // Те же правила ID, что в обновлённом DELETE.
  // Не принимаем "12abc", дроби, ноль и числа вне диапазона Prisma Int.
  if (!/^[1-9]\d*$/.test(idParam) || !Number.isSafeInteger(id) || id > MAX_DATABASE_INT) {
    const message = 'Некорректный ID ПЛП.';
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid PLP ID',
      message,
      data: { code: 'INVALID_PLP_ID', message },
    });
  }

  try {
    const plp = await prisma.plp.findFirst({
      where: {
        id,
        // Обычная карточка справочника не выдаёт удалённый элемент.
        deletedAt: null,
      },
      include: {
        _count: {
          select: {
            // Мягко удалённые записи Реестра использованием не считаем.
            samplingTests: { where: { deletedAt: null } },
          },
        },
      },
    });

    if (!plp) {
      const message = 'ПЛП не найден или удалён из справочника.';
      throw createError({
        statusCode: 404,
        statusMessage: 'PLP not found',
        message,
        data: { code: 'PLP_NOT_FOUND', message },
      });
    }

    // Сохраняем прежний контракт, включая data._count.samplingTests.
    return {
      success: true,
      data: plp,
    };
  } catch (error: unknown) {
    // Ожидаемый 404 не логируем как техническую поломку.
    if (isError(error)) throw error;

    console.error('[lab/plp DETAIL GET] Ошибка получения ПЛП:', error);
    const message = 'Не удалось загрузить ПЛП. Повторите попытку.';
    throw createError({
      statusCode: 500,
      statusMessage: 'PLP loading failed',
      message,
      data: { code: 'PLP_DETAILS_FAILED', message },
    });
  }
});
