import { AccessAction } from '@prisma/client';
import { defineEventHandler, getRouterParam } from 'h3';
import { prisma } from '~~/server/utils/prisma';
import { requirePermission } from '~~/server/services/access-control.service';
import { LOCATION_RESOURCE_KEY, catalogId, catalogError, rethrowCatalogError
} from '~~/server/services/lab/objects-locations-api.service';

export default defineEventHandler(async event => {
  await requirePermission(event, LOCATION_RESOURCE_KEY, AccessAction.VIEW);
  try {
    const id = catalogId(getRouterParam(event, 'id'));
    const data = await prisma.testLocation.findFirst({
      where: { id, deletedAt: null, testObject: { is: { deletedAt: null } } },
      include: {
        testObject: { select: { id: true, name: true, note: true } },
        _count: { select: { samplingTests: { where: { deletedAt: null } } } },
        samplingTests: { where: { deletedAt: null }, take: 10, orderBy: [{ samplingDate: 'desc' }, { id: 'desc' }],
          select: { id: true, samplingActNumber: true, samplingDate: true } },
      },
    });
    if (!data) catalogError(404, 'LOCATION_NOT_FOUND', 'Место не найдено, удалено или относится к удалённому объекту.');
    return { success: true, data };
  } catch (error: unknown) { rethrowCatalogError(error, 'location', 'detail'); }
});
