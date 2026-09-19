import 'dotenv/config';

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { PrismaClient } from '@prisma/client';
import { parse } from 'csv-parse/sync';

const prisma = new PrismaClient();

const IMPORT_SOURCE = 'Reestr_1509.csv';
const IMPORT_AUTHOR = 'legacy-import@system';
const IMPORT_CHUNK_SIZE = 4;

// ============================================
// СЛОВАРЬ НОРМАЛИЗАЦИИ ПРОИЗВОДИТЕЛЕЙ
// Сохранён из прежнего seed_importData.ts
// ============================================
const manufacturerNormalization: Record<string, string> = {
  // Группа: ООО СУ-910
  'ООО СУ910': 'ООО СУ-910',
  'ООО СУ 910': 'ООО СУ-910',
  'ООО СУ-910': 'ООО СУ-910',
  'ООО "СУ910"': 'ООО СУ-910',
  'ООО "СУ 910"': 'ООО СУ-910',
  'ООО "СУ-910"': 'ООО СУ-910',
  'ООО СУ 910 ': 'ООО СУ-910',
  'ООО Строительное управление №910': 'ООО СУ-910',
  'Строительное управление №910': 'ООО СУ-910',

  // Группа: ООО СУ-926
  'ООО СУ№926': 'ООО СУ-926',
  'ООО СУ №926': 'ООО СУ-926',
  'ООО "СУ№926"': 'ООО СУ-926',
  'ООО "СУ №926"': 'ООО СУ-926',
  'ООО СУ-926': 'ООО СУ-926',

  // Группа: ООО Трансстроймеханизация
  'ООО НПС//Трансстроймеханизация': 'ООО Трансстроймеханизация',
  'ООО Трансстроймеханизация': 'ООО Трансстроймеханизация',
  'ООО "Трансстроймеханизация"': 'ООО Трансстроймеханизация',

  // Группа: АО Донаэродорстрой
  'АО Донаэродорстрой': 'АО Донаэродорстрой',
  'АО "Донаэродорстрой"': 'АО Донаэродорстрой',
  'АО ДОНАЭРОДОРСТРОЙ': 'АО Донаэродорстрой',

  // Группа: ООО СКАвтодор
  'ООО СКАвтодор': 'ООО СК-Автодор',
  'ООО СК-Автодор': 'ООО СК-Автодор',
  'ООО "СКАвтодор"': 'ООО СК-Автодор',
  'ООО "СК-Автодор"': 'ООО СК-Автодор',

  // Группа: ООО СУ905
  'ООО СУ905': 'ООО СУ-905',
  'ООО СУ 905': 'ООО СУ-905',
  'ООО СУ-905': 'ООО СУ-905',
  'ООО "СУ905"': 'ООО СУ-905',
  'ООО "СУ 905"': 'ООО СУ-905',
  'ООО "СУ-905"': 'ООО СУ-905',

  // Группа: ООО ТЕХАЛЬЯНС
  'ООО ТЕХАЛЬЯНС': 'ООО ТехАльянс',
  'ООО ТехАльянс': 'ООО ТехАльянс',
  'ООО "ТЕХАЛЬЯНС"': 'ООО ТехАльянс',

  // Группа: ООО А-МОСТ
  'ООО А-МОСТ': 'ООО А-Мост',
  'ООО "А-МОСТ"': 'ООО А-Мост',
  'ООО А-Мост': 'ООО А-Мост',

  // Группа: ООО Динскойавтодор
  'ООО ДИК/ ООО Динскойавтодор': 'ООО Динскойавтодор',
  'ООО Динскойавтодор': 'ООО Динскойавтодор',
  'ООО "Динскойавтодор"': 'ООО Динскойавтодор',

  // Дополнительные производители из CSV
  'ООО ТехСтройКонтракт': 'ООО ТехСтройКонтракт',
  'ООО ДРСУ Магистраль': 'ООО ДРСУ Магистраль',
  'к-p Спас-Загорье': 'Карьер Спас-Загорье',
  'Карьер Спас-Загорье': 'Карьер Спас-Загорье',
  'ООО ТСМ ПРОМБАЗА': 'ООО ТСМ ПРОМБАЗА',
  'ООО Штарком': 'ООО Штарком',
  'ООО ЗАРЯ БЕТОН': 'ООО ЗАРЯ БЕТОН',
  'ООО БизнесТрансСтрой': 'ООО БизнесТрансСтрой',
  'ООО ЗемДорСтрой': 'ООО ЗемДорСтрой',
  'ООО АБЗ Капотня': 'ООО АБЗ Капотня',
  'ООО "Карьер-Инвест"': 'ООО Карьер-Инвест',
  'ООО ?А-МОСТ?': 'ООО А-Мост',
  'ООО ?ТВОЙ БЕТОН?': 'ООО Твой Бетон',
  'ООО ДРСУ ?МАГИСТРАЛЬ?': 'ООО ДРСУ Магистраль',
};

