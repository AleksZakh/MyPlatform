import { createError, type H3Event } from 'h3';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../utils/prisma';
import { writeAuditEvent, computeAuditDelta } from '../../utils/auditLog';
import {
  importTextFields,
  type parseStructureImportBatch,
} from '../../../shared/utils/diagnostic-structure-import';
import { structureMatcher } from './structure-match';

type Batch = ReturnType<typeof parseStructureImportBatch>;
export async function reviewReference(tx: Prisma.TransactionClient, input: Batch) {
  const lookup = await structureMatcher(
    tx,
    input.records.map((item) => item.data),
  );
  return input.records.map((item) => {
    const hit = lookup(item.data);
    const candidates = 'near' in hit ? hit.near || [] : [];
    const selected = item.target === undefined ? undefined : candidates.find((r) => r.id === item.target);
    const old = hit.matches[0] || selected;
    const state = selected
      ? 'match'
      : hit.state === 'new' && candidates.length && item.target !== 0
        ? 'possible'
        : hit.state;
    const changes: { field: string; before: string; after: string }[] = [];
    if (state === 'match' && old) {
      for (const field of ['code', ...importTextFields, 'lengthRaw'] as const) {
        const before = old[field] ?? '',
          after = item.data[field] ?? '';
        if ((after || item.present.includes(field)) && before !== after)
          changes.push({ field, before, after });
      }
    }
    return {
      row: item.sourceRow,
      code: item.data.code,
      state,
      confirm: state === 'match' && old?.importKind !== 'reference' && !changes.length,
      candidates: candidates.map((r) => ({
        id: r.id,
        label: [r.structureName, r.additionalId, r.location].filter(Boolean).join(' · '),
      })),
      id: old?.id ?? 0,
      version: old?.version ?? 0,
      changes,
    };
  });
}
export async function importStructureBatch(
  event: H3Event,
  actorId: number,
  input: Batch,
  allowUpdate = false,
) {
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(28102026, 1)`;
      const preview = await reviewReference(tx, input);
      const created: string[] = [],
        updated: string[] = [],
        skipped: string[] = [];
      const seen = new Set<string>();
      for (const [index, item] of input.records.entries()) {
        const p = preview[index]!,
          d = item.data,
          choice = item.choice;
        if (choice && (choice.id !== p.id || choice.version !== p.version || choice.state !== p.state))
          throw createError({ statusCode: 409, message: 'Справочник изменился. Повторите сверку файла.' });
        const key = p.id ? 'id:' + p.id : 'code:' + d.code;
        if (seen.has(key) || !['new', 'match'].includes(p.state)) {
          skipped.push(d.code);
          continue;
        }
        seen.add(key);
        const stamp = {
          lastImportedAt: new Date(),
          lastImportedById: actorId,
          lastImportFile: input.fileName,
        };
        let target: number, changes: ReturnType<typeof computeAuditDelta>;
        if (p.state === 'new') {
          const createdRow = await tx.diagnosticStructure.create({
            data: { ...d, ...stamp, createdById: actorId, updatedById: actorId },
          });
          target = createdRow.id;
          changes = computeAuditDelta({}, d);
          created.push(d.code);
        } else {
          const fields = p.changes.filter((c) => choice?.fields.includes(c.field));
          if (!fields.length && !(p.confirm && choice?.confirm)) {
            skipped.push(d.code);
            continue;
          }
          if (!allowUpdate)
            throw createError({ statusCode: 403, message: 'Требуется право редактирования сооружений.' });
          const patch: Record<string, unknown> = Object.fromEntries(fields.map((c) => [c.field, c.after]));
          if ('location' in patch) patch.locationMetres = d.locationMetres;
          if ('lengthRaw' in patch) patch.lengthMetres = d.lengthMetres;
          await tx.diagnosticStructure.update({
            where: { id: p.id, version: p.version },
            data: {
              ...patch,
              ...stamp,
              importKind: 'reference',
              updatedById: actorId,
              version: { increment: 1 },
            },
          });
          target = p.id;
          updated.push(d.code);
          changes = computeAuditDelta(
            Object.fromEntries(fields.map((c) => [c.field, c.before])),
            Object.fromEntries(fields.map((c) => [c.field, c.after])),
          );
        }
        await writeAuditEvent({
          event,
          db: tx,
          category: 'DATA',
          result: 'SUCCESS',
          action: p.state === 'new' ? 'CREATE' : 'UPDATE',
          resourceKey: 'diagnostic.structures',
          entityType: 'DiagnosticStructure',
          entityId: target,
          actorUserId: actorId,
          note: `Эталонный Excel · ${input.fileName} · строка ${item.sourceRow}`,
          changes,
        });
      }
      return { created, updated, skipped };
    },
    { isolationLevel: 'Serializable', timeout: 30000, maxWait: 10000 },
  );
}
