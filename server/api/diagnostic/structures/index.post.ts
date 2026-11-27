import { z } from 'zod';
import { prisma } from '../../../utils/prisma';
import { structureAccess } from '../../../services/diagnostic/structure-access';
import { structureMatcher } from '../../../services/diagnostic/structure-match';
import { structureLocationMetres } from '../../../../shared/utils/diagnostic-structures';
import { writeAuditEvent, computeAuditDelta } from '../../../utils/auditLog';
const field = z
  .string()
  .trim()
  .max(16000)
  .refine((s) => !s.includes('\0'));
const card = z.object({
  id: z.number().int().positive().optional(),
  version: z.number().int().positive().optional(),
  code: field.max(200),
  roadName: field.min(1),
  location: field.min(1),
  structureName: field.min(1),
  additionalId: field,
  note: field,
});
export default defineEventHandler(async (event) => {
  await structureAccess(event, 'VIEW');
  const parsed = card.safeParse(await readBody(event));
  if (!parsed.success)
    throw createError({ statusCode: 400, message: 'Заполните автодорогу, сооружение и место.' });
  const { id, version, ...data } = parsed.data;
  const actor = await structureAccess(event, id ? 'UPDATE' : 'CREATE');
  data.code = data.code.toUpperCase();
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(28102026, 1)`;
      const old = id
        ? await tx.diagnosticStructure.findFirst({
            where: { id, version, deletedAt: null, decommissionedAt: null },
          })
        : null;
      if (id && (!version || !old))
        throw createError({ statusCode: 409, message: 'Обновите карточку. Сооружение изменилось.' });
      if (old?.code && old.code !== data.code)
        throw createError({ statusCode: 400, message: 'Присвоенный код ИССО сохраняется за сооружением.' });
      const lookup = await structureMatcher(tx, [data]);
      const match = lookup(data),
        natural = lookup({ ...data, code: '' });
      if ([...match.matches, ...natural.matches].some((r) => r.id !== id))
        throw createError({
          statusCode: 409,
          message: 'В справочнике уже есть сооружение с этим кодом или сочетанием реквизитов.',
        });
      const locationMetres = structureLocationMetres(data.location);
      if (locationMetres == null && old?.location !== data.location)
        throw createError({ statusCode: 400, message: 'Введите место в формате км+м.' });
      const values = { ...data, code: data.code || null, locationMetres, updatedById: actor.userId };
      const row = old
        ? await tx.diagnosticStructure.update({
            where: { id, version },
            data: {
              ...values,
              ...(old.importKind === 'draft' &&
              (old.location !== data.location ||
                old.roadName !== data.roadName ||
                old.structureName !== data.structureName ||
                old.additionalId !== data.additionalId ||
                old.code !== values.code)
                ? { importKind: 'manual' }
                : {}),
              version: { increment: 1 },
            },
          })
        : await tx.diagnosticStructure.create({
            data: { ...values, importKind: 'manual', createdById: actor.userId },
          });
      await writeAuditEvent({
        event,
        db: tx,
        category: 'DATA',
        result: 'SUCCESS',
        action: old ? 'UPDATE' : 'CREATE',
        resourceKey: 'diagnostic.structures',
        entityType: 'DiagnosticStructure',
        entityId: row.id,
        actorUserId: actor.userId,
        changes: computeAuditDelta(
          old ? Object.fromEntries(Object.keys(data).map((k) => [k, old[k as keyof typeof data]])) : {},
          data,
        ),
      });
      return { id: row.id };
    },
    { isolationLevel: 'Serializable' },
  );
});
