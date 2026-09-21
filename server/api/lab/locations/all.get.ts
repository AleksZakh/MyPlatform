import { AccessAction } from '@prisma/client';
import { defineEventHandler, getQuery } from 'h3';
import { prisma } from '~~/server/utils/prisma';
import { requirePermission } from '~~/server/services/access-control.service';
import { LOCATION_RESOURCE_KEY, locationWhere, locationOrders, rethrowCatalogError
} from '~~/server/services/lab/objects-locations-api.service';

export default defineEventHandler(async event => {
  await requirePermission(event, LOCATION_RESOURCE_KEY, AccessAction.VIEW);
  try {
    const query = getQuery(event);
    const data = await prisma.testLocation.findMany({ where: await locationWhere(query), orderBy: locationOrders(query),
      select: { id: true, name: true, note: true, testObjectId: true } });
    return { success: true, data, total: data.length };
  } catch (error: unknown) { rethrowCatalogError(error, 'location', 'options'); }
});
