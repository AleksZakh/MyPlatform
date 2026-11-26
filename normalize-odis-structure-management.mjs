// Run from the Space project with DATABASE_URL set. The default mode is read-only.
import {PrismaClient} from '@prisma/client';

const args = process.argv.slice(2);
if (args.includes('--help') || args.some(arg => arg !== '--apply') || args.length > 1) {
  console.log('Использование: node scripts/normalize-odis-structure-management.mjs [--apply]');
  console.log('Без параметров выводится список замен. --apply применяет их одной транзакцией.');
  process.exit(args.length === 1 && args[0] === '--help' ? 0 : 2);
}

const apply = args[0] === '--apply';
const prisma = new PrismaClient();
const leadingQuotes = /^\s*["'«»“”„‟‘’‚]["'«»“”„‟‘’‚\s]*/u;

async function collectReplacements(db) {
  const names = await db.diagnosticStructure.groupBy({
    by:['management'], _count:{_all:true}, orderBy:{management:'asc'},
  });
  const groups = new Map();
  for (const {management, _count} of names) {
    const key = management.replace(leadingQuotes, '');
    if (!key.trim()) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({name:management, count:_count._all});
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
  const changes = await prisma.$transaction(async db => {
    const plan = await collectReplacements(db);
    if (apply) {
      for (const {from, to, count} of plan) {
        const result = await db.diagnosticStructure.updateMany({
          where:{management:from}, data:{management:to, version:{increment:1}},
        });
        if (result.count !== count) throw new Error('Состав записей изменился. Повторите проверку.');
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
  console.error('Не удалось завершить обработку:', error.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
