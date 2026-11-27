import { roadKey } from '../../../shared/utils/diagnostic-road-names.mjs';
import { roadNameResolver } from './road-names';
import { createHash } from 'node:crypto';
import { createError, type H3Event } from 'h3';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../utils/prisma';
import { writeAuditEvent } from '../../utils/auditLog';
import {
  normalized,
  isM4Worklog,
  workColumns,
  crews,
  resolvePeople,
} from '../../../shared/utils/diagnostic-worklog';
import { structureLocationMetres } from '../../../shared/utils/diagnostic-structures';
import { identity, structureMatcher } from './structure-match';

const text = z
  .string()
  .trim()
  .max(16000)
  .refine((s) => !s.includes('\0'));
const pos = z.number().int().positive().max(2147483647);
const schema = z.object({
  fileName: text.max(255).min(1),
  sheet: text.max(150).min(1),
  road: text.max(500).min(1),
  contractId: pos.optional(),
  number: text.max(15).default(''),
  date: z.iso.date().optional(),
  counterparty: pos.optional(),
  mapping: z.array(z.number().int().nonnegative()).length(workColumns.length),
  rows: z
    .array(
      z.object({
        row: pos,
        stage: pos.max(1000),
        name: text.min(1),
        additional: text,
        location: text.min(1),
        code: text.max(200),
        colored: z.boolean(),
        length: text,
        note: text,
        cells: z.array(text).length(workColumns.length),
        origin: z.array(text).max(100),
        reportRefs: z.tuple([text,text,text]).optional(),
      }),
    )
    .min(1)
    .max(20000),
  allowMissing: z.boolean().default(false),
  matches: z.record(z.string(), z.number().int().min(0)).default({}),
  signature: z.string().length(64).optional(),
});
export type WorklogInput = z.infer<typeof schema>;
export function parseWorklog(value: unknown) {
  const parsed = schema.safeParse(value);
  if (!parsed.success)
    throw createError({
      statusCode: 400,
      message: 'Проверьте реквизиты договора и строки файла. ' + parsed.error.issues[0]?.path.join('.'),
    });
  if (!parsed.data.contractId && (!parsed.data.number || !parsed.data.date || !parsed.data.counterparty))
    throw createError({
      statusCode: 400,
      message: 'Выберите действующий договор или заполните реквизиты нового.',
    });
  return parsed.data;
}
const hash = (data: unknown) => createHash('sha256').update(JSON.stringify(data)).digest('hex');
const fail = (message: string): never => {
  throw createError({ statusCode: 409, message });
};
const stamp = (actorId: number, fileName: string) => ({
  lastImportedAt: new Date(),
  lastImportedById: actorId,
  lastImportFile: fileName,
});
function addObservation(previous: string, next: string) {
  const lines = new Set(previous.split('\n').map((s) => s.trim()));
  return [previous, ...next.split('\n').filter((line) => line.trim() && !lines.has(line.trim()))]
    .filter(Boolean)
    .join('\n');
}
export async function worklogPlan(
  tx: Prisma.TransactionClient,
  input: WorklogInput,
  employees: { name: string }[],
) {
  const resolveRoad = await roadNameResolver(tx, [input.road]);
  const roadName = resolveRoad(input.road);
  const file = normalized(input.fileName), sheet = normalized(input.sheet);
  const sourceKey = JSON.stringify([normalized(roadName), file, sheet]);
  const digest = (road: string) => hash([road, input.sheet, input.rows]);
  const sourceHash = digest(normalized(roadName));
  // Historical hashes include the spelling used at import. Read only archive metadata here.
  const files = await tx.diagnosticWorklogFile.findMany({
    where: input.contractId ? { contractId: input.contractId } : {},
    select: { contractId: true, hash: true, sourceKey: true },
    orderBy: { importedAt: 'desc' },
  });
  const key = roadKey(roadName);
  const spellings = new Set([normalized(roadName), normalized(input.road)]);
  const sourceKeys = new Set([sourceKey]);
  for (const f of files) {
    if (!f.sourceKey) continue;
    let parts: unknown;
    try { parts = JSON.parse(f.sourceKey); } catch { continue; }
    if (!Array.isArray(parts) || typeof parts[0] !== 'string' || roadKey(parts[0]) !== key) continue;
    spellings.add(parts[0]);
    if (parts[1] === file && parts[2] === sheet) sourceKeys.add(f.sourceKey);
  }
  const hashes = [...spellings].map(digest);
  const exact = files.filter(f => hashes.some(h => f.hash === h || f.hash === hash([f.contractId, h])));
  const exactTargets = [...new Set(exact.map(f => f.contractId))];
  if (!input.contractId && exactTargets.length > 1)
    fail('Файл есть в нескольких договорах. Выберите договор по номеру и дате.');
  const targetId = input.contractId || exactTargets[0];
  const contract = targetId ? await tx.diagnosticContract.findUnique({ where: { id: targetId } }) : null;
  if (targetId && (!contract || contract.deletedAt || contract.direction !== 'INCOME'))
    fail('Выбранный доходный договор недоступен. Обновите список договоров.');
  const fingerprint = contract ? hash([contract.id, sourceHash]) : sourceHash;
  const recorded = contract ? exact.find(f => f.contractId === contract.id) : undefined;
  const lastFile = contract && files.find(f => f.contractId === contract.id && sourceKeys.has(f.sourceKey));
  const history = lastFile ? await tx.diagnosticWorklogFile.findUnique({
    where: { hash: lastFile.hash }, select: { rows: true },
  }) : null;
  const former = new Map<number, number>();
  if (Array.isArray(history?.rows)) {
    for (const value of history.rows) {
      if (
        value &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        typeof value.row === 'number' &&
        typeof value.structureId === 'number'
      )
        former.set(value.row, value.structureId);
    }
  }
  const errors: string[] = [];
  if (!input.contractId && !recorded && isM4Worklog(input.fileName))
    errors.push('Для ведомости М-4 933–1024 выберите существующий договор ДСиР-2025-478 от 13.05.2025.');
  if (!input.contractId && !contract && files.some(f => sourceKeys.has(f.sourceKey)))
    errors.push('Ранее импортировался файл с таким именем. Для продолжения выберите существующий договор.');
  if (
    !contract &&
    (await tx.diagnosticContract.findFirst({
      where: { number: { equals: input.number, mode: 'insensitive' }, deletedAt: null },
    }))
  )
    errors.push('Этот номер уже занят другим договором. Укажите другой временный номер.');
  if (!contract && !(await tx.diagnosticCounterparty.findUnique({ where: { id: input.counterparty! } })))
    errors.push('Контрагент не найден.');
  const works = await tx.diagnosticWork.findMany({
    where: { id: { in: input.mapping.filter(Boolean) }, deletedAt: null },
  });
  const workById = new Map(works.map((w) => [w.id, w]));
  const lookups = input.rows.map((r) => ({
    code: r.code,
    roadName,
    location: r.location,
    structureName: r.name,
    additionalId: r.additional,
  }));
  const lookup = await structureMatcher(tx, lookups);
  const links = contract
    ? await tx.diagnosticContractStructure.findMany({
        where: { contractId: contract.id },
        include: {
          structure: true,
          workAssignments: {
            where: { deletedAt: null },
            select: {
              id: true,
              workId: true,
              workCodeSnapshot: true,
              version: true,
              worklogCell: true,
              note: true,
              planExecutor: true,
              status: true,
            },
          },
        },
      })
    : [];
  const byStructure = new Map(links.map((l) => [l.structureId, l]));
  const seen = new Map<string, number>();
  const seenRows = new Set<number>();
  const review = input.rows.map((r, index) => {
    if (seenRows.has(r.row)) errors.push('Повторяется номер строки ' + r.row);
    seenRows.add(r.row);
    const info = lookups[index]!,
      found = lookup(info),
      near = [...('near' in found ? found.near || [] : [])];
    // Row position alone is only a suggestion when workers correct or rearrange the sheet.
    const prior = byStructure.get(former.get(r.row) ?? 0)?.structure;
    if (
      found.state === 'new' &&
      prior &&
      !prior.deletedAt &&
      !prior.decommissionedAt &&
      (!r.code || !prior.code || r.code === prior.code) &&
      !near.some((s) => s.id === prior.id)
    )
      near.push(prior);
    const selected = input.matches[String(r.row)];
    const preferred = near?.find((v) => v.id === selected);
    if (near?.length && (selected === undefined || (selected !== 0 && !preferred)))
      errors.push('Уточните совпадение на том же километре в строке ' + r.row + '.');
    const old = found.matches[0] || preferred,
      link = old ? byStructure.get(old.id) : undefined;
    const warnings: string[] = [];
    if (link && link.stage !== r.stage)
      warnings.push(
        'В договоре этап ' + link.stage + ', по файлу ' + r.stage + '. Сохранится этап из договора.',
      );
    for (const key of [
      'identity:' + identity(info),
      ...(r.code ? ['code:' + r.code] : []),
      ...(old ? ['id:' + old.id] : []),
    ]) {
      const prior = seen.get(key);
      if (prior !== undefined && prior !== r.row)
        errors.push(
          'Строки ' + prior + ' и ' + r.row + ' относятся к одному сооружению. Проверьте исходный файл.',
        );
      seen.set(key, r.row);
    }
    if (found.state === 'archived' || found.state === 'conflict' || link?.deletedAt)
      errors.push('Строка ' + r.row + ' · архивная либо противоречивая связь. Проверьте справочник и файл.');
    if (r.colored && !r.code && !old?.code) {
      warnings.push('Требуется код ИССО');
      if (!input.allowMissing)
        errors.push('Проверьте цветные строки без ИССО и подтвердите их включение либо дополните файл.');
    }
    if (structureLocationMetres(r.location) === null) warnings.push('Уточнить километраж');
    const assignments = r.cells.flatMap((value, column) => {
      if (!value || /^[-–—]+$/.test(value)) return [];
      const w = workById.get(input.mapping[column]!);
      if (!w || (column === 0) !== ['301', '302'].includes(w.code)) {
        errors.push('Выберите работу библиотеки для «' + workColumns[column] + '».');
        return [];
      }
      const informational = /(пдф|pdf|dwg)|^(хорошее|отличное)$/i.test(value);
      const drawing = column === 3;
      const attribution = drawing ? r.cells[4] || '' : value;
      const names = drawing
        ? resolvePeople(attribution, employees)
        : informational
          ? []
          : resolvePeople(value, employees);
      const visit = column === 0 && !!contract;
      if (drawing && !names.length)
        warnings.push('АИС Чертёж: уточнить исполнителя по столбцу «АИС Конструктив».');
      if (!visit && crews[value.toUpperCase()] && !names.length)
        errors.push(
          'Сверьте состав бригады ' +
            value +
            ' с группой сотрудников ОДИС: ' +
            crews[value.toUpperCase()]!.join(', '),
        );
      if (!drawing && !informational && !names.length)
        warnings.push('Уточнить исполнителя: ' + (crews[value]?.join(', ') || value));
      const existing =
        link?.workAssignments.filter((a) => a.workId === w.id || a.workCodeSnapshot === w.code) || [];
      const assignment = existing[0],
        prior = assignment?.worklogCell as { column?: number; executor?: string; note?: string } | null;
      const note = drawing ? value : names.length ? '' : crews[value]?.join(', ') || value;
      const different =
        !!assignment && (assignment.note !== note || assignment.planExecutor !== names.join(', '));
      const update =
        different &&
        existing.length === 1 &&
        prior?.column === column &&
        prior.note === assignment!.note &&
        prior.executor === assignment!.planExecutor &&
        ['', 'unplanned', 'planned'].includes(assignment!.status);
      if (different && !update) warnings.push('Сохранить сведения из карточки работы: ' + w.name);
      if (existing.length > 1) warnings.push('Несколько имеющихся назначений: ' + w.name);
      return [
        {
          column,
          workId: w.id,
          label: w.name,
          visit,
          people: names,
          note,
          update,
          assignmentVersion: assignment?.version ?? 0,
          existing: existing.map((a) => a.id),
        },
      ];
    });
    if (link?.worklogCrewEdited && assignments.some(a=>a.visit)) warnings.push('Сохранится состав бригады, уточнённый в отчёте.');
    if (new Set(assignments.map((a) => a.workId)).size !== assignments.length)
      errors.push('Строка ' + r.row + ' · разным столбцам назначена одна работа.');
    const differences = old
      ? (['roadName', 'location', 'structureName', 'additionalId', 'code'] as const)
          .filter((k) => info[k] && normalized(info[k]) !== normalized(old[k] || ''))
          .map((k) => ({ field: k, before: old[k] || '', after: info[k] }))
      : [];
    const patch: {
      note?: string;
      code?: string;
      roadName?: string;
      location?: string;
      locationMetres?: number | null;
      structureName?: string;
      additionalId?: string;
      lengthRaw?: string;
      lengthMetres?: string;
    } = {};
    if (old) {
      const note = addObservation(old.note, r.note);
      if (note !== old.note) patch.note = note;
      if (old.importKind === 'draft') {
        if (!old.code && r.code) patch.code = r.code;
        if ((old.code && old.code === r.code) || preferred) {
          if (old.roadName !== info.roadName) patch.roadName = info.roadName;
          if (old.location !== r.location) {
            patch.location = r.location;
            patch.locationMetres = structureLocationMetres(r.location);
          }
          if (old.structureName !== r.name) patch.structureName = r.name;
          if (r.additional && old.additionalId !== r.additional) patch.additionalId = r.additional;
          const length = r.length.replace(',', '.');
          if (r.length && old.lengthRaw !== r.length && /^\d{1,12}(\.\d{1,6})?$/.test(length)) {
            patch.lengthRaw = r.length;
            patch.lengthMetres = length;
          }
        }
      }
    }
    return {
      row: r.row,
      state: old && found.state === 'new' ? 'match' : found.state,
      candidates: (near || []).map((n) => ({
        id: n.id,
        label: [n.code || 'Без ИССО', n.structureName, n.location, n.additionalId]
          .filter(Boolean)
          .join(' · '),
      })),
      id: old?.id ?? 0,
      version: old?.version ?? 0,
      stage: r.stage,
      linkId: link?.id ?? 0,
      oldStage: link?.stage ?? 0,
      oldCrew: link?.worklogCrew,
      crewEdited: link?.worklogCrewEdited ?? false,
      oldActive: link?.worklogActive ?? null,
      patch,
      editStructure: Object.keys(patch).length > 0,
      differences,
      source: old?.importKind ?? 'draft',
      warnings,
      assignments,
    };
  });
  const uniqueErrors = [...new Set(errors)];
  const signature = hash([
    fingerprint,
    roadName,
    input.number,
    input.date,
    input.counterparty,
    sourceKey,
    input.mapping,
    contract?.id,
    contract?.version,
    review,
    uniqueErrors,
  ]);
  return {
    fingerprint,
    sourceKey,
    sourceHash,
    recorded,
    roadName,
    works,
    review,
    contract,
    signature,
    errors: uniqueErrors,
  };
}
export async function processWorklog(
  event: H3Event,
  actorId: number,
  input: WorklogInput,
  employees: { name: string }[],
  apply: boolean,
  authorize?: (need: { existingContract: boolean; createStructure: boolean; editStructure: boolean }) => void,
) {
  return prisma.$transaction(
    async (tx) => {
      if (apply) await tx.$executeRaw`SELECT pg_advisory_xact_lock(28102026, 1)`;
      const p = await worklogPlan(tx, input, employees);
      if (!apply)
        return {
          signature: p.signature,
          alreadyImported: !!p.recorded,
          contract: p.contract?.number || '',
          rows: p.review,
          errors: p.errors,
        };
      if (p.recorded && p.contract && !p.contract.deletedAt)
        return {
          id: p.contract.id,
          number: p.contract.number,
          created: 0,
          attached: 0,
          assignments: 0,
          changed: 0,
          updatedWorks: 0,
          deferredVisits: 0,
        };
      if (p.errors.length) fail(p.errors[0]!);
      if (p.signature !== input.signature) fail('Данные изменились. Повторите предварительную проверку.');
      authorize?.({
        existingContract: !!p.contract,
        createStructure: p.review.some((r) => !r.id),
        editStructure: p.review.some((r) => r.editStructure),
      });
      const stages = Math.max(...input.rows.map((r) => r.stage));
      const contract =
        p.contract ??
        (await tx.diagnosticContract.create({
          data: {
            number: input.number,
            date: new Date(input.date!),
            counterpartyId: input.counterparty!,
            direction: 'INCOME',
            stages,
            createdById: actorId,
            updatedById: actorId,
          },
        }));
      await tx.diagnosticWorklogBook.upsert({
        where: { contractId: contract.id },
        update: {},
        create: { contractId: contract.id, sourceName: 'contract:' + contract.id },
      });
      let created = 0,
        attached = 0,
        assignments = 0,
        changed = 0,
        updatedWorks = 0,
        marks = 0,
        deferredVisits = 0;
      const archivedRows: (WorklogInput['rows'][number] & { structureId: number })[] = [];
      const catalog = new Map(p.works.map((w) => [w.id, w]));
      for (const [i, r] of input.rows.entries()) {
        const item = p.review[i]!;
        let structureId = item.id;
        if (!structureId) {
          const length = r.length.replace(',', '.');
          const row = await tx.diagnosticStructure.create({
            data: {
              code: r.code || null,
              roadName: p.roadName,
              structureName: r.name,
              additionalId: r.additional,
              location: r.location,
              locationMetres: structureLocationMetres(r.location),
              lengthRaw: r.length,
              lengthMetres: /^\d{1,12}(\.\d{1,6})?$/.test(length) ? length : null,
              note: r.note,
              importKind: 'draft',
              ...stamp(actorId, input.fileName),
              createdById: actorId,
              updatedById: actorId,
            },
          });
          structureId = row.id;
          created++;
        } else if (item.editStructure) {
          await tx.diagnosticStructure.update({
            where: { id: structureId, version: item.version },
            data: {
              ...item.patch,
              ...stamp(actorId, input.fileName),
              updatedById: actorId,
              version: { increment: 1 },
            },
          });
          changed++;
        }
        archivedRows.push({ ...r, structureId });
        let linkId = item.linkId;
        if (!linkId) {
          const link = await tx.diagnosticContractStructure.create({
            data: { contractId: contract.id, stage: r.stage, structureId, worklogActive: r.colored },
          });
          linkId = link.id;
          attached++;
        } else if (item.oldActive !== r.colored) {
          await tx.diagnosticContractStructure.update({
            where: { id: linkId },
            data: { worklogActive: r.colored },
          });
          marks++;
        }
        // Once materialised these identifiers belong to the contract, including deliberate blanks.
        const [sheetOrdinal,specNumber,picket] = r.reportRefs ?? [r.origin[0],r.origin[1],r.origin[5]];
        await tx.$executeRaw`UPDATE diagnostic_contract_structures
          SET "progressOrder"=${r.row}, "sheetOrdinal"=coalesce("sheetOrdinal",${sheetOrdinal ?? ''}),
              "specNumber"=coalesce("specNumber",${specNumber ?? ''}), picket=coalesce(picket,${picket ?? ''})
          WHERE id=${linkId} AND "progressOrder" IS NULL`;
        for (const a of item.assignments) {
          if (a.visit) {
            const raw = r.cells[0]!;
            const crew = a.people.join(', ') || crews[raw.toUpperCase()]?.join(', ') || raw;
            if (!item.crewEdited && crew !== item.oldCrew)
              await tx.diagnosticContractStructure.update({
                where: { id: linkId },
                data: { worklogCrew: crew },
              });
            deferredVisits++;
            continue;
          }
          const executor = a.people.join(', '),
            cell = { column: a.column, executor, note: a.note };
          if (a.existing.length) {
            if (a.update) {
              await tx.diagnosticStructureWork.update({
                where: { id: a.existing[0]!, version: a.assignmentVersion },
                data: {
                  planExecutor: executor,
                  note: a.note,
                  worklogCell: cell,
                  updatedById: actorId,
                  version: { increment: 1 },
                },
              });
              updatedWorks++;
            }
            continue;
          }
          const w = catalog.get(a.workId)!;
          await tx.diagnosticStructureWork.create({
            data: {
              contractStructureId: linkId,
              structureId,
              workId: w.id,
              workCodeSnapshot: w.code,
              workNameSnapshot: w.name,
              criteriaSnapshot: w.criteria,
              catalogHoursSnapshot: w.hours,
              status: r.colored ? '' : 'planned',
              warning: r.colored ? 'Ход работ: выполняется или завершена. Уточните статус.' : '',
              planExecutor: executor,
              worklogCell: cell,
              note: a.note,
              importedById: actorId,
              importedAt: new Date(),
              createdById: actorId,
              updatedById: actorId,
            },
          });
          assignments++;
        }
      }
      const archive = await tx.diagnosticWorklogFile.createMany({
        data: [
          {
            hash: hash([contract.id, p.sourceHash]),
            sourceKey: p.sourceKey,
            contractId: contract.id,
            fileName: input.fileName,
            actorId,
            rows: archivedRows,
          },
        ],
        skipDuplicates: true,
      });
      if (p.contract && (attached || assignments || updatedWorks || marks || stages > contract.stages))
        await tx.diagnosticContract.update({
          where: { id: contract.id },
          data: {
            stages: Math.max(stages, contract.stages),
            updatedById: actorId,
            version: { increment: 1 },
          },
        });
      if (archive.count || attached || assignments || changed || updatedWorks)
        await writeAuditEvent({
          event,
          db: tx,
          category: 'DATA',
          result: 'SUCCESS',
          action: p.contract ? 'UPDATE' : 'CREATE',
          resourceKey: 'diagnostic.contracts',
          entityType: 'DiagnosticContract',
          entityId: contract.id,
          actorUserId: actorId,
          note: `Ход работ · ${input.fileName} · сооружений создано ${created}, связано ${attached}, назначений ${assignments}`,
        });
      return {
        id: contract.id,
        number: contract.number,
        created,
        attached,
        assignments,
        changed,
        updatedWorks,
        deferredVisits,
      };
    },
    { isolationLevel: 'Serializable', timeout: 180000, maxWait: 15000 },
  );
}
