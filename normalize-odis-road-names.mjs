import { PrismaClient } from '@prisma/client';
import { pathToFileURL } from 'node:url';
import { canonicalRoads, roadKey } from '../shared/utils/diagnostic-road-names.mjs';

export async function normalizeRoads(db, apply, schema) {
  if (!apply) await db.$executeRaw`SET TRANSACTION READ ONLY`;
  if (schema) await db.$queryRaw`SELECT set_config('search_path', quote_ident(${schema}), true)`;
  if (apply) {
    await db.$executeRaw`SELECT pg_advisory_xact_lock(28102026, 1)`;
    await db.$executeRaw`LOCK TABLE diagnostic_structures IN SHARE ROW EXCLUSIVE MODE`;
  }
  const names = await db.$queryRaw`
    SELECT "roadName" AS name, count(*)::int AS count,
      (count(*) FILTER (WHERE "importKind"='reference'))::int AS "referenceCount"
    FROM diagnostic_structures GROUP BY "roadName" ORDER BY "roadName"`;
  const targets = canonicalRoads(names);
  const invalid = names.filter(r => r.name.trim() && !targets.has(roadKey(r.name)));
  const changes = names.map(r => ({ old: r.name, target: targets.get(roadKey(r.name)), count: r.count }))
    .filter(r => r.target && r.old !== r.target);
  if (!changes.length) return { changes, blocked: [], invalid };
  const mapping = JSON.stringify(changes);
  // Use the same SQL expressions, collation and active-row predicate as the provisional identity index.
  const blocked = await db.$queryRaw`
    WITH mapping AS (SELECT * FROM jsonb_to_recordset(${mapping}::jsonb) AS m(old text, target text)),
    projected AS (
      SELECT s.id, m.old IS NOT NULL AS changing, coalesce(m.target, s."roadName") AS name,
        coalesce(s."locationMetres"::text, lower(btrim(s.location))) AS location,
        lower(regexp_replace(btrim(s."structureName"), '\\s+', ' ', 'g')) AS structure,
        lower(regexp_replace(btrim(s."additionalId"), '\\s+', ' ', 'g')) AS extra
      FROM diagnostic_structures s LEFT JOIN mapping m ON m.old = s."roadName"
      WHERE s.code IS NULL AND s."deletedAt" IS NULL AND s."decommissionedAt" IS NULL)
    SELECT min(name) AS target, array_agg(id ORDER BY id) AS ids FROM projected
    GROUP BY lower(regexp_replace(btrim(name), '\\s+', ' ', 'g')), location, structure, extra
    HAVING count(*) > 1 AND bool_or(changing) ORDER BY min(id)`;
  const excluded = new Set(blocked.map(r => roadKey(r.target)));
  const safe = changes.filter(r => !excluded.has(roadKey(r.target)));
  if (apply && safe.length) {
    const count = await db.$executeRaw`
      UPDATE diagnostic_structures AS s
      SET "roadName" = m.target, version = s.version + 1, "updatedAt" = CURRENT_TIMESTAMP, "updatedById" = 0
      FROM jsonb_to_recordset(${JSON.stringify(safe)}::jsonb) AS m(old text, target text)
      WHERE s."roadName" = m.old`;
    if (count !== safe.reduce((n, r) => n + r.count, 0)) throw new Error('Справочник изменился. Повторите сверку.');
  }
  return { changes: safe, blocked, invalid };
}

async function main(args) {
  if (args.includes('--help') || args.length > 1 || args.some(a => a !== '--apply')) {
    console.log('node --env-file=/etc/space/space.env scripts/normalize-odis-road-names.mjs [--apply]');
    console.log('Без флагов выводятся замены. --apply сохраняет проверенные замены.');
    return args.length === 1 && args[0] === '--help' ? 0 : 2;
  }
  if (!process.env.DATABASE_URL) throw new Error('Не задан DATABASE_URL.');
  const db = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
  const apply = args.includes('--apply');
  try {
    const schema = new URL(process.env.DATABASE_URL).searchParams.get('schema');
    const { changes, blocked, invalid } = await db.$transaction(
      tx => normalizeRoads(tx, apply, schema), { isolationLevel: 'Serializable', timeout: 120000, maxWait: 10000 });
    for (const c of changes) console.log(JSON.stringify(c.old), '→', JSON.stringify(c.target), '· карточек:', c.count);
    for (const b of blocked) console.log('Пропущена дорога:', b.target, '· совпали карточки без ИССО:', b.ids.join(', '));
    for (const r of invalid) console.log('Название без букв и цифр требует проверки:', JSON.stringify(r.name));
    console.log(apply ? 'Исправлено карточек:' : 'Карточек к исправлению:', changes.reduce((n,r) => n + r.count, 0));
    return blocked.length || invalid.length ? 3 : 0;
  } finally { await db.$disconnect(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).then(code => { process.exitCode = code; }).catch(e => {
    console.error('Не удалось завершить обработку:', e.message);
    process.exitCode = 1;
  });
}
