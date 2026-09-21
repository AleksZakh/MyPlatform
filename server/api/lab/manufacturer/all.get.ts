// server/api/lab/manufacturer/all.get.ts
import { AccessAction } from '@prisma/client';
import { defineEventHandler, getQuery } from 'h3';

import { prisma } from '~~/server/utils/prisma';
import { requirePermission } from '~~/server/services/access-control.service';
import {
  MANUFACTURER_RESOURCE_KEY,
  manufacturerReadOptions,
  rethrowManufacturerError,
} from '~~/server/services/lab/manufacturer-api.service';

export default defineEventHandler(async (event) => {
  await requirePermission(event, MANUFACTURER_RESOURCE_KEY, AccessAction.VIEW);
  try {
    const { where, orderBy } = manufacturerReadOptions(getQuery(event));
    // Все действующие элементы, соответствующие поиску. Без skip/take и лимита 100.
    // Производитель без поступлений также доступен для выбора.
    const data = await prisma.manufacturer.findMany({
      where,
      orderBy,
      select: { id: true, name: true, note: true },
    });
    return { success: true, data, total: data.length };
  } catch (error: unknown) {
    rethrowManufacturerError(error, 'options');
  }
});
