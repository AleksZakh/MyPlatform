import { createError, type H3Event } from 'h3';
import { z } from 'zod';
import { prisma } from '../../utils/prisma';
import { writeAuditEvent } from '../../utils/auditLog';
import { tripHash } from './trip-data';
import { lockStructuresForAssignment } from './structure-availability';
const pos = z.number().int().positive().max(2147483647);
const confirm = z.object({
  contractId: pos,
  tripId: pos,
  version: pos,
  structureIds: z.array(pos).nonempty().max(20000),
});
const conflict = (message: string) => createError({ statusCode: 409, message });
const day = (date: Date) => date.toISOString().slice(0, 10);
export async function visitReview(contractId: number) {
  const contract = await prisma.diagnosticContract.findFirst({
    where: { id: contractId, deletedAt: null, direction: 'INCOME' },
    select: { number: true, date: true },
  });
  if (!contract) throw createError({ statusCode: 404, message: 'Доходный договор недоступен.' });
  const [trips, links] = await Promise.all([
    prisma.diagnosticTrip.findMany({
      where: { contractId, deletedAt: null },
      orderBy: [{ start: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        version: true,
        number: true,
        status: true,
        start: true,
        finish: true,
        destination: true,
        assignment: true,
        noStructures: true,
        participants: { select: { user: { select: { fullName: true, login: true } } } },
        structures: { select: { structureId: true, confirmedAt: true } },
      },
    }),
    prisma.diagnosticContractStructure.findMany({
      where: { contractId, deletedAt: null, structure: { deletedAt: null, decommissionedAt: null } },
      orderBy: [{ structure: { locationMetres: 'asc' } }, { id: 'asc' }],
      select: {
        structureId: true,
        worklogCrew: true,
        structure: {
          select: { code: true, structureName: true, additionalId: true, location: true, roadName: true },
        },
      },
    }),
  ]);
  const visited = new Map<number, string[]>();
  for (const t of trips)
    for (const l of t.structures) {
      const list = visited.get(l.structureId) || [];
      list.push(t.number);
      visited.set(l.structureId, list);
    }
  return {
    contract: contract.number,
    date: day(contract.date),
    trips: trips
      .filter((t) => t.noStructures || !t.structures.length || t.structures.some((s) => s.confirmedAt))
      .map((t) => ({
        id: t.id,
        version: t.version,
        number: t.number,
        start: day(t.start),
        finish: day(t.finish),
        status: t.status,
        destination: t.destination,
        assignment: t.assignment,
        participants: t.participants.map((p) => p.user.fullName || p.user.login || '').filter(Boolean),
        structureIds: t.structures.map((s) => s.structureId),
      })),
    structures: links.map((l) => ({
      id: l.structureId,
      label: [
        l.structure.code || 'Без ИССО',
        l.structure.location,
        l.structure.structureName,
        l.structure.additionalId,
        l.structure.roadName,
      ]
        .filter(Boolean)
        .join(' · '),
      crew: l.worklogCrew || '',
      visits: visited.get(l.structureId) || [],
    })),
  };
}
export type VisitReview = Awaited<ReturnType<typeof visitReview>>;
export async function confirmVisit(event: H3Event, actor: number, value: unknown) {
  const parsed = confirm.safeParse(value);
  if (!parsed.success) throw createError({ statusCode: 400, message: 'Выберите командировку и сооружения.' });
  const { contractId, tripId, version, structureIds } = parsed.data;
  const ids = [...new Set(structureIds)];
  return prisma.$transaction(
    async (tx) => {
      const trip = await tx.diagnosticTrip.findFirst({
        where: {
          id: tripId,
          contractId,
          deletedAt: null,
          contract: { direction: 'INCOME', deletedAt: null },
        },
        include: {
          participants: { select: { userId: true } },
          structures: { select: { structureId: true, confirmedAt: true } },
        },
      });
      if (!trip) throw conflict('Командировка недоступна в выбранном договоре.');
      const current = new Set(trip.structures.map((s) => s.structureId)),
        add = ids.filter((id) => !current.has(id));
      if (!add.length) return { added: 0 };
      if (
        trip.version !== version ||
        (!trip.noStructures && current.size && !trip.structures.some((s) => s.confirmedAt))
      )
        throw conflict('Командировка изменилась. Повторите сверку.');
      await lockStructuresForAssignment(tx, add);
      const links = await tx.diagnosticContractStructure.count({
        where: { contractId, structureId: { in: add }, deletedAt: null },
      });
      if (links !== add.length) throw conflict('Проверьте, что все выбранные сооружения входят в договор.');
      const changed = {
        ...trip,
        start: day(trip.start),
        finish: day(trip.finish),
        noStructures: false,
        structureIds: [...current, ...add],
        participantIds: trip.participants.map((u) => u.userId),
      };
      const key = tripHash(changed, trip.status);
      const same = await tx.diagnosticTrip.findFirst({
        where: {
          id: { not: tripId },
          deletedAt: null,
          contentKey: { in: [tripHash(changed, 'PLANNED'), tripHash(changed, 'COMPLETED')] },
        },
      });
      if (same) throw conflict('С таким составом в договоре уже есть командировка ' + same.number + '.');
      const updated = await tx.diagnosticTrip.updateMany({
        where: { id: tripId, version, deletedAt: null },
        data: { noStructures: false, contentKey: key, updatedById: actor, version: { increment: 1 } },
      });
      if (updated.count !== 1) throw conflict('Командировка изменилась. Повторите сверку.');
      await tx.diagnosticTripStructure.createMany({
        data: add.map((structureId) => ({
          tripId,
          structureId,
          confirmedAt: new Date(),
          confirmedById: actor,
        })),
      });
      await writeAuditEvent({
        event,
        db: tx,
        actorUserId: actor,
        category: 'DATA',
        result: 'SUCCESS',
        action: 'UPDATE',
        resourceKey: 'diagnostic.contracts',
        entityType: 'DiagnosticTrip',
        entityId: tripId,
        note: 'Сверка «Хода работ»: подтверждено посещение сооружений.',
        changes: { structureIds: { before: [...current], after: changed.structureIds } },
      });
      return { added: add.length };
    },
    { isolationLevel: 'Serializable' },
  );
}
