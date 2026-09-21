/** Подготовка для редактируемого поля с подсказками; запрос НЕ создаёт место. */
import { AccessAction } from '@prisma/client';
import { defineEventHandler, getQuery } from 'h3';
import { prisma } from '~~/server/utils/prisma';
import { requirePermission } from '~~/server/services/access-control.service';
import { locationNameKey } from '~~/shared/utils/lab-location-name';
import { LOCATION_RESOURCE_KEY, catalogId, catalogSearch, assertActiveObject, rethrowCatalogError
} from '~~/server/services/lab/objects-locations-api.service';

export default defineEventHandler(async event => {
  await requirePermission(event, LOCATION_RESOURCE_KEY, AccessAction.VIEW);
  try {
    const query = getQuery(event);
    // В подсказках объект ОБЯЗАТЕЛЕН: никогда не показываем места другого объекта.
    const testObjectId = catalogId(query.testObjectId, 'testObjectId');
    await assertActiveObject(prisma, testObjectId);
    const searchKey = locationNameKey(catalogSearch(query.search));
    const rawLimit = typeof query.limit === 'string' && /^\d+$/.test(query.limit) ? Number(query.limit) : 20;
    const limit = Number.isSafeInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 50) : 20;
    // Читаем только названия одного объекта. Не загружаем связанные отборы/файлы.
    const rows = await prisma.testLocation.findMany({ where: { testObjectId },
      select: { id: true, name: true, deletedAt: true }, orderBy: [{ name: 'asc' }, { id: 'asc' }] });
    const exact = searchKey ? rows.filter(row => locationNameKey(row.name) === searchKey) : [];
    const activeExact = exact.filter(row => row.deletedAt === null);
    const matches = rows.filter(row => row.deletedAt === null && locationNameKey(row.name).includes(searchKey));
    // Точное нормализованное совпадение показываем раньше остальных подстрок.
    matches.sort((a, b) => Number(locationNameKey(b.name) === searchKey) - Number(locationNameKey(a.name) === searchKey));
    const status = !searchKey ? 'empty' : activeExact.length > 1 ? 'ambiguous'
      : activeExact.length === 1 ? 'existing' : exact.length ? 'deleted' : 'new';
    return {
      success: true, testObjectId,
      data: matches.slice(0, limit).map(row => ({ id: row.id, name: row.name, testObjectId })),
      total: matches.length,
      match: { status, locationId: status === 'existing' ? activeExact[0]!.id : null },
      // Это свободно ли ИМЯ, не проверка права CREATE. Создание отдельно проверит права и совпадения заново.
      nameAvailable: status === 'new',
    };
  } catch (error: unknown) { rethrowCatalogError(error, 'location', 'suggestions'); }
});