type CsvRow = Record<string, string | undefined>;

type PreparedRow = {
  rowNumber: number;
  plpName: string;
  objectName: string;
  samplingActNumber: string;
  samplingDate: Date;
  locationName: string;
  sampleProviderName: string;
  receiptDate: Date;
  materialName: string;
  manufacturerName: string | null;
  protocolNumber: string | null;
  protocolDate: Date | null;
  testResult: string | null;
  note: string | null;
};

function normalizeSpaces(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function optionalText(value: string | null | undefined): string | null {
  if (!value) return null;

  const normalized = normalizeSpaces(value);

  if (
    normalized === '' ||
    normalized === '-' ||
    normalized === '—' ||
    normalized === '–' ||
    normalized.toLowerCase() === 'null' ||
    normalized.toLowerCase() === 'undefined'
  ) {
    return null;
  }

  return normalized;
}

function requiredText(
  value: string | null | undefined,
  field: string,
  rowNumber: number,
): string {
  const normalized = optionalText(value);

  if (!normalized) {
    throw new Error(`Строка ${rowNumber}: обязательное поле "${field}" пустое`);
  }

  return normalized;
}

function normalizeManufacturer(name: string | null): string | null {
  if (!name) return null;

  const trimmed = normalizeSpaces(name);
  return manufacturerNormalization[trimmed] || trimmed;
}

function parseLegacyDate(
  value: string | null | undefined,
  field: string,
  rowNumber: number,
  required = false,
): Date | null {
  const normalized = optionalText(value);

  if (!normalized) {
    if (required) {
      throw new Error(`Строка ${rowNumber}: обязательная дата "${field}" отсутствует`);
    }
    return null;
  }

  const match = normalized.match(/^(\d{1,2})[.](\d{1,2})[.](\d{4})$/);

  if (!match) {
    throw new Error(
      `Строка ${rowNumber}: дата "${field}" имеет неизвестный формат: ${normalized}`,
    );
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);

  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(
      `Строка ${rowNumber}: некорректная дата "${field}": ${normalized}`,
    );
  }

  return date;
}

function prepareRow(row: CsvRow, index: number): PreparedRow {
  // +2: первая строка CSV — заголовок, index начинается с 0.
  const rowNumber = index + 2;

  return {
    rowNumber,
    plpName: requiredText(row['ПЛП'], 'ПЛП', rowNumber),
    objectName: requiredText(
      row['Наименование объект'],
      'Наименование объект',
      rowNumber,
    ),
    samplingActNumber: requiredText(
      row['Номер акта отбора проб'],
      'Номер акта отбора проб',
      rowNumber,
    ),
    samplingDate: parseLegacyDate(
      row['Дата отбора проб'],
      'Дата отбора проб',
      rowNumber,
      true,
    )!,
    locationName: requiredText(
      row['Место отбора проб'],
      'Место отбора проб',
      rowNumber,
    ),
    sampleProviderName: requiredText(
      row['Лицо, предоставившее пробу'],
      'Лицо, предоставившее пробу',
      rowNumber,
    ),
    receiptDate: parseLegacyDate(
      row['Дата поступления материала'],
      'Дата поступления материала',
      rowNumber,
      true,
    )!,
    materialName: requiredText(
      row['Наименование материала'],
      'Наименование материала',
      rowNumber,
    ),
    manufacturerName: normalizeManufacturer(
      optionalText(row['Предприятие-изготовитель']),
    ),
    protocolNumber: optionalText(row['Номер протокола']),
    protocolDate: parseLegacyDate(
      row['Дата протокола'],
      'Дата протокола',
      rowNumber,
      false,
    ),
    testResult: optionalText(row['Результат испытаний']),
    note: optionalText(row['Примечание']),
  };
}

