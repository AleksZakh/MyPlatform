// Run from the Space project with DATABASE_URL set. The default mode is read-only.
import {PrismaClient} from '@prisma/client';

const args = process.argv.slice(2);
if (args.includes('--help') || args.some(arg => arg !== '--apply') || args.length > 1) {
  console.log('Использование: node --env-file=/etc/space/space.env ' + process.argv[1] + ' [--apply]');
  console.log('Без параметров выводится список замен. --apply применяет их одной транзакцией.');
  process.exit(args.length === 1 && args[0] === '--help' ? 0 : 2);
}

const apply = args[0] === '--apply';
if (!process.env.DATABASE_URL) {
  console.error('Не задан DATABASE_URL. Укажите файл окружения Space через --env-file.');
  process.exit(1);
}
const prisma = new PrismaClient({datasourceUrl:process.env.DATABASE_URL});
const leadingQuotes = /^\s*["'«»“”„‟‘’‚]["'«»“”„‟‘’‚\s]*/u;

async function collectReplacements(db) {
  const names = await db.$queryRaw`
    SELECT management, COUNT(*)::integer AS count
    FROM diagnostic_structures
    GROUP BY management
    ORDER BY management`;
  const groups = new Map();
  for (const {management, count} of names) {
    const key = management.replace(leadingQuotes, '');
    if (!key.trim()) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({name:management, count});
  }

  const replacements = [];
  for (const variants of groups.values()) {
    if (variants.length < 2) continue;
    // Keep an existing spelling. An inner or closing quote may be part of the legal name.
    // Sorting by length prefers the exact unquoted name. Ties retain the DB name order.
    variants.sort((a,b) => a.name.length - b.name.length);
    const target = variants[0].name;
    for (const {name, count} of variants) {
      if (name !== target) replacements.push({from:name, to:target, count});
    }
  }
  return replacements;
}

try {
  const schema = new URL(process.env.DATABASE_URL).searchParams.get('schema');
  const changes = await prisma.$transaction(async db => {
    if (!apply) await db.$executeRaw`SET TRANSACTION READ ONLY`;
    if (schema) {
      await db.$queryRaw`SELECT pg_catalog.set_config('search_path', pg_catalog.quote_ident(${schema}), true)`;
    }
    const plan = await collectReplacements(db);
    if (apply) {
      for (const {from, to, count} of plan) {
        const updated = await db.$executeRaw`
          UPDATE diagnostic_structures
          SET management = ${to}, version = version + 1, "updatedAt" = CURRENT_TIMESTAMP
          WHERE management = ${from}`;
        if (updated !== count) throw new Error('Состав записей изменился. Повторите проверку.');
      }
    }
    return plan;
  }, {isolationLevel:'Serializable', timeout:120_000});

  for (const {from, to, count} of changes) {
    console.log(JSON.stringify(from), '→', JSON.stringify(to), '· сооружений:', count);
  }
  const count = changes.reduce((sum, item) => sum + item.count, 0);
  console.log(apply ? 'Исправлено записей:' : 'К исправлению записей:', count);
} catch (error) {
  const detail = error.meta?.code === '42P01'
    ? 'В выбранной БД или схеме отсутствует таблица diagnostic_structures. Проверьте подключение к БД Space и применённые миграции ОДИС.'
    : error.message;
  console.error('Не удалось завершить обработку:', detail);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
