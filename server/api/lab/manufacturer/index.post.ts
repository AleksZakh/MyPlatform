// server/api/lab/manufacturer/index.post.ts
import { AccessAction } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { defineEventHandler, readBody } from 'h3';

import { requirePermission } from '~~/server/services/access-control.service';
import { buildCreateAuditDelta, writeAuditEvent } from '~~/server/utils/auditLog';
import {
  MANUFACTURER_RESOURCE_KEY,
  assertManufacturerNameAvailable,
  manufacturerAuditActor,
  manufacturerWriteTransaction,
  parseManufacturerInput,
  rethrowManufacturerError,
  rethrowManufacturerNameConflict,
} from '~~/server/services/lab/manufacturer-api.service';

export default defineEventHandler(async (event) => {
  const permission = await requirePermission(event, MANUFACTURER_RESOURCE_KEY, AccessAction.CREATE);
  try {
    const input = parseManufacturerInput(await readBody<unknown>(event));
    return await manufacturerWriteTransaction(async (tx) => {
      await assertManufacturerNameAvailable(tx, input.name);
      const actor = await manufacturerAuditActor(tx, permission.userId);
      const data: Prisma.ManufacturerCreateInput = {
        name: input.name,
        note: input.note ?? null,
        authorEmail: actor.actorEmail,
      };
      const created = await tx.manufacturer.create({ data }).catch(rethrowManufacturerNameConflict);
      // Ошибки аудита не маскируются под дубликат производителя.
      await writeAuditEvent({
        event,
        db: tx,
        category: 'DATA',
        result: 'SUCCESS',
        action: 'CREATE',
        resourceKey: MANUFACTURER_RESOURCE_KEY,
        entityType: 'Manufacturer',
        entityId: created.id,
        ...actor,
        note: `Создан производитель «${created.name}».`,
        changes: buildCreateAuditDelta({ name: created.name, note: created.note }, ['name', 'note']),
      });
      return { success: true, data: created, message: 'Производитель успешно создан' };
    });
  } catch (error: unknown) {
    rethrowManufacturerError(error, 'create');
  }
});
