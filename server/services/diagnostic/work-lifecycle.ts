import { Prisma } from '@prisma/client';
import { prisma } from '../../utils/prisma';

const batchSize = 250;
const moscowToday = Prisma.sql`(CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Moscow')::date`;

// Both assignment tables store the same plan, fact and status columns.
export function dueWorkBatch(kind: 'contract' | 'structure') {
  const structure = kind === 'structure';
  const table = structure ? Prisma.sql`diagnostic_structure_works` : Prisma.sql`diagnostic_contract_works`;
  const parent = structure
    ? Prisma.sql`EXISTS (
        SELECT 1 FROM diagnostic_contract_structures link
        JOIN diagnostic_contracts c ON c.id = link."contractId" AND c."deletedAt" IS NULL
        JOIN diagnostic_structures s ON s.id = link."structureId" AND s."deletedAt" IS NULL
        WHERE link.id = w."contractStructureId" AND link."deletedAt" IS NULL
      ) AND w."tripId" IS NULL`
    : Prisma.sql`EXISTS (SELECT 1 FROM diagnostic_contracts c WHERE c.id = w."contractId" AND c."deletedAt" IS NULL)`;
  const planned = Prisma.sql`lower(trim(w.status)) IN ('planned','scheduled')`;
  const dueDate = Prisma.sql`CASE WHEN ${planned}
    THEN w."planStart" ELSE w."planFinish" END`;

  return Prisma.sql`
    WITH due AS (
      SELECT w.id,
        CASE WHEN w."planFinish" IS NULL OR w."planFinish" >= ${moscowToday} THEN 'in_progress'
             WHEN w."autoCompleteHours" IS NULL THEN 'overdue'
             ELSE 'completed' END AS next
      FROM ${table} w
      WHERE w."deletedAt" IS NULL AND w."factFinish" IS NULL
        AND lower(trim(w.status)) IN ('planned','scheduled','active','performed','in_progress')
        AND ${dueDate} <= ${moscowToday}
        AND (${planned} OR w."planFinish" < ${moscowToday})
        AND ${parent}
      ORDER BY ${dueDate}, w.id
      LIMIT ${batchSize} FOR UPDATE OF w SKIP LOCKED
    )
    UPDATE ${table} w SET status = due.next,
      "factStart" = CASE WHEN due.next = 'completed' THEN coalesce(w."factStart", w."planStart") ELSE w."factStart" END,
      "factFinish" = CASE WHEN due.next = 'completed' THEN w."planFinish" ELSE w."factFinish" END,
      "factHours" = CASE WHEN due.next = 'completed' THEN w."autoCompleteHours" ELSE w."factHours" END,
      "factExecutor" = CASE WHEN due.next = 'completed' AND trim(w."factExecutor") = ''
                            THEN w."planExecutor" ELSE w."factExecutor" END,
      version = w.version + 1, "updatedAt" = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')
    FROM due WHERE w.id = due.id`;
}

export async function advanceDueWorks() {
  return prisma.$transaction(async (tx) => {
    const [gate] = await tx.$queryRaw<{ locked: boolean }[]>`SELECT pg_try_advisory_xact_lock(71924, -48210) AS locked`;
    if (!gate?.locked) return false;
    const contracts = await tx.$executeRaw(dueWorkBatch('contract'));
    const structures = await tx.$executeRaw(dueWorkBatch('structure'));
    return contracts === batchSize || structures === batchSize;
  }, { timeout: 15000 });
}
