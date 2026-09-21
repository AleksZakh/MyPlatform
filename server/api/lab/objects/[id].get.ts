import { AccessAction } from '@prisma/client';
import { defineEventHandler, getRouterParam } from 'h3';
import { prisma } from '~~/server/utils/prisma';
import { requirePermission } from '~~/server/services/access-control.service';
import { OBJECT_RESOURCE_KEY, catalogId, catalogError, objectUsageInclude, rethrowCatalogError
} from '~~/server/services/lab/objects-locations-api.service';

export default defineEventHandler(async event => {
  await requirePermission(event, OBJECT_RESOURCE_KEY, AccessAction.VIEW);
  try {
    const id = catalogId(getRouterParam(event, 'id'));
    const data = await prisma.testObject.findFirst({ where: { id, deletedAt: null }, include: {
      ...objectUsageInclude,
      // Только обзор. Полная таблица мест — отдельный /locations?testObjectId=ID.
      locations: { where: { deletedAt: null }, take: 10, orderBy: [{ name: 'asc' }, { id: 'asc' }],
        select: { id: true, name: true, note: true } },
    } });
    if (!data) catalogError(404, 'OBJECT_NOT_FOUND', 'Объект не найден или удалён из справочника.');
    return { success: true, data };
  } catch (error: unknown) { rethrowCatalogError(error, 'object', 'detail'); }
});
