// server/api/lab/locations/index.post.ts
import { AccessAction } from '@prisma/client';
import { defineEventHandler, readBody } from 'h3';
import { requirePermission } from '~~/server/services/access-control.service';
import { LOCATION_RESOURCE_KEY, rethrowCatalogError, readLocationInput } from '~~/server/services/lab/objects-locations-api.service';
import { createLocation } from '~~/server/services/lab/objects-locations-write.service';

export default defineEventHandler(async event => {
  const permission = await requirePermission(event, LOCATION_RESOURCE_KEY, AccessAction.CREATE);
  try {
    const input = readLocationInput(await readBody<unknown>(event), true);
    return await createLocation(event, permission.userId, input);
  } catch (error: unknown) { rethrowCatalogError(error, 'location', 'create'); }
});
