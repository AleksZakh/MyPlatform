import {Prisma} from '@prisma/client';
import {createError} from 'h3';

// Synchronize a new assignment with removal of the same structure.
export async function lockStructuresForAssignment(tx:Prisma.TransactionClient, ids:number[], retained?:ReadonlySet<number>) {
  if (!ids.length) return [];
  const uniqueIds = [...new Set(ids)];
  const rows = await tx.$queryRaw<{id:number;code:string;decommissionedAt:Date|null}[]>(Prisma.sql`
    SELECT id, code, "decommissionedAt" FROM diagnostic_structures
    WHERE id IN (${Prisma.join(uniqueIds)}) AND "deletedAt" IS NULL
    ORDER BY id FOR SHARE`);
  if (rows.length !== uniqueIds.length || rows.some(row => row.decommissionedAt && !retained?.has(row.id))) {
    throw createError({statusCode:409, message:'Сооружение удалено или выведено из эксплуатации. Обновите подбор.'});
  }
  return rows;
}
