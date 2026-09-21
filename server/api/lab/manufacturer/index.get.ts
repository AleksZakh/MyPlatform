// server/api/lab/manufacturer/index.get.ts
import { AccessAction } from '@prisma/client';
import { defineEventHandler, getQuery } from 'h3';

import { prisma } from '~~/server/utils/prisma';
import { requirePermission } from '~~/server/services/access-control.service';
import {
  MANUFACTURER_RESOURCE_KEY,
  manufacturerPagination,
  manufacturerReadOptions,
  manufacturerUsageInclude,
  rethrowManufacturerError,
} from '~~/server/services/lab/manufacturer-api.service';

export default defineEventHandler(async (event) => {
  await requirePermission(event, MANUFACTURER_RESOURCE_KEY, AccessAction.VIEW);
  try {
    const query = getQuery(event);
    const { page, pageSize, skip } = manufacturerPagination(query);
    const { where, orderBy } = manufacturerReadOptions(query);
    const [data, total] = await Promise.all([
      prisma.manufacturer.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        include: manufacturerUsageInclude,
      }),
      prisma.manufacturer.count({ where }),
    ]);
    // _count.receipts — число учитываемых поступлений, НЕ число видов материалов.
    return { success: true, data, total, page, pageSize };
  } catch (error: unknown) {
    rethrowManufacturerError(error, 'list');
  }
});
