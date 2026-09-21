// server/api/lab/objects/[id].delete.ts
import { AccessAction } from '@prisma/client';
import { defineEventHandler, getRouterParam } from 'h3';
import { requirePermission } from '~~/server/services/access-control.service';
import { OBJECT_RESOURCE_KEY, rethrowCatalogError, catalogId } from '~~/server/services/lab/objects-locations-api.service';
import { deleteObject } from '~~/server/services/lab/objects-locations-write.service';

export default defineEventHandler(async event => {
  const permission = await requirePermission(event, OBJECT_RESOURCE_KEY, AccessAction.DELETE);
  try {
    const id = catalogId(getRouterParam(event, 'id')); 
    return await deleteObject(event, permission.userId, id);
  } catch (error: unknown) { rethrowCatalogError(error, 'object', 'delete'); }
});
