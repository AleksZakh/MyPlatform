import { z } from 'zod';
import { contractAccess } from '../access';
import { calendarRoster } from '../calendar-roster';
import { calendarResolver } from '../../../../shared/utils/diagnostic-calendar';
import { progressColumns } from '../../../../shared/utils/diagnostic-progress';
import { writeAuditEvent } from '../../../utils/auditLog';
import { prisma } from '../../../utils/prisma';

const id = z.number().int().positive().max(2147483647);
const text = z
  .string()
  .trim()
  .max(16000)
  .refine((s) => !s.includes('\0'));
const scope = z.object({ contractId: id, linkId: id, version: id });
const request = z.discriminatedUnion('op', [
  scope.extend({
    op: z.literal('link'),
    field: z.enum(['sheetOrdinal', 'specNumber', 'picket', 'stage', 'worklogCrew']),
    value: text,
  }),
  scope.extend({
    op: z.literal('add'),
    column: z.number().int().min(0).max(6),
    workId: id,
    employeeId: id.nullable(),
    note: text,
  }),
]);
const conflict = () =>
  createError({
    statusCode: 409,
    message: 'Данные изменились. Сформируйте отчёт заново и проверьте ячейку.',
  });
export async function saveProgressCell(event: import('h3').H3Event) {
  const actor = await contractAccess(event, 'UPDATE');
  const parsed = request.safeParse(await readBody(event));
  if (!parsed.success) throw createError({ statusCode: 400, message: 'Проверьте значение ячейки.' });
  const body = parsed.data;
  let executor = '';
  if (body.op === 'add' && body.employeeId) {
    const roster = await calendarRoster(event);
    const user = roster.employees.find((p) => p.id === body.employeeId);
    const resolve = calendarResolver(roster.users);
    executor =
      [user?.name, roster.users.find((u) => u.id === user?.id)?.login].find(
        (name) => name && user && resolve(name).ids.includes(user.id),
      ) || '';
    if (!executor) throw createError({ statusCode: 400, message: 'Выберите сотрудника группы ОДИС.' });
  }
  return prisma
    .$transaction(
      async (tx) => {
        const parent = await tx.diagnosticContract.updateMany({
          where: { id: body.contractId, deletedAt: null, version: body.version },
          data: { version: { increment: 1 }, updatedById: actor.userId },
        });
        if (!parent.count) throw conflict();
        const link = await tx.diagnosticContractStructure.findFirst({
          where: {
            id: body.linkId,
            contractId: body.contractId,
            deletedAt: null,
            structure: { deletedAt: null, decommissionedAt: null },
          },
          include: { contract: { select: { stages: true } } },
        });
        if (!link) throw conflict();
        let entityId = link.id,
          changes: Record<string, { before: unknown; after: unknown }> = {};
        if (body.op === 'link') {
          const value = body.field === 'stage' ? Number(body.value) : body.value;
          if (
            typeof value === 'number' &&
            (!Number.isInteger(value) || value < 1 || value > link.contract.stages)
          )
            throw createError({ statusCode: 400, message: 'Выберите этап в пределах договора.' });
          if (
            body.field === 'worklogCrew' &&
            (await tx.diagnosticTripStructure.count({
              where: {
                structureId: link.structureId,
                trip: { contractId: link.contractId, deletedAt: null },
              },
            }))
          )
            throw conflict();
          await tx.diagnosticContractStructure.update({
            where: { id: link.id },
            data: {
              [body.field]: value,
              ...(body.field === 'worklogCrew' ? { worklogCrewEdited: true } : {}),
            },
          });
          changes = { [body.field]: { before: link[body.field], after: value } };
        } else {
          const work = await tx.diagnosticWork.findFirst({
            where: { id: body.workId, groupId: 3, deletedAt: null },
          });
          if (!work || !progressColumns(work).includes(body.column) || ['301', '302'].includes(work.code))
            throw createError({
              statusCode: 400,
              message: 'Выберите работу из категории этой ячейки. Выезды связываются через командировки.',
            });
          const existing = await tx.diagnosticStructureWork.count({
            where: { contractStructureId: link.id, workId: work.id, deletedAt: null },
          });
          if (existing)
            throw createError({
              statusCode: 409,
              message: 'Назначение уже есть. Снимите фильтры и откройте существующую работу.',
            });
          if (body.column === 3 && !executor) {
            const sources = await tx.diagnosticStructureWork.findMany({
              where: { contractStructureId: link.id, deletedAt: null },
              select: {
                planExecutor: true,
                factExecutor: true,
                worklogCell: true,
                work: { select: { code: true, reportPart: true, fieldWork: true } },
              },
            });
            const owners = new Set(
              sources
                .filter((a) => progressColumns(a.work, a.worklogCell).includes(4))
                .map((a) => a.factExecutor || a.planExecutor)
                .filter(Boolean),
            );
            if (owners.size === 1) executor = [...owners][0]!;
          }
          const row = await tx.diagnosticStructureWork.create({
            data: {
              contractStructureId: link.id,
              structureId: link.structureId,
              workId: work.id,
              workNameSnapshot: work.name,
              workCodeSnapshot: work.code,
              catalogHoursSnapshot: work.hours,
              criteriaSnapshot: work.criteria,
              status: executor ? 'planned' : 'unplanned',
              planExecutor: executor,
              note: body.note,
              createdById: actor.userId,
              updatedById: actor.userId,
            },
          });
          entityId = row.id;
          changes = {
            workId: { before: null, after: work.id },
            planExecutor: { before: null, after: executor },
            note: { before: null, after: body.note },
          };
        }
        await writeAuditEvent({
          event,
          db: tx,
          category: 'DATA',
          result: 'SUCCESS',
          resourceKey: 'diagnostic.contracts',
          actorUserId: actor.userId,
          action: body.op === 'add' ? 'CREATE' : 'UPDATE',
          entityType: body.op === 'add' ? 'DiagnosticStructureWork' : 'DiagnosticContractStructure',
          entityId,
          note: 'Ход работ',
          changes: changes as Parameters<typeof writeAuditEvent>[0]['changes'],
        });
        return { id: entityId };
      },
      { isolationLevel: 'Serializable' },
    )
    .catch((e) => {
      if (e?.code === 'P2034' || e?.code === 'P2025') throw conflict();
      throw e;
    });
}
