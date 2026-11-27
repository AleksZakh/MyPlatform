import { roadNameResolver } from '../../../services/diagnostic/road-names';
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
  management: field.optional(), issoType: field.optional(), placementType: field.optional(),
  obstacleType: field.optional(), obstacleName: field.optional(), region: field.optional(),
  district: field.optional(), conditionRating: field.optional(), classAk: field.optional(),
  classNk: field.optional(), classEnz: field.optional(), operator: field.optional(),
  commissionedYear: field.optional(), expertOpinion: field.optional(), plannedWorks: field.optional(),
  lengthRaw: field.optional(),
});
export default defineEventHandler(async (event) => {
  await structureAccess(event, 'VIEW');
  const parsed = card.safeParse(await readBody(event));
  if (!parsed.success)
    throw createError({ statusCode: 400, message: 'Заполните автодорогу, сооружение и место.' });
  const { id, version, ...data } = parsed.data;
  const actor = await structureAccess(event, id ? 'UPDATE' : 'CREATE');
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
      if (data.code !== old?.code) data.code = data.code.toUpperCase();
      if (old?.code && old.code !== data.code)
        throw createError({ statusCode: 400, message: 'Присвоенный код ИССО сохраняется за сооружением.' });
      if (old?.roadName !== data.roadName) {
        const road = await roadNameResolver(tx, [data.roadName]);
        data.roadName = road(data.roadName);
      }
      const identityChanged = !old || old.roadName !== data.roadName || old.location !== data.location ||
        old.structureName !== data.structureName || old.additionalId !== data.additionalId ||
        (old.code ?? '') !== data.code;
      if (identityChanged) {
        const lookup = await structureMatcher(tx, [data]);
        const match = lookup(data),
          natural = lookup({ ...data, code: '' });
        if ([...match.matches, ...natural.matches].some((r) => r.id !== id))
          throw createError({
            statusCode: 409,
            message: 'В справочнике уже есть сооружение с этим кодом или сочетанием реквизитов.',
          });
      }
      const locationMetres = old?.location === data.location ? old.locationMetres : structureLocationMetres(data.location);
      if (locationMetres == null && old?.location !== data.location)
        throw createError({ statusCode: 400, message: 'Введите место в формате км+м.' });
      let length: {lengthMetres?:string|null} = {};
      if (data.lengthRaw !== undefined && data.lengthRaw !== old?.lengthRaw) {
        const raw = data.lengthRaw.replace(',', '.');
        if (raw && !/^\d{1,12}(?:\.\d{1,6})?$/.test(raw))
          throw createError({statusCode:400,message:'Введите длину в метрах, до шести знаков после запятой.'});
        length = {lengthMetres:raw || null};
      }
      const values = { ...data, ...length, code: data.code || null, locationMetres, updatedById: actor.userId };
      const row = old
        ? await tx.diagnosticStructure.update({
            where: { id, version },
            data: {
              ...values,
              ...(old.importKind === 'draft' && (identityChanged ||
                (data.lengthRaw !== undefined && data.lengthRaw !== old.lengthRaw)) ? { importKind:'manual' } : {}),
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
      return { id: row.id, structure: { id:String(row.id), issoCode:row.code ?? '', roadName:row.roadName,
        location:row.location, locationMetres:row.locationMetres?.toNumber() ?? null,
        structureName:row.structureName, additionalId:row.additionalId, issoType:row.issoType,
        management:row.management, region:row.region, district:row.district, obstacleName:row.obstacleName } };
    },
    { isolationLevel: 'Serializable' },
  ).catch((e:unknown)=>{
    const code=(e as {code?:string}).code;
    if (code==='P2034' || code==='P2025' || code==='P2002') throw createError({statusCode:409,
      message:'Данные сооружения изменились или совпали с другой карточкой. Обновите карточку и проверьте реквизиты.'});
    throw e;
  });
});
