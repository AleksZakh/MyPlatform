// server/api/lab/locations/[id].put.ts
import { AccessAction } from '@prisma/client';
import { defineEventHandler, getRouterParam, readBody } from 'h3';
import { requirePermission } from '~~/server/services/access-control.service';
import { LOCATION_RESOURCE_KEY, rethrowCatalogError, catalogId, readLocationInput } from '~~/server/services/lab/objects-locations-api.service';
import { updateLocation } from '~~/server/services/lab/objects-locations-write.service';

export default defineEventHandler(async event => {
  const permission = await requirePermission(event, LOCATION_RESOURCE_KEY, AccessAction.UPDATE);
  try {
    const id = catalogId(getRouterParam(event, 'id')); 
    const input = readLocationInput(await readBody<unknown>(event), false);
    return await updateLocation(event, permission.userId, id, input);
  } catch (error: unknown) { rethrowCatalogError(error, 'location', 'update'); }
});
