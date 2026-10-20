import type { Prisma } from '@prisma/client';
import { compareWorkTasks, workDateFields, type WorkTaskOrder } from '../../../shared/utils/work-order';

/** Merge disjoint date streams before pagination; apply the same access filter to every stream.
 * Only IDs/dates are fetched here, at most four page prefixes, not all task contents.
 */
export async function orderedTaskIds(db: Prisma.TransactionClient, where: Prisma.WorkTaskWhereInput,
  order: WorkTaskOrder, page: number, pageSize = 100): Promise<number[]> {
  const fields = workDateFields(order);
  const take = page * pageSize;
  const select = { id: true, plannedDate: true, startDate: true, dueDate: true } as const;
  const streams = await Promise.all([...fields, null].map((field, index) => {
    const absent = fields.slice(0, index).map(key => ({ [key]: null }));
    const orderBy: Prisma.WorkTaskOrderByWithRelationInput[] = [
      ...(field ? [{ [field]: { sort: 'asc', nulls: 'last' } }] : []),
      ...['dueDate', 'startDate', 'plannedDate'].filter(key => key !== field)
        .map(key => ({ [key]: { sort: 'asc', nulls: 'last' } })),
      { id: 'asc' },
    ] as Prisma.WorkTaskOrderByWithRelationInput[];
    return db.workTask.findMany({ where: { AND: [where, ...absent, ...(field ? [{ [field]: { not: null } }] : [])] },
      select, orderBy, take });
  }));
  return streams.flat().sort((a, b) => compareWorkTasks(a, b, order))
    .slice((page - 1) * pageSize, take).map(task => task.id);
}
