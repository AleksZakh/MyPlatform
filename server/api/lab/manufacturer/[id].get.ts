// server/api/lab/manufacturer/[id].get.ts
import { AccessAction } from '@prisma/client';
import { defineEventHandler, getRouterParam } from 'h3';

import { prisma } from '~~/server/utils/prisma';
import { requirePermission } from '~~/server/services/access-control.service';
import {
  MANUFACTURER_RESOURCE_KEY,
  manufacturerBlockingReceiptWhere,
  manufacturerError,
  manufacturerUsageInclude,
  parseManufacturerId,
  rethrowManufacturerError,
} from '~~/server/services/lab/manufacturer-api.service';

export default defineEventHandler(async (event) => {
  await requirePermission(event, MANUFACTURER_RESOURCE_KEY, AccessAction.VIEW);
  const id = parseManufacturerId(getRouterParam(event, 'id'));
  try {
    const data = await prisma.manufacturer.findFirst({
      where: { id, deletedAt: null },
      include: {
        ...manufacturerUsageInclude,
        // Прямой Manufacturer.materials в новой схеме нет.
        // Показываем до 10 примеров учитываемых поступлений, а не весь Реестр.
        receipts: {
          where: manufacturerBlockingReceiptWhere,
          take: 10,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          select: {
            id: true,
            receiptDate: true,
            materialId: true,
            material: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!data) {
      manufacturerError(404, 'MANUFACTURER_NOT_FOUND',
        'Производитель не найден или удалён из справочника.');
    }
    return { success: true, data };
  } catch (error: unknown) {
    rethrowManufacturerError(error, 'detail');
  }
});
