import { AccessAction } from '@prisma/client';
import { defineEventHandler, getQuery } from 'h3';
import { prisma } from '~~/server/utils/prisma';
import { requirePermission } from '~~/server/services/access-control.service';
import { LOCATION_RESOURCE_KEY, catalogPagination, locationWhere, locationOrders, locationUsageInclude,
  rethrowCatalogError } from '~~/server/services/lab/objects-locations-api.service';

export default defineEventHandler(async event => {
  await requirePermission(event, LOCATION_RESOURCE_KEY, AccessAction.VIEW);
  try {
    const query = getQuery(event);
    const { page, pageSize, skip } = catalogPagination(query);
    const where = await locationWhere(query);
    const [data, total] = await Promise.all([
      prisma.testLocation.findMany({ where, orderBy: locationOrders(query), skip, take: pageSize, include: locationUsageInclude }),
      prisma.testLocation.count({ where }),
    ]);
    return { success: true, data, total, page, pageSize };
  } catch (error: unknown) { rethrowCatalogError(error, 'location', 'list'); }
});
