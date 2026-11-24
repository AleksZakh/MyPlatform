import { createHash } from 'node:crypto';
import { createError, type H3Event } from 'h3';
import { prisma } from '../../utils/prisma';
import { calendarRoster } from './calendar-roster';
import { calendarResolver } from '../../../shared/utils/diagnostic-calendar';
import { contractStatus } from '../../../shared/utils/diagnostic-contracts';
import { diagnosticWorkStatus } from '../../../shared/utils/diagnostic-contract-table';
import {
  categoryNames,
  dateIssue,
  freeWork,
  isTravel,
  itemKey,
  type Category,
  type PlanItem,
  type PlanRow,
} from '../../../shared/utils/diagnostic-planning';
import { tripDay } from '../../../shared/utils/diagnostic-trips';
const fail = (message: string, statusCode = 400): never => {
  throw createError({ statusCode, message });
};
export function positive(v: unknown): number {
  const n = typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : v;
  if (typeof n !== 'number' || !Number.isSafeInteger(n) || n < 1 || n > 2147483647)
    return fail('Некорректный идентификатор.');
  return n;
}
const day = (v: Date | null) => v?.toISOString().slice(0, 10) ?? null;
const scope = { deletedAt: null, contract: { deletedAt: null }, structure: { deletedAt: null } };
const groupSelect = { group: { select: { name: true } }, category: { select: { name: true } } };
const assignmentSelect = {
  id: true,
  version: true,
  status: true,
  planHours: true,
  planExecutor: true,
  factExecutor: true,
  factHours: true,
  factStart: true,
  factFinish: true,
};
export async function planningOptions(event: H3Event, currentUserId: number) {
  const [contracts, roster, works] = await Promise.all([
    prisma.diagnosticContract.findMany({
      where: { deletedAt: null },
      select: { id: true, number: true, date: true, start: true, finish: true },
      orderBy: { number: 'asc' },
    }),
    calendarRoster(event),
    prisma.diagnosticWork.findMany({
      where: { deletedAt: null },
      select: { id: true, code: true, name: true, hours: true, note: true, ...groupSelect },
      orderBy: [{ groupId: 'asc' }, { sequence: 'asc' }],
    }),
  ]);
  const library = works.flatMap((w) => {
    const category = (Object.keys(categoryNames) as Category[]).find(
      (k) => categoryNames[k] === w.category.name.trim(),
    );
    return category
      ? [
          {
            id: w.id,
            name: w.name,
            code: w.code,
            hours: String(w.hours),
            note: w.note,
            group: w.group.name,
            category,
          },
        ]
      : [];
  });
  return {
    currentUserId,
    employees: roster.employees,
    library,
    contracts: contracts.map((c) => ({
      id: c.id,
      number: c.number,
      start: day(c.start),
      finish: day(c.finish),
      status: contractStatus(day(c.date)!, day(c.finish)),
    })),
  };
}
export async function planningStructures(contractId: number) {
  const links = await prisma.diagnosticContractStructure.findMany({
    where: { contractId, ...scope },
    orderBy: [{ structure: { locationMetres: 'asc' } }, { id: 'asc' }],
    select: {
      id: true,
      structure: {
        select: {
          id: true,
          code: true,
          location: true,
          locationMetres: true,
          roadName: true,
          structureName: true,
          additionalId: true,
          region: true,
        },
      },
    },
  });
  return links.map(({ id, structure: s }) => ({
    ...s,
    linkId: id,
    locationMetres: s.locationMetres === null ? null : Number(s.locationMetres),
  }));
}
const statusOf = (s: string, available: boolean) => (available ? 'unplanned' : diagnosticWorkStatus(s).key);
export async function planningRows(contractId: number, category: Category, links: number[], after: number) {
  const paging = { take: 251, orderBy: { id: 'asc' as const } };
  let rows: PlanRow[];
  if (category === 'structure') {
    const found = await prisma.diagnosticStructureWork.findMany({
      ...paging,
      where: {
        id: { gt: after },
        deletedAt: null,
        contractStructureId: { in: links },
        contractStructure: { ...scope, contractId },
      },
      select: {
        ...assignmentSelect,
        tripId: true,
        workCodeSnapshot: true,
        workNameSnapshot: true,
        contractStructureId: true,
        hours: true,
        catalogHoursSnapshot: true,
        contractStructure: { select: { structure: { select: { code: true } } } },
        work: { select: groupSelect },
        trip: { select: { participants: { select: { user: { select: { fullName: true, login: true } } } } } },
      },
    });
    rows = found.map((w) => {
      const available = w.tripId === null && freeWork(w);
      return {
        id: w.id,
        origin: 'existing',
        category,
        linkId: w.contractStructureId,
        version: w.version,
        isso: w.contractStructure.structure.code,
        code: w.workCodeSnapshot,
        name: w.workNameSnapshot,
        group: w.work.group.name,
        hours: String(w.planHours ?? w.hours ?? w.catalogHoursSnapshot),
        executor:
          w.factExecutor ||
          w.planExecutor ||
          w.trip?.participants.map((p) => p.user.fullName || p.user.login).join(', ') ||
          '',
        status: statusOf(w.status, available),
        available,
      };
    });
  } else {
    const found = await prisma.diagnosticContractWork.findMany({
      ...paging,
      where: {
        id: { gt: after },
        contractId,
        deletedAt: null,
        contract: { deletedAt: null },
        work: {
          category: { name: category === 'other' ? categoryNames.other : { not: categoryNames.other } },
        },
      },
      select: {
        ...assignmentSelect,
        code: true,
        name: true,
        work: { select: { ...groupSelect, hours: true } },
      },
    });
    rows = found.map((w) => ({
      id: w.id,
      origin: 'existing',
      category,
      linkId: null,
      version: w.version,
      isso: '',
      code: w.code,
      name: w.name,
      group: w.work.group.name,
      hours: String(w.planHours ?? w.work.hours),
      executor: w.factExecutor || w.planExecutor,
      status: statusOf(w.status, freeWork(w)),
      available: freeWork(w),
    }));
  }
  const next = rows.length > 250 ? rows[249]!.id : null;
  return { rows: rows.slice(0, 250), next };
}
type Command = {
  requestId: string;
  contractId: number;
  employeeId: number;
  start: string;
  finish: string;
  confirmedStatus: string;
  items: (PlanItem & { autoComplete?: true })[];
};
export function command(body: any): Command {
  if (
    !body ||
    typeof body.requestId !== 'string' ||
    !/^[-a-f0-9]{36}$/i.test(body.requestId) ||
    !tripDay(body.start) ||
    !tripDay(body.finish) ||
    !Array.isArray(body.items) ||
    !body.items.length
  )
    return fail('Укажите договор, период, сотрудника и работы.');
  const items: Command['items'] = body.items.map((x: any) => {
    if (!x || !Object.hasOwn(categoryNames, x.category) || !['existing', 'library'].includes(x.origin))
      return fail('Некорректная работа.');
    if (x.autoComplete !== undefined && typeof x.autoComplete !== 'boolean')
      return fail('Некорректное значение автозавершения.');
    return {
      category: x.category,
      origin: x.origin,
      id: positive(x.id),
      version: x.origin === 'existing' ? positive(x.version) : 0,
      linkId: x.category === 'structure' ? positive(x.linkId) : null,
      ...(x.autoComplete ? { autoComplete: true as const } : {}),
    };
  });
  if (new Set(items.map(itemKey)).size !== items.length) return fail('В перечне есть повторяющиеся работы.');
  return {
    requestId: body.requestId,
    contractId: positive(body.contractId),
    employeeId: positive(body.employeeId),
    start: body.start,
    finish: body.finish,
    confirmedStatus: String(body.confirmedStatus || ''),
    items,
  };
}
export async function savePlanning(event: H3Event, actorId: number, body: unknown) {
  const input = command(body),
    roster = await calendarRoster(event);
  const person = roster.employees.find((e) => e.id === input.employeeId);
  if (!person) return fail('Исполнитель должен входить в группу ОДИС.');
  const resolve = calendarResolver(roster.users);
  const executor = [person.name, roster.users.find((u) => u.id === person.id)?.login].find(
    (s) => s && resolve(s).ids.includes(person.id),
  );
  if (!executor) return fail('Не удалось однозначно определить учётную запись исполнителя.');
  const digest = createHash('sha256').update(JSON.stringify(input)).digest('hex');
  const conflict = () => fail('Работа, сооружение или договор изменились. Откройте форму заново.', 409);
  try {
    return await prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(71924, hashtext(${input.requestId}))`;
        const receipt = await tx.auditLog.findFirst({
          where: { entityType: 'DiagnosticWorkPlan', actorUserId: actorId, requestId: input.requestId },
          select: { note: true },
        });
        if (receipt) {
          if (receipt.note !== digest) return conflict();
          return { count: input.items.length };
        }
        const c = await tx.diagnosticContract.findFirst({
          where: { id: input.contractId, deletedAt: null },
          select: { start: true, finish: true, date: true },
        });
        if (!c) return conflict();
        const status = contractStatus(day(c.date)!, day(c.finish));
        if (status !== 'ACTIVE' && status !== input.confirmedStatus)
          return fail('Подтвердите выбор статуса договора.', 409);
        const invalid = dateIssue({ start: day(c.start), finish: day(c.finish) }, input.start, input.finish);
        if (invalid) return fail(invalid);
        const linkIds = [...new Set(input.items.flatMap((i) => (i.linkId ? [i.linkId] : [])))];
        const links = await tx.diagnosticContractStructure.findMany({
          where: { id: { in: linkIds }, contractId: input.contractId, ...scope },
          select: { id: true, structureId: true },
        });
        if (links.length !== linkIds.length) return conflict();
        const structures = new Map(links.map((l) => [l.id, l.structureId]));
        const existing = input.items.filter((i) => i.origin === 'existing'),
          fresh = input.items.filter((i) => i.origin === 'library');
        const works = await tx.diagnosticWork.findMany({
          where: { id: { in: fresh.map((i) => i.id) }, deletedAt: null },
          select: {
            id: true,
            code: true,
            name: true,
            criteria: true,
            note: true,
            hours: true,
            category: { select: { name: true } },
          },
        });
        const catalog = new Map(works.map((w) => [w.id, w]));
        await tx.$executeRaw`SELECT set_config('odis.employee', ${String(input.employeeId)}, true)`;
        const data = {
          planStart: new Date(input.start),
          planFinish: new Date(input.finish),
          planExecutor: executor,
          status: 'planned',
          updatedById: actorId,
        };
        const newContracts = [],
          newStructures = [];
        for (const i of fresh) {
          const w = catalog.get(i.id);
          if (!w || w.category.name.trim() !== categoryNames[i.category]) return conflict();
          if (isTravel({ ...i, code: w.code }))
            return fail('Командировки планируются в разделе «Командировки».');
          const common = { ...data, autoCompleteHours: i.autoComplete ? w.hours : null, createdById: actorId, workId: w.id, planHours: w.hours, note: w.note };
          if (i.linkId)
            newStructures.push({
              ...common,
              contractStructureId: i.linkId,
              structureId: structures.get(i.linkId)!,
              workCodeSnapshot: w.code,
              workNameSnapshot: w.name,
              criteriaSnapshot: w.criteria,
              catalogHoursSnapshot: w.hours,
              hours: w.hours,
            });
          else
            newContracts.push({
              ...common,
              contractId: input.contractId,
              code: w.code,
              name: w.name,
              criteria: w.criteria,
            });
        }
        const byId = (kind: boolean) =>
          existing.filter((i) => (i.category === 'structure') === kind).map((i) => i.id);
        const contractRows = await tx.diagnosticContractWork.findMany({
          where: { id: { in: byId(false) }, contractId: input.contractId, deletedAt: null },
          select: {
            ...assignmentSelect,
            work: { select: { hours: true, category: { select: { name: true } } } },
          },
        });
        const structureRows = await tx.diagnosticStructureWork.findMany({
          where: {
            id: { in: byId(true) },
            tripId: null,
            deletedAt: null,
            contractStructureId: { in: linkIds },
          },
          select: {
            ...assignmentSelect,
            contractStructureId: true,
            workCodeSnapshot: true,
            work: { select: { hours: true } },
            hours: true,
            catalogHoursSnapshot: true,
          },
        });
        const claimed = new Map(existing.map((i) => [(i.category === 'structure' ? 's' : 'c') + i.id, i]));
        if (
          claimed.size !== existing.length ||
          contractRows.length + structureRows.length !== existing.length
        )
          return conflict();
        // Group equal-hour updates so a selection of several hundred structures stays one short transaction.
        for (const kind of ['contract', 'structure'] as const) {
          const batches = new Map<string, { planHours: string; autoCompleteHours: string | null; rows: { id: number; version: number }[] }>();
          for (const w of kind === 'contract' ? contractRows : structureRows) {
            const row = claimed.get((kind === 'contract' ? 'c' : 's') + w.id)!;
            if (!freeWork(w) || row.version !== w.version) return conflict();
            if ('contractStructureId' in w) {
              if (row.linkId !== w.contractStructureId || isTravel({ ...row, code: w.workCodeSnapshot }))
                return conflict();
            } else if ((row.category === 'other') !== (w.work.category.name === categoryNames.other))
              return conflict();
            const planHours = String(w.planHours ?? ('hours' in w ? w.hours ?? w.catalogHoursSnapshot : w.work.hours));
            const autoCompleteHours = row.autoComplete ? String(w.work.hours) : null;
            const key = JSON.stringify([planHours, autoCompleteHours]);
            const batch = batches.get(key) ?? { planHours, autoCompleteHours, rows: [] };
            batch.rows.push({ id: w.id, version: w.version });
            batches.set(key, batch);
          }
          for (const { planHours, autoCompleteHours, rows } of batches.values()) {
            const args = {
              where: { OR: rows, deletedAt: null },
              data: { ...data, planHours, autoCompleteHours, version: { increment: 1 } },
            };
            const updated =
              kind === 'contract'
                ? await tx.diagnosticContractWork.updateMany(args)
                : await tx.diagnosticStructureWork.updateMany(args);
            if (updated.count !== rows.length) return conflict();
          }
        }
        if (newContracts.length) await tx.diagnosticContractWork.createMany({ data: newContracts });
        if (newStructures.length) await tx.diagnosticStructureWork.createMany({ data: newStructures });
        await tx.auditLog.create({
          data: {
            entityType: 'DiagnosticWorkPlan',
            entityId: input.contractId,
            action: 'CREATE',
            category: 'DATA',
            result: 'SUCCESS',
            resourceKey: 'diagnostic.contracts',
            actorUserId: actorId,
            actorEmail: event.context.usageActor?.email || '',
            targetUserId: input.employeeId,
            requestId: input.requestId,
            note: digest,
            afterData: { start: input.start, finish: input.finish, count: input.items.length },
          },
        });
        return { count: input.items.length };
      },
      { isolationLevel: 'Serializable', timeout: 60000 },
    );
  } catch (e: any) {
    if (e.code === 'P2034') return conflict();
    throw e;
  }
}
