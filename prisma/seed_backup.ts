import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url'; // Добавили встроенный модуль
import { parse } from 'csv-parse/sync';

const prisma = new PrismaClient();

// Решение проблемы с __dirname в ES-модулях (ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Хелпер для парсинга дат вида "28.02.2026" или "06.05.26г"
function parseRussianDate(dateStr: string): Date {
  const cleanStr = dateStr.replace(/г\.?$/i, '').trim(); // убираем "г" или "г."
  const parts = cleanStr.split('.');

  if (parts.length !== 3) {
    throw new Error(`Неверный формат даты: ${dateStr}`);
  }

  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // в JS месяцы 0-11
  let year = parseInt(parts[2], 10);

  // Если год передан двумя цифрами (например, 26 вместо 2026)
  if (year < 100) {
    year += 2000;
  }

  return new Date(year, month, day);
}

async function main() {
  const csvFilePath = path.resolve(__dirname, '../data.csv');
  const fileContent = fs.readFileSync(csvFilePath, { encoding: 'utf-8' });

  // Парсим CSV с разделителем-точкой с запятой
  type CsvRecord = Record<string, string>;
  const records = parse(fileContent, {
    delimiter: ';',
    columns: true, // Использовать первую строчку как заголовки
    skip_empty_lines: true,
    trim: true,
  }) as CsvRecord[];

  console.log(`Найдено ${records.length} записей для импорта...`);

  for (const record of records) {
    await prisma.incomControl.create({
      data: {
        plp: record['ПЛП'],
        objectName: record['Наименование объект'],
        samplingActNumber: record['Номер акта отбора проб'],
        samplingDate: parseRussianDate(record['Дата отбора проб']),
        samplingLocation: record['Место отбора проб'],
        providerPerson: record['Лицо, предоставившее пробу'],
        receivedDate: parseRussianDate(record['Дата поступления материала']),
        materialName: record['Наименование материала'],
        qualityDocument: record['Документ о качестве'],
        manufacturer: record['Предприятие-изготовитель'] || null,
        protocolNumber: record['Номер протокола'],
        protocolDate: parseRussianDate(record['Дата протокола']),
        testResult: record['Результат испытаний'],
        note: record['Примечание'] || null,
      },
    });
  }

  console.log('Импорт данных успешно завершен!');
}

main()
  .catch((e) => {
    console.error('Ошибка импорта:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
