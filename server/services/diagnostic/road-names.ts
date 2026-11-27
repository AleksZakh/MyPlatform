import type { Prisma } from '@prisma/client';
import { canonicalRoads, cleanRoadName, roadKey } from '../../../shared/utils/diagnostic-road-names.mjs';

export async function roadNameResolver(tx: Prisma.TransactionClient, incoming: string[]) {
  const counts = await tx.$queryRaw<{name:string; count:number; referenceCount:number}[]>`
    SELECT "roadName" AS name, count(*)::int AS count,
      (count(*) FILTER (WHERE "importKind" = 'reference'))::int AS "referenceCount"
    FROM diagnostic_structures GROUP BY "roadName"`;
  const existing = canonicalRoads(counts);
  const batch = canonicalRoads(incoming.map(name => ({name, count: 1, referenceCount: 0})));
  return (raw: string) => {
    const key = roadKey(raw);
    if (!key) throw createError({statusCode: 400, message: 'Укажите название автодороги с буквами или цифрами.'});
    return existing.get(key) ?? batch.get(key) ?? cleanRoadName(raw);
  };
}
