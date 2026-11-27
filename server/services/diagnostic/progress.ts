import { createHash } from 'node:crypto';
import { createError, type H3Event } from 'h3';
import { z } from 'zod';
import { prisma } from '../../utils/prisma';
import { calendarResolver } from '../../../shared/utils/diagnostic-calendar';
import { diagnosticWorkStatus, workStatusLegend } from '../../../shared/utils/diagnostic-contract-table';
import { reportCenters } from '../../../shared/utils/diagnostic-reports';
import { workColumns } from '../../../shared/utils/diagnostic-worklog';
import {
  progressColumns,
  type ProgressReport,
  type ProgressRow,
  type ProgressWork,
} from '../../../shared/utils/diagnostic-progress';
import { structureAccess } from './structure-access';
import { calendarRoster } from './calendar-roster';
import { reportRoster } from './reports/roster';

const ids = z.array(z.number().int().positive().max(2147483647));
const filters = z.object({
  contracts: ids.min(1),
  links: ids,
  statuses: z.array(z.enum([...workStatusLegend.map((s) => s.key), 'unknown'])),
  centers: z.array(z.enum(reportCenters)),
});
export async function progressReport(
  event: H3Event,
  input: unknown,
  forExport = false,
): Promise<ProgressReport> {
  await structureAccess(event);
  const parsed = filters.safeParse(input);
  if (!parsed.success)
    throw createError({ statusCode: 400, message: 'Проверьте договоры и фильтры отчёта.' });
  const f = parsed.data;
  const people = f.centers.length
    ? reportRoster(event)
    : forExport
      ? { employees: [], users: [], warning: null }
      : calendarRoster(event).then((r) => ({
          ...r,
          employees: r.employees.map((p) => ({ ...p, center: null })),
        }));
  const [roster, data] = await Promise.all([
    people,
    prisma.$transaction(
      async (tx) => {
        const contracts = await tx.diagnosticContract.findMany({
          where: { id: { in: f.contracts }, deletedAt: null },
          select: { id: true, number: true, version: true, stages: true },
          orderBy: [{ number: 'asc' }, { id: 'asc' }],
        });
        if (contracts.length !== new Set(f.contracts).size)
          throw createError({ statusCode: 409, message: 'Обновите список договоров.' });
        const links = await tx.diagnosticContractStructure.findMany({
          where: {
            contractId: { in: f.contracts },
            deletedAt: null,
            structure: { deletedAt: null },
            ...(f.links.length ? { id: { in: f.links } } : {}),
          },
          select: {
            id: true,
            contractId: true,
            stage: true,
            progressOrder: true,
            sheetOrdinal: true,
            specNumber: true,
            picket: true,
            worklogCrew: true,
            worklogActive: true,
            structure: {
              select: {
                id: true,
                version: true,
                code: true,
                roadName: true,
                location: true,
                structureName: true,
                additionalId: true,
                lengthRaw: true,
                note: true,
                decommissionedAt: true,
              },
            },
            workAssignments: {
              where: { deletedAt: null },
              orderBy: { id: 'asc' },
              select: {
                id: true,
                version: true,
                workId: true,
                workNameSnapshot: true,
                note: true,
                status: true,
                planExecutor: true,
                factExecutor: true,
                tripId: true,
                tripCompletion: { select: { tripId: true } },
                worklogCell: true,
                work: { select: { code: true, fieldWork: true, reportPart: true } },
              },
            },
          },
          orderBy: [
            { contract: { number: 'asc' } },
            { contractId: 'asc' },
            { progressOrder: { sort: 'asc', nulls: 'last' } },
            { structure: { locationMetres: 'asc' } },
            { id: 'asc' },
          ],
        });
        const trips = await tx.diagnosticTripStructure.findMany({
          where: {
            trip: { contractId: { in: f.contracts }, deletedAt: null },
            structure: {
              contracts: {
                some: {
                  contractId: { in: f.contracts },
                  deletedAt: null,
                  ...(f.links.length ? { id: { in: f.links } } : {}),
                },
              },
            },
          },
          select: {
            structureId: true,
            trip: {
              select: {
                id: true,
                contractId: true,
                number: true,
                status: true,
                participants: {
                  orderBy: { userId: 'asc' },
                  select: { user: { select: { fullName: true, login: true } } },
                },
              },
            },
          },
          orderBy: { tripId: 'asc' },
        });
        const catalog = await tx.diagnosticWork.findMany({
          where: { deletedAt: null, groupId: 3 },
          select: { id: true, name: true, code: true, reportPart: true, fieldWork: true },
          orderBy: { code: 'asc' },
        });
        return { contracts, links, trips, catalog };
      },
      { isolationLevel: 'RepeatableRead', timeout: 60000 },
    ),
  ]);
  const resolver = calendarResolver(roster.users),
    centers = new Map(roster.employees.map((p) => [p.id, p.center]));
  function matches(status: string, names: string) {
    return (
      (!f.statuses.length || f.statuses.includes(diagnosticWorkStatus(status).key)) &&
      (!f.centers.length ||
        resolver(names).ids.some((id) => {
          const center = centers.get(id);
          return center && f.centers.includes(center);
        }))
    );
  }
  const byContract = new Map(data.contracts.map((c) => [c.id, c]));
  const byPair = new Map<string, typeof data.trips>();
  for (const item of data.trips) {
    const key = item.trip.contractId + '/' + item.structureId;
    const list = byPair.get(key) ?? [];
    list.push(item);
    byPair.set(key, list);
  }
  const rows: ProgressRow[] = [];
  const counts = new Map<number, number>();
  for (const link of data.links) {
    const c = byContract.get(link.contractId)!,
      s = link.structure;
    const works: ProgressWork[][] = workColumns.map(() => []);
    let active = link.worklogActive === true;
    const trips = byPair.get(c.id + '/' + s.id) ?? [];
    const managedIds = new Set(trips.map((t) => t.trip.id));
    for (const a of link.workAssignments) {
      if (['completed', 'in_progress'].includes(diagnosticWorkStatus(a.status).key)) active = true;
      const tripId = a.tripId ?? a.tripCompletion?.tripId;
      if (tripId && managedIds.has(tripId)) continue;
      if (!matches(a.status, a.factExecutor || a.planExecutor)) continue;
      for (const column of progressColumns(a.work, a.worklogCell)) {
        const who = a.factExecutor || a.planExecutor;
        const details = column === 3 ? a.note : [who, a.note].filter(Boolean).join(' · ');
        const text =
          column === 0 || column === 4
            ? [a.workNameSnapshot, details].filter(Boolean).join(' · ')
            : details || a.workNameSnapshot;
        works[column]!.push({
          kind: 'work',
          id: a.id,
          version: a.version,
          workId: a.workId,
          name: a.workNameSnapshot,
          plan: a.planExecutor,
          fact: a.factExecutor,
          note: a.note,
          status: a.status,
          managed: !!tripId,
          text,
        });
      }
    }
    for (const { trip } of trips) {
      const names = trip.participants
        .map((p) => p.user.fullName || p.user.login)
        .filter(Boolean)
        .join(', ');
      const status =
        (
          {
            COMPLETED: 'completed',
            PLANNED: 'planned',
            IN_PROGRESS: 'in_progress',
            ACTIVE: 'in_progress',
            OVERDUE: 'overdue',
          } as Record<string, string>
        )[trip.status] || trip.status.toLowerCase();
      if (status === 'completed' || status === 'in_progress') active = true;
      if (matches(status, names))
        works[0]!.push({
          kind: 'trip',
          id: trip.id,
          version: 0,
          workId: 0,
          name: trip.number,
          plan: names,
          fact: '',
          note: '',
          status,
          managed: true,
          text: [trip.number, names].filter(Boolean).join(' · '),
        });
    }
    if (link.worklogCrew && !trips.length && matches('', link.worklogCrew))
      works[0]!.push({
        kind: 'crew',
        id: link.id,
        version: c.version,
        workId: 0,
        name: 'Бригада по листу',
        plan: link.worklogCrew,
        fact: '',
        note: '',
        status: '',
        managed: false,
        text: 'Бригада по листу · ' + link.worklogCrew,
      });
    const index = (counts.get(c.id) ?? 0) + 1;
    counts.set(c.id, index);
    if ((f.statuses.length || f.centers.length) && !works.some((cell) => cell.length)) continue;
    const ordinal = link.sheetOrdinal ?? String(index);
    rows.push({
      linkId: link.id,
      contractId: c.id,
      contractNumber: c.number,
      contractVersion: c.version,
      stages: c.stages,
      stage: link.stage,
      sheetOrdinal: ordinal,
      specNumber: link.specNumber ?? '',
      picket: link.picket ?? '',
      worklogCrew: link.worklogCrew ?? '',
      active,
      works,
      structure: {
        id: s.id,
        version: s.version,
        code: s.code ?? '',
        roadName: s.roadName,
        location: s.location,
        structureName: s.structureName,
        additionalId: s.additionalId,
        lengthRaw: s.lengthRaw,
        note: s.note,
        retired: !!s.decommissionedAt,
      },
      values: [
        ordinal,
        link.specNumber ?? '',
        String(link.stage),
        s.structureName + (s.additionalId ? ' (' + s.additionalId + ')' : ''),
        s.location,
        link.picket ?? '',
        s.code ?? '',
        s.lengthRaw,
        ...works.map((cell) => cell.map((e) => e.text).join('\n')),
        s.note,
      ],
    });
  }
  const contracts = data.contracts.map(({ id, number }) => ({ id, number }));
  const token = createHash('sha256')
    .update(JSON.stringify([contracts, rows.map((r) => [r.linkId, r.values, r.active])]))
    .digest('hex');
  return {
    rows,
    contracts,
    token,
    employees: roster.employees.map(({ id, name }) => ({ id, name })),
    warning: roster.warning,
    catalog: data.catalog
      .map((w) => ({
        id: w.id,
        name: w.name,
        columns: progressColumns(w).filter((col) => col !== 0 || !['301', '302'].includes(w.code)),
      }))
      .filter((w) => w.columns.length),
  };
}
