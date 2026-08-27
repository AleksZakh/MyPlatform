// scripts/import-csv-improved.js
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import csv from 'csv-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import iconv from 'iconv-lite'; // npm install iconv-lite

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

function parseRussianDate(dateStr) {
  if (!dateStr || dateStr.trim() === '') return null;
  const parts = dateStr.trim().split('.');
  if (parts.length !== 3) return null;
  return new Date(Date.UTC(parts[2], parts[1] - 1, parts[0]));
}

function cleanValue(value) {
  if (!value) return '#null#';
  const cleaned = value.trim();
  return cleaned || '#null#';
}

async function importCSV() {
  try {
    await prisma.$connect();
    console.log('✅ Подключение к БД установлено');

    const filePath = path.join(__dirname, '..', 'server/assets/Reestr.csv');

    if (!fs.existsSync(filePath)) {
      throw new Error(`Файл не найден: ${filePath}`);
    }

    console.log(`📖 Чтение файла: ${filePath}`);

    // Проверяем кодировку файла
    const buffer = fs.readFileSync(filePath);
    const isWindows1251 = buffer[0] === 0xff && buffer[1] === 0xfe;
    console.log(`🔤 Кодировка: ${isWindows1251 ? 'UTF-16' : 'UTF-8'}`);

    let records = [];
    let totalRows = 0;
    let errorRows = 0;
    let emptyRows = 0;

    await new Promise((resolve, reject) => {
      // Используем более гибкие настройки парсера
      fs.createReadStream(filePath)
        .pipe(
          csv({
            separator: ';',
            quote: '"',
            escape: '"',
            skipLines: 0,
            strict: false,
            trim: true,
          })
        )
        .on('data', (row) => {
          totalRows++;

          // Проверяем, что строка не пустая
          const hasData = Object.values(row).some(
            (val) => val && val.trim() !== ''
          );
          if (!hasData) {
            emptyRows++;
            return;
          }

          // Проверяем наличие обязательных полей
          if (!row['Дата отбора проб'] && !row['Номер протокола']) {
            console.log(
              `⚠️ Пропущена строка ${totalRows}: нет даты и номера протокола`
            );
            errorRows++;
            return;
          }

          const record = {
            plp: cleanValue(row['ПЛП']),
            objectName: cleanValue(row['Наименование объект']),
            samplingActNumber: cleanValue(row['Номер акта отбора проб']),
            samplingDate: parseRussianDate(row['Дата отбора проб']),
            samplingPlace: cleanValue(row['Место отбора проб']),
            personProvidedSample: cleanValue(row['Лицо, предоставившее пробу']),
            materialReceiptDate: parseRussianDate(
              row['Дата поступления материала']
            ),
            materialName: cleanValue(row['Наименование материала']),
            qualityDocument: cleanValue(row['Документ о качестве']),
            manufacturer: cleanValue(row['Предприятие-изготовитель']),
            protocolNumber: cleanValue(row['Номер протокола']),
            protocolDate: parseRussianDate(row['Дата протокола']),
            testResult: cleanValue(row['Результат испытаний']),
            note: cleanValue(row['Примечание']),
          };

          records.push(record);
        })
        .on('end', () => {
          console.log(`📊 Прочитано строк: ${totalRows}`);
          console.log(`📊 Пустых строк: ${emptyRows}`);
          console.log(`📊 Строк с ошибками: ${errorRows}`);
          console.log(`📊 Успешно распарсено: ${records.length}`);
          resolve();
        })
        .on('error', (err) => {
          console.error('❌ Ошибка чтения файла:', err);
          reject(err);
        });
    });

    if (records.length === 0) {
      console.log('⚠️ Нет данных для импорта');
      return;
    }

    // Проверяем, какие записи уже есть в БД
    console.log('\n🔍 Проверка существующих записей в БД...');
    const existingCount = await prisma.aEng.count();
    console.log(`📊 Уже в БД: ${existingCount} записей`);

    // Импорт батчами с детальным логированием
    const batchSize = 100;
    let imported = 0;
    let skipped = 0;

    console.log(`\n🚀 Начинаю импорт ${records.length} записей...`);

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);

      try {
        const result = await prisma.aEng.createMany({
          data: batch,
          skipDuplicates: true,
        });

        imported += result.count;
        skipped += batch.length - result.count;

        console.log(
          `✅ Батч ${Math.floor(i / batchSize) + 1}: вставлено ${result.count}, пропущено ${batch.length - result.count}`
        );
        console.log(
          `📊 Прогресс: ${Math.min(i + batchSize, records.length)}/${records.length} (всего вставлено: ${imported})`
        );
      } catch (error) {
        console.error(
          `❌ Ошибка в батче ${Math.floor(i / batchSize) + 1}:`,
          error.message
        );

        // Пытаемся найти проблемную запись
        for (let j = 0; j < batch.length; j++) {
          try {
            await prisma.aEng.create({ data: batch[j] });
          } catch (singleError) {
            console.error(
              `   🔴 Проблемная запись ${i + j + 1}:`,
              singleError.message
            );
            console.log('   Данные:', JSON.stringify(batch[j], null, 2));
            break;
          }
        }
        break;
      }
    }

    console.log('\n🎉 ИТОГИ ИМПОРТА:');
    console.log(`📊 Всего записей в CSV: ${records.length}`);
    console.log(`✅ Успешно импортировано: ${imported}`);
    console.log(`⏭️ Пропущено (дубликаты): ${skipped}`);
    console.log(`📊 Всего в БД: ${await prisma.aEng.count()} записей`);

    // Проверка: сколько не хватает
    const totalInDb = await prisma.aEng.count();
    const difference = records.length - (imported + skipped);
    if (difference > 0) {
      console.log(
        `⚠️ Несоответствие: ${difference} записей не были обработаны`
      );
    }
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  } finally {
    await prisma.$disconnect();
    console.log('🔌 Соединение с БД закрыто');
  }
}

importCSV();
