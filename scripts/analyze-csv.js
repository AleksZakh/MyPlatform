// scripts/analyze-csv.js
import fs from 'fs';
import csv from 'csv-parser';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function analyzeCSV() {
  const filePath = path.join(__dirname, '..', 'server/assets/Reestr.csv');

  console.log(`📊 Анализ файла: ${filePath}`);

  // 1. Проверяем размер файла
  const stats = fs.statSync(filePath);
  console.log(`📁 Размер файла: ${(stats.size / 1024).toFixed(2)} KB`);

  // 2. Проверяем количество строк
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  console.log(`📝 Всего строк в файле: ${lines.length}`);

  // 3. Проверяем пустые строки
  const nonEmptyLines = lines.filter((line) => line.trim() !== '');
  console.log(`📝 Непустых строк: ${nonEmptyLines.length}`);

  // 4. Проверяем структуру
  let parsedCount = 0;
  let errorCount = 0;
  let firstErrors = [];

  await new Promise((resolve) => {
    const stream = fs
      .createReadStream(filePath)
      .pipe(
        csv({
          separator: ';',
          strict: false,
          skipLines: 0,
        })
      )
      .on('data', (row) => {
        parsedCount++;
        // Проверяем, есть ли все поля
        const expectedFields = [
          'ПЛП',
          'Наименование объект',
          'Номер акта отбора проб',
          'Дата отбора проб',
          'Место отбора проб',
          'Лицо, предоставившее пробу',
          'Дата поступления материала',
          'Наименование материала',
          'Документ о качестве',
          'Предприятие-изготовитель',
          'Номер протокола',
          'Дата протокола',
          'Результат испытаний',
          'Примечание',
        ];

        const missingFields = expectedFields.filter(
          (f) => !row[f] && row[f] !== ''
        );

        if (missingFields.length > 0 && firstErrors.length < 5) {
          firstErrors.push({
            row: parsedCount,
            missing: missingFields,
            data: row,
          });
        }
      })
      .on('end', resolve)
      .on('error', (err) => {
        console.error('Ошибка парсинга:', err);
        errorCount++;
        resolve();
      });
  });

  console.log(`\n📊 Результаты анализа:`);
  console.log(`✅ Успешно распарсено записей: ${parsedCount}`);
  console.log(`❌ Ошибок парсинга: ${errorCount}`);

  if (firstErrors.length > 0) {
    console.log(`\n⚠️ Примеры проблемных записей:`);
    firstErrors.forEach((err, idx) => {
      console.log(`\n${idx + 1}. Запись ${err.row}:`);
      console.log(`   Отсутствуют поля: ${err.missing.join(', ')}`);
      console.log(`   Данные:`, JSON.stringify(err.data, null, 2));
    });
  }

  // 5. Проверяем, сколько записей уже в БД
  console.log(`\n💡 Ожидаемое количество записей: ${nonEmptyLines.length - 1}`);
  console.log(`   (минус 1 строка заголовка)`);
}

analyzeCSV().catch(console.error);
