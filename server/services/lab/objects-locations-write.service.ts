import type { H3Event } from 'h3';
import { normalizeLocationName } from '~~/shared/utils/lab-location-name';
import { computeAuditDelta, buildCreateAuditDelta } from '~~/server/utils/auditLog';
import {
  catalogError, catalogTransaction, catalogActor, catalogAudit, lockObject, lockLocation,
  assertObjectNameAvailable, assertLocationNameAvailable, rethrowCatalogNameConflict,
} from './objects-locations-api.service';
import type { CatalogInput, LocationInput } from './objects-locations-api.service';

export async function createObject(event: H3Event, userId: number, input: CatalogInput) {
  return catalogTransaction(async tx => {
    await assertObjectNameAvailable(tx, input.name);
    const actor = await catalogActor(tx, userId);
    const created = await tx.testObject.create({
      data: {
        name: input.name,
        fullName: input.fullName ?? null,
        note: input.note ?? null,
        authorEmail: actor.actorEmail,
      },
    }).catch(
      error =>
        rethrowCatalogNameConflict(
          error,
          'object',
        ),
    )

    await catalogAudit(
      event,
      tx,
      actor,
      'object',
      'CREATE',
      created.id,
      `Создан объект «${created.name}».`,
      buildCreateAuditDelta(
        {
          name: created.name,
          fullName: created.fullName,
          note: created.note,
        },
        [
          'name',
          'fullName',
          'note',
        ],
      ),
    )
    return { success: true, data: created, message: 'Объект успешно создан.' };
  });
}

export async function updateObject(event: H3Event, userId: number, id: number, input: CatalogInput) {
  return catalogTransaction(async tx => {
    const current = await lockObject(tx, id);
    const note =
      input.note === undefined
        ? current.note
        : input.note

    const fullName =
      input.fullName === undefined
        ? current.fullName
        : input.fullName

    const changes =
      computeAuditDelta(
        {
          name: current.name,
          fullName: current.fullName,
          note: current.note,
        },
        {
          name: input.name,
          fullName,
          note,
        },
      )

    if (!Object.keys(changes).length) {
      return {
        success: true,
        data: current,
        message: 'Данные объекта не изменились.',
      }
    }

    if (input.name !== current.name) {
      await assertObjectNameAvailable(
        tx,
        input.name,
        id,
      )
    }

    const actor =
      await catalogActor(
        tx,
        userId,
      )

    const updated =
      await tx.testObject.update({
        where: {
          id,
        },

        data: {
          name: input.name,
          fullName,
          note,
          editorEmail:
            actor.actorEmail,
        },
      }).catch(
        error =>
          rethrowCatalogNameConflict(
            error,
            'object',
          ),
      )
    await catalogAudit(event, tx, actor, 'object', 'UPDATE', id, `Изменён объект «${updated.name}».`, changes);
    // Места и записи Реестра не пересохраняем, их ID/даты/окна редактирования не меняем.
    return { success: true, data: updated, message: 'Объект успешно обновлён.' };
  });
}

export async function deleteObject(event: H3Event, userId: number, id: number) {
  return catalogTransaction(async tx => {
    const current = await lockObject(tx, id, false);
    if (current.deletedAt !== null) return { success: true, id, alreadyDeleted: true, message: 'Объект уже удалён.' };
    const activeLocations = await tx.testLocation.count({ where: { testObjectId: id, deletedAt: null } });
    const activeReferences = await tx.samplingTest.count({ where: {
      deletedAt: null, testLocation: { is: { testObjectId: id } },
    } });
    // Действующее место — самостоятельное использование даже без отборов.
    // Дополнительная проверка Реестра не позволяет скрыть активную историю через удалённое место.
    if (activeLocations || activeReferences) catalogError(409, 'OBJECT_IN_USE',
      `Нельзя удалить объект: действующих мест — ${activeLocations}, связанных действующих записей Реестра — ${activeReferences}.`,
      { activeLocations, activeReferences });
    const actor = await catalogActor(tx, userId);
    const updated = await tx.testObject.update({ where: { id }, data: {
      deletedAt: new Date(), deletedBy: actor.actorEmail, editorEmail: actor.actorEmail,
    } });
    await catalogAudit(event, tx, actor, 'object', 'DELETE', id, `Мягко удалён объект «${current.name}».`, {
      deletedAt: { before: null, after: updated.deletedAt?.toISOString() ?? null },
      deletedBy: { before: current.deletedBy, after: updated.deletedBy },
    });
    return { success: true, id, alreadyDeleted: false, message: 'Объект мягко удалён из справочника.' };
  }, true);
}