async function resetLabData() {
  console.log('🧹 Очистка лабораторного контура...');

  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "sampling_tests",
      "test_protocols",
      "receipt_materials",
      "test_locations",
      "test_objects",
      "materials",
      "manufacturers",
      "inspectors",
      "plps"
    RESTART IDENTITY CASCADE;
  `);

  console.log('✅ Лабораторные таблицы очищены\n');
}

async function main() {
  const csvPath = resolve(process.cwd(), 'temp', IMPORT_SOURCE);

  if (!existsSync(csvPath)) {
    throw new Error(`CSV-файл не найден: ${csvPath}`);
  }

  const resetRequested = process.argv.includes('--reset');

  console.log('\n🚀 ИМПОРТ РЕЕСТРА ВХОДНОГО КОНТРОЛЯ');
  console.log(`Источник: ${csvPath}`);
  console.log(`businessRulesVersion: 0`);
  console.log(`Очистка перед импортом: ${resetRequested ? 'ДА' : 'НЕТ'}\n`);

  const csvContent = readFileSync(csvPath, 'utf8');

  const rawRows = parse(csvContent, {
    columns: true,
    delimiter: ';',
    bom: true,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: false,
  }) as CsvRow[];

  console.log(`📄 Строк CSV: ${rawRows.length}`);

  // Сначала валидируем структурно обязательные поля CSV.
  // Историческую хронологию по НОВЫМ бизнес-правилам здесь НЕ проверяем.
  // Строки без обязательных структурных данных (например, без места отбора)
  // не попадают в Реестр: они сохраняются в отдельный отчёт для ручной правки.
  const rows: PreparedRow[] = [];
  const rejectedRows: Array<{
    rowNumber: number;
    error: string;
    row: CsvRow;
  }> = [];

  rawRows.forEach((row, index) => {
    try {
      rows.push(prepareRow(row, index));
    } catch (error) {
      rejectedRows.push({
        rowNumber: index + 2,
        error: error instanceof Error ? error.message : String(error),
        row,
      });
    }
  });

  console.log(`✅ Валидных строк: ${rows.length}`);
  console.log(`⚠️ Отклонённых строк: ${rejectedRows.length}`);

  if (rejectedRows.length > 0) {
    const rejectPath = resolve(
      process.cwd(),
      'temp',
      'Reestr_1509.rejected.csv',
    );

    const headers = Object.keys(rawRows[0] ?? {});
    const csvEscape = (value: unknown): string => {
      const text = value == null ? '' : String(value);
      if (/[;"\r\n]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
      }
      return text;
    };

    const lines = [
      ['CSV row', 'Import error', ...headers].map(csvEscape).join(';'),
      ...rejectedRows.map(item =>
        [
          item.rowNumber,
          item.error,
          ...headers.map(header => item.row[header] ?? ''),
        ]
          .map(csvEscape)
          .join(';'),
      ),
    ];

    writeFileSync(rejectPath, `\uFEFF${lines.join('\n')}\n`, 'utf8');

    console.log(`📝 Отчёт по отклонённым строкам: ${rejectPath}`);
  }

  if (rows.length === 0) {
    throw new Error('После структурной валидации не осталось строк для импорта');
  }

  if (resetRequested) {
    await resetLabData();
  }

  // ============================================
  // 1. СПРАВОЧНИКИ
  // ============================================

  const plpNames = [...new Set(rows.map(row => row.plpName))];
  const providerNames = [...new Set(rows.map(row => row.sampleProviderName))];
  const materialNames = [...new Set(rows.map(row => row.materialName))];
  const objectNames = [...new Set(rows.map(row => row.objectName))];
  const manufacturerNames = [
    ...new Set(
      rows
        .map(row => row.manufacturerName)
        .filter((value): value is string => Boolean(value)),
    ),
  ];

  console.log('\n📚 Создание справочников...');

  await prisma.plp.createMany({
    data: plpNames.map(name => ({
      name,
      note: `Импортировано из ${IMPORT_SOURCE}`,
      authorEmail: IMPORT_AUTHOR,
    })),
    skipDuplicates: true,
  });

  await prisma.inspector.createMany({
    data: providerNames.map(name => ({
      name,
      note: `Импортировано из ${IMPORT_SOURCE}`,
      authorEmail: IMPORT_AUTHOR,
    })),
    skipDuplicates: true,
  });

  await prisma.material.createMany({
    data: materialNames.map(name => ({
      name,
      note: `Импортировано из ${IMPORT_SOURCE}`,
      authorEmail: IMPORT_AUTHOR,
    })),
    skipDuplicates: true,
  });

  await prisma.manufacturer.createMany({
    data: manufacturerNames.map(name => ({
      name,
      note: `Импортировано из ${IMPORT_SOURCE}`,
      authorEmail: IMPORT_AUTHOR,
    })),
    skipDuplicates: true,
  });

  await prisma.testObject.createMany({
    data: objectNames.map(name => ({
      name,
      note: `Импортировано из ${IMPORT_SOURCE}`,
      authorEmail: IMPORT_AUTHOR,
    })),
    skipDuplicates: true,
  });

  const [plps, providers, materials, manufacturers, objects] = await Promise.all([
    prisma.plp.findMany({ select: { id: true, name: true } }),
    prisma.inspector.findMany({ select: { id: true, name: true } }),
    prisma.material.findMany({ select: { id: true, name: true } }),
    prisma.manufacturer.findMany({ select: { id: true, name: true } }),
    prisma.testObject.findMany({ select: { id: true, name: true } }),
  ]);

  const plpByName = new Map(plps.map(item => [item.name, item.id]));
  const providerByName = new Map(providers.map(item => [item.name, item.id]));
  const materialByName = new Map(materials.map(item => [item.name, item.id]));
  const manufacturerByName = new Map(manufacturers.map(item => [item.name, item.id]));
  const objectByName = new Map(objects.map(item => [item.name, item.id]));

  // ============================================
  // 2. МЕСТА ОТБОРА
  // ============================================

  const locationKeys = new Map<string, { testObjectId: number; name: string }>();

  for (const row of rows) {
    const testObjectId = objectByName.get(row.objectName);
    if (!testObjectId) {
      throw new Error(`Не найден TestObject: ${row.objectName}`);
    }

    const key = `${testObjectId}\u0000${row.locationName}`;
    locationKeys.set(key, {
      testObjectId,
      name: row.locationName,
    });
  }

  await prisma.testLocation.createMany({
    data: [...locationKeys.values()].map(location => ({
      ...location,
      note: `Импортировано из ${IMPORT_SOURCE}`,
      authorEmail: IMPORT_AUTHOR,
    })),
    skipDuplicates: true,
  });

  const locations = await prisma.testLocation.findMany({
    select: {
      id: true,
      name: true,
      testObjectId: true,
    },
  });

  const locationByKey = new Map(
    locations.map(location => [
      `${location.testObjectId}\u0000${location.name}`,
      location.id,
    ]),
  );

  console.log(`   ПЛП: ${plpByName.size}`);
  console.log(`   Лица, предоставившие пробу: ${providerByName.size}`);
  console.log(`   Материалы: ${materialByName.size}`);
  console.log(`   Производители: ${manufacturerByName.size}`);
  console.log(`   Объекты: ${objectByName.size}`);
  console.log(`   Места отбора: ${locationByKey.size}`);

  // ============================================
  // 3. ОСНОВНОЙ ИМПОРТ
  // ============================================

  console.log('\n📥 Импорт записей...');

  let imported = 0;
  let protocolsCreated = 0;
  let rowsWithoutManufacturer = 0;

  for (let start = 0; start < rows.length; start += IMPORT_CHUNK_SIZE) {
    const chunk = rows.slice(start, start + IMPORT_CHUNK_SIZE);

    const operations = chunk.map(row => {
      const plpId = plpByName.get(row.plpName);
      const inspectorId = providerByName.get(row.sampleProviderName);
      const materialId = materialByName.get(row.materialName);
      const testObjectId = objectByName.get(row.objectName);
      const manufacturerId = row.manufacturerName
        ? manufacturerByName.get(row.manufacturerName) ?? null
        : null;

      if (!plpId) throw new Error(`Не найден Plp: ${row.plpName}`);
      if (!inspectorId) throw new Error(`Не найден Inspector: ${row.sampleProviderName}`);
      if (!materialId) throw new Error(`Не найден Material: ${row.materialName}`);
      if (!testObjectId) throw new Error(`Не найден TestObject: ${row.objectName}`);

      const testLocationId =
        locationByKey.get(`${testObjectId}\u0000${row.locationName}`);

      if (!testLocationId) {
        throw new Error(
          `Не найден TestLocation: ${row.objectName} / ${row.locationName}`,
        );
      }

      const hasProtocol = Boolean(
        row.protocolNumber || row.protocolDate || row.testResult,
      );

      if (hasProtocol) protocolsCreated++;
      if (!manufacturerId) rowsWithoutManufacturer++;

      return prisma.samplingTest.create({
        data: {
          samplingActNumber: row.samplingActNumber,
          samplingDate: row.samplingDate,
          samplingDocumentPath: null,
          note: row.note,

          plp: {
            connect: { id: plpId },
          },

          inspector: {
            connect: { id: inspectorId },
          },

          testLocation: {
            connect: { id: testLocationId },
          },

          businessRulesVersion: 0,
          importSource: IMPORT_SOURCE,
          importRowNumber: row.rowNumber,

          authorEmail: IMPORT_AUTHOR,

          receiptMaterial: {
            create: {
              receiptDate: row.receiptDate,

              // В текущем CSV поле "Документ о качестве" содержит только "-".
              // Реальные исторические файлы будут привязаны отдельным этапом позже.
              qualityDocumentDate: null,
              qualityDocumentNumber: null,
              qualityDocumentPath: null,

              note: null,
              material: {
                connect: { id: materialId },
              },

              ...(manufacturerId
                ? {
                    manufacturer: {
                      connect: { id: manufacturerId },
                    },
                  }
                : {}),
              authorEmail: IMPORT_AUTHOR,
            },
          },

          ...(hasProtocol
            ? {
                testProtocol: {
                  create: {
                    protocolNumber: row.protocolNumber,
                    protocolDate: row.protocolDate,
                    protocolDocumentPath: null,
                    testResult: row.testResult,
                    note: null,
                    authorEmail: IMPORT_AUTHOR,
                  },
                },
              }
            : {}),
        },
      });
    });

    await Promise.all(operations);

    imported += chunk.length;
    console.log(`   ✅ ${imported}/${rows.length}`);
  }

  // ============================================
  // 4. КОНТРОЛЬНАЯ СТАТИСТИКА
  // ============================================

  const [samplingCount, receiptCount, protocolCount] = await Promise.all([
    prisma.samplingTest.count({
      where: {
        importSource: IMPORT_SOURCE,
        businessRulesVersion: 0,
      },
    }),
    prisma.receiptMaterial.count(),
    prisma.testProtocol.count(),
  ]);

  console.log('\n🎉 ИМПОРТ ЗАВЕРШЁН');
  console.log(`   SamplingTest: ${samplingCount}`);
  console.log(`   ReceiptMaterial: ${receiptCount}`);
  console.log(`   TestProtocol: ${protocolCount}`);
  console.log(`   Отклонено из-за структурных ошибок: ${rejectedRows.length}`);
  console.log(`   Без производителя: ${rowsWithoutManufacturer}`);
  console.log(`   Протоколов создано: ${protocolsCreated}`);

  if (samplingCount !== rows.length) {
    throw new Error(
      `Контроль количества не пройден: CSV=${rows.length}, SamplingTest=${samplingCount}`,
    );
  }

  if (receiptCount !== rows.length) {
    throw new Error(
      `Контроль количества ReceiptMaterial не пройден: ожидалось ${rows.length}, получено ${receiptCount}`,
    );
  }

  console.log('\n✅ Количество строк совпало с CSV.');
  console.log('✅ Тестовые записи старой БД в импорт не попали.');
  console.log('✅ Историческая хронология намеренно НЕ валидировалась по новым правилам.');
  console.log('✅ Строки без обязательного места отбора в Реестр не импортировались.\n');
}

main()
  .catch(error => {
    console.error('\n❌ ОШИБКА ИМПОРТА');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
