// server/api/lab/manufacturer/[id].delete.ts
import { AccessAction } from '@prisma/client';
import { defineEventHandler, getRouterParam } from 'h3';

import { requirePermission } from '~~/server/services/access-control.service';
import { writeAuditEvent } from '~~/server/utils/auditLog';
import {
  MANUFACTURER_RESOURCE_KEY,
  manufacturerAuditActor,
  manufacturerBlockingReceiptWhere,
  manufacturerError,
  manufacturerWriteTransaction,
  parseManufacturerId,
  rethrowManufacturerError,
} from '~~/server/services/lab/manufacturer-api.service';

export default defineEventHandler(async (event) => {
  const permission = await requirePermission(event, MANUFACTURER_RESOURCE_KEY, AccessAction.DELETE);
  const id = parseManufacturerId(getRouterParam(event, 'id'));
  try {
    return await manufacturerWriteTransaction(async (tx) => {
      const current = await tx.manufacturer.findUnique({ where: { id } });
      if (!current) {
        manufacturerError(404, 'MANUFACTURER_NOT_FOUND', 'Производитель не найден.');
      }
      if (current.deletedAt !== null) {
        return {
          success: true,
          id,
          alreadyDeleted: true,
          message: 'Производитель уже удалён из справочника.',
        };
      }
      const activeReferences = await tx.receiptMaterial.count({
        where: { manufacturerId: id, ...manufacturerBlockingReceiptWhere },
      });
      if (activeReferences > 0) {
        manufacturerError(409, 'MANUFACTURER_IN_USE',
          `Нельзя удалить производителя «${current.name}»: он используется в действующих ` +
          `записях Реестра или отдельных действующих поступлениях (связей: ${activeReferences}).`,
          { activeReferences });
      }
      const actor = await manufacturerAuditActor(tx, permission.userId);
      const changed = await tx.manufacturer.updateMany({
        where: {
          id,
          deletedAt: null,
          // Проверка в UPDATE использует тот же предикат, что и счётчик выше.
          receipts: { none: manufacturerBlockingReceiptWhere },
        },
        data: {
          deletedAt: new Date(),
          deletedBy: actor.actorEmail,
          editorEmail: actor.actorEmail,
        },
      });
      if (changed.count !== 1) {
        manufacturerError(409, 'MANUFACTURER_STATE_CHANGED',
          'Состояние производителя изменилось. Обновите справочник и повторите удаление.');
      }
      // deletedAt — @db.Date. В аудит попадает фактически сохранённая дата.
      const deleted = await tx.manufacturer.findUniqueOrThrow({ where: { id } });
      await writeAuditEvent({
        event,
        db: tx,
        category: 'DATA',
        result: 'SUCCESS',
        action: 'DELETE',
        resourceKey: MANUFACTURER_RESOURCE_KEY,
        entityType: 'Manufacturer',
        entityId: id,
        ...actor,
        note: `Мягко удалён производитель «${current.name}». Действующих связей нет.`,
        // computeAuditDelta исключает deletedAt/deletedBy, поэтому delta явная.
        changes: {
          deletedAt: { before: null, after: deleted.deletedAt?.toISOString() ?? null },
          deletedBy: { before: current.deletedBy, after: deleted.deletedBy },
        },
      });
      return { success: true, id, alreadyDeleted: false, message: 'Производитель мягко удалён из справочника.' };
    }, true);
  } catch (error: unknown) {
    rethrowManufacturerError(error, 'delete');
  }
});
