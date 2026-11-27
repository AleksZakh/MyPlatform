import { roadKey } from '../../../shared/utils/diagnostic-road-names.mjs';
import type { Prisma } from '@prisma/client';
import { locationKey, normalized } from '../../../shared/utils/diagnostic-worklog';
import { structureLocationMetres } from '../../../shared/utils/diagnostic-structures';

export interface Lookup {
  code: string;
  roadName: string;
  location: string;
  structureName: string;
  additionalId: string;
}
export function identity(r: Omit<Lookup, 'code'>) {
  return JSON.stringify([
    roadKey(r.roadName),
    locationKey(r.location),
    normalized(r.structureName),
    normalized(r.additionalId),
  ]);
}
export async function structureMatcher(tx: Prisma.TransactionClient, rows: Lookup[]) {
  const codes = [...new Set(rows.map((r) => r.code).filter(Boolean))];
  const metres = rows.map((r) => structureLocationMetres(r.location)).filter((n): n is number => n !== null);
  const hits = await tx.diagnosticStructure.findMany({
    where: {
      OR: [
        { code: { in: codes } },
        { locationMetres: { in: metres } },
        { location: { in: rows.map((r) => r.location) } },
      ],
    },
  });
  const byCode = new Map(hits.filter((r) => r.code).map((r) => [r.code!, r]));
  const byPlace = new Map<string, typeof hits>();
  for (const hit of hits) {
    const key = locationKey(hit.location);
    const group = byPlace.get(key);
    if (group) group.push(hit);
    else byPlace.set(key, [hit]);
  }
  return (r: Lookup) => {
    const atPlace = (byPlace.get(locationKey(r.location)) || []).filter(
      (s) => roadKey(s.roadName) === roadKey(r.roadName),
    );
    const exact = atPlace.filter((s) => identity(s) === identity(r));
    const coded = r.code ? byCode.get(r.code) : undefined;
    if (coded) {
      if (exact.some((s) => s.id !== coded.id && !s.code && !s.deletedAt && !s.decommissionedAt))
        return { state: 'conflict', matches: [coded, ...exact.filter((s) => s.id !== coded.id)] } as const;
      return {
        state: coded.deletedAt || coded.decommissionedAt ? 'archived' : 'match',
        matches: [coded],
      } as const;
    }
    if (exact.length > 1 || exact.some((s) => r.code && s.code && r.code !== s.code))
      return { state: 'conflict', matches: exact } as const;
    if (exact[0])
      return {
        state: exact[0].deletedAt || exact[0].decommissionedAt ? 'archived' : 'match',
        matches: exact,
      } as const;
    const near = atPlace.filter((s) => !s.deletedAt && !s.decommissionedAt && (!r.code || !s.code));
    return { state: 'new', matches: [], near } as const;
  };
}