export async function createLocation(event: H3Event, userId: number, input: LocationInput) {
  // Обычно проверяет readLocationInput; повторная защита для вызова сервиса из другого кода.
  if (input.testObjectId === undefined) catalogError(400, 'OBJECT_REQUIRED', 'Для места необходимо указать объект.');
  const testObjectId = input.testObjectId;
  return catalogTransaction(async tx => {
    await lockObject(tx, testObjectId);
    await assertLocationNameAvailable(tx, testObjectId, input.name);
    const actor = await catalogActor(tx, userId);
    const created = await tx.testLocation.create({ data: {
      name: input.name, note: input.note ?? null, authorEmail: actor.actorEmail,
      testObject: { connect: { id: testObjectId } },
    } }).catch(error => rethrowCatalogNameConflict(error, 'location'));
    await catalogAudit(event, tx, actor, 'location', 'CREATE', created.id, `Создано место отбора «${created.name}».`,
      buildCreateAuditDelta({ name: created.name, note: created.note, testObjectId: created.testObjectId },
        ['name', 'note', 'testObjectId']));
    return { success: true, data: created, message: 'Место отбора успешно создано.' };
  });
}

export async function updateLocation(event: H3Event, userId: number, id: number, input: LocationInput) {
  return catalogTransaction(async tx => {
    const current = await lockLocation(tx, id);
    // В согласованной модалке объект — только для чтения.
    // Перенос менял бы объект ВСЕХ связанных отборов; он не часть обычного PUT.
    if (input.testObjectId !== undefined && input.testObjectId !== current.testObjectId) {
      catalogError(409, 'LOCATION_OBJECT_IMMUTABLE',
        'Нельзя переносить место в другой объект обычным редактированием. Создайте отдельное место в нужном объекте.');
    }
    const note = input.note === undefined ? current.note : input.note;
    // Одно лишь открытие старой строки и правка примечания не меняют её написание.
    const name = normalizeLocationName(current.name) === input.name ? current.name : input.name;
    const changes = computeAuditDelta({ name: current.name, note: current.note }, { name, note });
    if (!Object.keys(changes).length) return { success: true, data: current, message: 'Данные места не изменились.' };
    // Примечание старой записи можно изменить, даже если рядом есть исторический дубль.
    if (name !== current.name) await assertLocationNameAvailable(tx, current.testObjectId, name, id);
    const actor = await catalogActor(tx, userId);
    const updated = await tx.testLocation.update({ where: { id }, data: {
      name, note, editorEmail: actor.actorEmail,
    } }).catch(error => rethrowCatalogNameConflict(error, 'location'));
    await catalogAudit(event, tx, actor, 'location', 'UPDATE', id, `Изменено место отбора «${updated.name}».`, changes);
    return { success: true, data: updated, message: 'Место отбора успешно обновлено.' };
  });
}

export async function deleteLocation(event: H3Event, userId: number, id: number) {
  return catalogTransaction(async tx => {
    // Для удаления допускаем помеченного удалённым родителя: можно исправить старую несогласованность.
    const current = await lockLocation(tx, id, false);
    if (current.deletedAt !== null) return { success: true, id, alreadyDeleted: true, message: 'Место уже удалено.' };
    const activeReferences = await tx.samplingTest.count({ where: { testLocationId: id, deletedAt: null } });
    if (activeReferences) catalogError(409, 'LOCATION_IN_USE',
      `Нельзя удалить место: оно используется в действующих записях Реестра (${activeReferences}).`, { activeReferences });
    const actor = await catalogActor(tx, userId);
    const updated = await tx.testLocation.update({ where: { id }, data: {
      deletedAt: new Date(), deletedBy: actor.actorEmail, editorEmail: actor.actorEmail,
    } });
    await catalogAudit(event, tx, actor, 'location', 'DELETE', id, `Мягко удалено место отбора «${current.name}».`, {
      deletedAt: { before: null, after: updated.deletedAt?.toISOString() ?? null },
      deletedBy: { before: current.deletedBy, after: updated.deletedBy },
    });
    return { success: true, id, alreadyDeleted: false, message: 'Место отбора мягко удалено.' };
  }, true);
}
