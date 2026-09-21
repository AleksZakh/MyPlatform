// server/api/lab/locations/[id].delete.ts
import { AccessAction } from '@prisma/client';
import { defineEventHandler, getRouterParam } from 'h3';
import { requirePermission } from '~~/server/services/access-control.service';
import { LOCATION_RESOURCE_KEY, rethrowCatalogError, catalogId } from '~~/server/services/lab/objects-locations-api.service';
import { deleteLocation } from '~~/server/services/lab/objects-locations-write.service';

export default defineEventHandler(async event => {
  const permission = await requirePermission(event, LOCATION_RESOURCE_KEY, AccessAction.DELETE);
  try {
    const id = catalogId(getRouterParam(event, 'id')); 
    return await deleteLocation(event, permission.userId, id);
  } catch (error: unknown) { rethrowCatalogError(error, 'location', 'delete'); }
});
