import { visitReview } from '../../../services/diagnostic/worklog-trips';
import { id } from '../../../services/diagnostic/input';
import { contractAccess } from '../../../services/diagnostic/access';
import { workAccess } from '../../../services/diagnostic/work-access';
import { structureAccess } from '../../../services/diagnostic/structure-access';
import { prisma } from '../../../utils/prisma';
export default defineEventHandler(async (event) => {
  await contractAccess(event, 'VIEW');
  await structureAccess(event);
  if (getQuery(event).source === 'visitReview') return visitReview(id(getQuery(event).contractId));
  await workAccess(event, 'VIEW');
  const [works, roads, parties, contracts] = await Promise.all([
    prisma.diagnosticWork.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, code: true, fieldWork: true },
      orderBy: { code: 'asc' },
    }),
    prisma.diagnosticStructure.findMany({
      where: { deletedAt: null, decommissionedAt: null },
      distinct: ['roadName'],
      select: { roadName: true },
      orderBy: { roadName: 'asc' },
    }),
    prisma.diagnosticCounterparty.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.diagnosticContract.findMany({
      where: { direction: 'INCOME', deletedAt: null },
      select: { id: true, number: true, date: true, counterparty: { select: { name: true } } },
      orderBy: [{ date: 'desc' }, { number: 'asc' }],
    }),
  ]);
  return {
    works,
    contracts: contracts.map((c) => ({
      id: c.id,
      number: c.number,
      date: c.date.toISOString().slice(0, 10),
      party: c.counterparty.name,
    })),
    roads: roads.map((r) => r.roadName).filter(Boolean),
    parties,
  };
});
