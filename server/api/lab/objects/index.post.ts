// server/api/lab/objects/index.post.ts
import { AccessAction } from '@prisma/client';
import { defineEventHandler, readBody } from 'h3';
import { requirePermission } from '~~/server/services/access-control.service';
import { OBJECT_RESOURCE_KEY, rethrowCatalogError, readCatalogInput } from '~~/server/services/lab/objects-locations-api.service';
import { createObject } from '~~/server/services/lab/objects-locations-write.service';

export default defineEventHandler(async event => {
  const permission = await requirePermission(event, OBJECT_RESOURCE_KEY, AccessAction.CREATE);
  try {
    const input = readCatalogInput(await readBody<unknown>(event), 'object');
    return await createObject(event, permission.userId, input);
  } catch (error: unknown) { rethrowCatalogError(error, 'object', 'create'); }
});
