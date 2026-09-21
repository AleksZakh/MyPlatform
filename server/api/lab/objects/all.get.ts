import { AccessAction } from '@prisma/client';
import { defineEventHandler, getQuery } from 'h3';
import { prisma } from '~~/server/utils/prisma';
import { requirePermission } from '~~/server/services/access-control.service';
import { OBJECT_RESOURCE_KEY, objectWhere, objectOrders, rethrowCatalogError
} from '~~/server/services/lab/objects-locations-api.service';

export default defineEventHandler(async event => {
  await requirePermission(event, OBJECT_RESOURCE_KEY, AccessAction.VIEW);
  try {
    const query = getQuery(event);
    const data = await prisma.testObject.findMany({ where: objectWhere(query), orderBy: objectOrders(query),
      select: { id: true, name: true, fullName: true, note: true } });
    return { success: true, data, total: data.length };
  } catch (error: unknown) { rethrowCatalogError(error, 'object', 'options'); }
});
