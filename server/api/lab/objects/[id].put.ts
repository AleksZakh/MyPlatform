// server/api/lab/objects/[id].put.ts
import { AccessAction } from '@prisma/client';
import { defineEventHandler, getRouterParam, readBody } from 'h3';
import { requirePermission } from '~~/server/services/access-control.service';
import { OBJECT_RESOURCE_KEY, rethrowCatalogError, catalogId, readCatalogInput } from '~~/server/services/lab/objects-locations-api.service';
import { updateObject } from '~~/server/services/lab/objects-locations-write.service';

export default defineEventHandler(async event => {
  const permission = await requirePermission(event, OBJECT_RESOURCE_KEY, AccessAction.UPDATE);
  try {
    const id = catalogId(getRouterParam(event, 'id')); 
    const input = readCatalogInput(await readBody<unknown>(event), 'object');
    return await updateObject(event, permission.userId, id, input);
  } catch (error: unknown) { rethrowCatalogError(error, 'object', 'update'); }
});
