// server/api/lab/manufacturer/[id].put.ts
import { AccessAction } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { defineEventHandler, getRouterParam, readBody } from 'h3';

import { requirePermission } from '~~/server/services/access-control.service';
import { computeAuditDelta, writeAuditEvent } from '~~/server/utils/auditLog';
import {
  MANUFACTURER_RESOURCE_KEY,
  assertManufacturerNameAvailable,
  manufacturerAuditActor,
  manufacturerError,
  manufacturerWriteTransaction,
  parseManufacturerId,
  parseManufacturerInput,
  rethrowManufacturerError,
  rethrowManufacturerNameConflict,
} from '~~/server/services/lab/manufacturer-api.service';

export default defineEventHandler(async (event) => {
  const permission = await requirePermission(event, MANUFACTURER_RESOURCE_KEY, AccessAction.UPDATE);
  const id = parseManufacturerId(getRouterParam(event, 'id'));
  try {
    const input = parseManufacturerInput(await readBody<unknown>(event));
    return await manufacturerWriteTransaction(async (tx) => {
      const current = await tx.manufacturer.findFirst({ where: { id, deletedAt: null } });
      if (!current) {
        manufacturerError(404, 'MANUFACTURER_NOT_FOUND',
          'Производитель не найден или удалён из справочника.');
      }
      const nextNote = input.note === undefined ? current.note : input.note;
      const changes = computeAuditDelta(
        { name: current.name, note: current.note },
        { name: input.name, note: nextNote },
      );
      if (Object.keys(changes).length === 0) {
        return { success: true, data: current, message: 'Данные производителя не изменились.' };
      }
      if (input.name !== current.name) {
        await assertManufacturerNameAvailable(tx, input.name, id);
      }
      const actor = await manufacturerAuditActor(tx, permission.userId);
      const data: Prisma.ManufacturerUpdateManyMutationInput = {
        name: input.name,
        note: nextNote,
        editorEmail: actor.actorEmail,
        editedAt: new Date(),
      };
      const changed = await tx.manufacturer.updateMany({
        // Сравнение защищает от изменений после чтения внутри этой операции.
        // Версию формы с момента её открытия пользователь пока не передаёт.
        where: {
          id,
          deletedAt: null,
          name: current.name,
          note: current.note,
          editedAt: current.editedAt,
        },
        data,
      }).catch(rethrowManufacturerNameConflict);
      if (changed.count !== 1) {
        manufacturerError(409, 'MANUFACTURER_STATE_CHANGED',
          'Производитель изменён или удалён другим пользователем. Обновите справочник.');
      }
      const updated = await tx.manufacturer.findUniqueOrThrow({ where: { id } });
      // Не меняем ReceiptMaterial.manufacturerId, материалы, даты Реестра и его окна.
      await writeAuditEvent({
        event,
        db: tx,
        category: 'DATA',
        result: 'SUCCESS',
        action: 'UPDATE',
        resourceKey: MANUFACTURER_RESOURCE_KEY,
        entityType: 'Manufacturer',
        entityId: id,
        ...actor,
        note: `Изменён производитель «${updated.name}».`,
        changes,
      });
      return { success: true, data: updated, message: 'Производитель успешно обновлён' };
    });
  } catch (error: unknown) {
    rethrowManufacturerError(error, 'update');
  }
});
