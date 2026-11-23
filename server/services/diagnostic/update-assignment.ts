import { createError, type H3Event } from 'h3';
import { prisma } from '../../utils/prisma';
import { writeAuditEvent, computeAuditDelta } from '../../utils/auditLog';
import { tripDay } from '../../../shared/utils/diagnostic-trips';
import { tripToday } from '../../../shared/utils/diagnostic-trip-lifecycle';
import { dateIssue } from '../../../shared/utils/diagnostic-planning';
import { calendarResolver } from '../../../shared/utils/diagnostic-calendar';
import { calendarRoster } from './calendar-roster';
import { id, invalid } from './input';

const dates = ['planStart', 'planFinish', 'factStart', 'factFinish'] as const;
const hours = ['planHours', 'factHours'] as const;
const people = ['planExecutor', 'factExecutor'] as const;
const fields = new Set<string>([...dates, ...hours, ...people, 'autoComplete', 'note']);
const iso = (value: Date | null) => value?.toISOString().slice(0, 10) ?? null;
const conflict = () =>
  createError({ statusCode: 409, message: 'Работа изменилась. Обновите список и откройте карточку снова.' });

export async function updateAssignment(
  event: H3Event,
  actorId: number,
  contractId: number,
  kind: 'contract' | 'structure',
  workId: number,
  body: any,
) {
  const version = id(body?.version);
  const linkId = kind === 'structure' ? id(body.linkId) : null;
  const patch = body.changes;
  if (
    !patch ||
    typeof patch !== 'object' ||
    Array.isArray(patch) ||
    !Object.keys(patch).length ||
    Object.keys(patch).some((key) => !fields.has(key))
  )
    return invalid('Проверьте изменённые поля работы.');
  const assignees: Partial<Record<(typeof people)[number], string>> = {};
  const roster = people.some((k) => k in patch && patch[k] !== null) ? await calendarRoster(event) : null;
  for (const key of people) {
    if (!(key in patch)) continue;
    if (patch[key] === null) {
      assignees[key] = '';
      continue;
    }
    const person = roster?.employees.find((p) => p.id === id(patch[key]));
    if (!roster || !person) return invalid('Выберите сотрудника группы ОДИС.');
    const resolve = calendarResolver(roster.users);
    const name = [person.name, roster.users.find((u) => u.id === person.id)?.login].find(
      (s) => s && resolve(s).ids.includes(person.id),
    );
    if (!name) return invalid('Не удалось однозначно определить исполнителя.');
    assignees[key] = name;
  }
  const select = {
    version: true,
    status: true,
    planStart: true,
    planFinish: true,
    planHours: true,
    planExecutor: true,
    factStart: true,
    factFinish: true,
    factHours: true,
    factExecutor: true,
    note: true,
    autoCompleteHours: true,
    tripCompletion: { select: { tripId: true } },
    work: { select: { hours: true } },
  } as const;
  const cw = { id: workId, contractId, deletedAt: null, contract: { deletedAt: null } };
  const sw = {
    id: workId,
    contractStructureId: linkId ?? 0,
    deletedAt: null,
    contractStructure: {
      contractId,
      deletedAt: null,
      contract: { deletedAt: null },
      structure: { deletedAt: null },
    },
  };
  return prisma.$transaction(async (tx) => {
    const row =
      kind === 'contract'
        ? await tx.diagnosticContractWork.findFirst({ where: cw, select })
        : await tx.diagnosticStructureWork.findFirst({ where: sw, select: { ...select, tripId: true } });
    if (!row) throw createError({ statusCode: 404, message: 'Работа в выбранном договоре не найдена.' });
    if (row.tripCompletion || ('tripId' in row && row.tripId !== null))
      throw createError({ statusCode: 409, message: 'Эта работа управляется в разделе «Командировки».' });
    if (row.version !== version) throw conflict();
    const before = {
      status: row.status,
      planStart: iso(row.planStart),
      planFinish: iso(row.planFinish),
      factStart: iso(row.factStart),
      factFinish: iso(row.factFinish),
      planHours: row.planHours?.toString() ?? null,
      factHours: row.factHours?.toString() ?? null,
      planExecutor: row.planExecutor,
      factExecutor: row.factExecutor,
      autoCompleteHours: row.autoCompleteHours?.toString() ?? null,
      note: row.note,
    };
    const next = { ...before, ...assignees };
    for (const key of dates) {
      if (!(key in patch)) continue;
      if (patch[key] !== null && !tripDay(patch[key])) return invalid('Некорректная дата работы.');
      next[key] = patch[key];
    }
    for (const key of hours) {
      if (!(key in patch)) continue;
      if (patch[key] === null) {
        next[key] = null;
        continue;
      }
      const value = String(patch[key]).trim().replace(',', '.');
      if (!['number', 'string'].includes(typeof patch[key]) || !/^\d{1,10}(\.\d{1,4})?$/.test(value))
        return invalid('Укажите неотрицательные человеко-часы, до четырёх знаков после запятой.');
      next[key] = value;
    }
    if ('note' in patch) {
      if (typeof patch.note !== 'string') return invalid('Проверьте примечание.');
      next.note = patch.note;
    }
    if ('autoComplete' in patch) {
      if (typeof patch.autoComplete !== 'boolean') return invalid('Проверьте флаг автозавершения.');
      next.autoCompleteHours = patch.autoComplete
        ? (before.autoCompleteHours ?? row.work.hours.toString())
        : null;
    }
    if ('planStart' in patch || 'planFinish' in patch) {
      const contract = await tx.diagnosticContract.findUniqueOrThrow({
        where: { id: contractId },
        select: { start: true, finish: true },
      });
      const issue = dateIssue(
        { start: iso(contract.start), finish: iso(contract.finish) },
        next.planStart ?? '',
        next.planFinish ?? '',
      );
      if (issue) return invalid(issue);
    }
    if (
      ('factStart' in patch || 'factFinish' in patch) &&
      next.factStart &&
      next.factFinish &&
      next.factStart > next.factFinish
    )
      return invalid('Фактическое окончание раньше начала.');
    const today = tripToday();
    if (['factStart', 'factFinish'].some((key) => patch[key] && patch[key] > today))
      return invalid('Фактическая дата не может быть в будущем.');
    if (
      ['planStart', 'planFinish', 'planExecutor'].some((k) => k in patch) &&
      (next.planStart || next.planFinish) &&
      !next.planExecutor
    )
      return invalid('Для работы с плановыми датами выберите исполнителя.');
    if (
      ['factStart', 'factFinish', 'factHours', 'factExecutor'].some((k) => k in patch) &&
      (next.factStart || next.factFinish || next.factHours !== null)
    ) {
      if (!next.factExecutor && !('factExecutor' in patch)) next.factExecutor = next.planExecutor;
      if (!next.factExecutor) return invalid('Укажите фактического исполнителя.');
      if (next.factFinish && next.factHours === null)
        return invalid('Для завершения укажите фактические трудозатраты.');
    }
    const timingChanged = [
      'planStart',
      'planFinish',
      'planExecutor',
      'factStart',
      'factFinish',
      'autoComplete',
    ].some((k) => k in patch);
    if (timingChanged) {
      if (next.autoCompleteHours !== null && (!next.planStart || !next.planFinish || !next.planExecutor))
        return invalid('Для автозавершения нужны обе плановые даты и исполнитель.');
      // Imported completed assignments may have no fact dates. Editing their plan must preserve closure.
      if (next.factFinish || (before.status === 'completed' && !('factFinish' in patch)))
        next.status = 'completed';
      else if (next.planFinish && next.planFinish < today && (next.planExecutor || next.factExecutor)) {
        if (next.autoCompleteHours === null) next.status = 'overdue';
        else {
          next.status = 'completed';
          if (next.factStart && next.factStart > next.planFinish)
            return invalid(
              'Для автозавершения плановое окончание должно быть не раньше фактического начала.',
            );
          next.factStart ??= next.planStart;
          next.factFinish = next.planFinish;
          next.factHours = next.autoCompleteHours;
          next.factExecutor ||= next.planExecutor;
        }
      } else if (next.factStart || (next.planStart && next.planStart <= today && next.planExecutor))
        next.status = 'in_progress';
      else next.status = next.planExecutor || next.planStart || next.planFinish ? 'planned' : 'unplanned';
    }
    const data = {
      ...next,
      planStart: next.planStart ? new Date(next.planStart) : null,
      planFinish: next.planFinish ? new Date(next.planFinish) : null,
      factStart: next.factStart ? new Date(next.factStart) : null,
      factFinish: next.factFinish ? new Date(next.factFinish) : null,
      updatedById: actorId,
      version: { increment: 1 },
    };
    const updated =
      kind === 'contract'
        ? await tx.diagnosticContractWork.updateMany({
            where: { ...cw, version, tripCompletion: null },
            data,
          })
        : await tx.diagnosticStructureWork.updateMany({
            where: { ...sw, version, tripCompletion: null, tripId: null },
            data,
          });
    if (updated.count !== 1) throw conflict();
    await writeAuditEvent({
      event,
      db: tx,
      category: 'DATA',
      result: 'SUCCESS',
      action: 'UPDATE',
      resourceKey: 'diagnostic.contracts',
      entityType: kind === 'contract' ? 'DiagnosticContractWork' : 'DiagnosticStructureWork',
      entityId: workId,
      actorUserId: actorId,
      changes: computeAuditDelta(before, next),
    });
    return { version: version + 1 };
  });
}
