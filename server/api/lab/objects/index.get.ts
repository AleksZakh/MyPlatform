import { AccessAction } from '@prisma/client';
import { defineEventHandler, getQuery } from 'h3';
import { prisma } from '~~/server/utils/prisma';
import { requirePermission } from '~~/server/services/access-control.service';
import { OBJECT_RESOURCE_KEY, catalogPagination, objectWhere, objectOrders, objectUsageInclude,
  rethrowCatalogError } from '~~/server/services/lab/objects-locations-api.service';

export default defineEventHandler(async event => {
  await requirePermission(event, OBJECT_RESOURCE_KEY, AccessAction.VIEW);
  try {
    const query = getQuery(event);
    const { page, pageSize, skip } = catalogPagination(query);
    const where = objectWhere(query);
    const [data, total] = await Promise.all([
      prisma.testObject.findMany({ where, orderBy: objectOrders(query), skip, take: pageSize, include: objectUsageInclude }),
      prisma.testObject.count({ where }),
    ]);
    return { success: true, data, total, page, pageSize };
  } catch (error: unknown) { rethrowCatalogError(error, 'object', 'list'); }
});
