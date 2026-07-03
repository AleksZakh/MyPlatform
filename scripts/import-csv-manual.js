// scripts/import-csv-manual.js
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
  if (!value) return null;
  const cleaned = value.trim();
  // Убираем кавычки, если они есть
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    return cleaned.slice(1, -1).trim();
  }
  return cleaned || null;
}

function parseCSVLine(line) {
  // Простой парсинг с учетом кавычек
  const values = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Двойные кавычки внутри текста
        current += '"';
        i++; // пропускаем вторую кавычку
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ';' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current); // последнее значение
  
  return values;
}

async function importCSV() {
  try {
    await prisma.$connect();
    console.log('✅ Подключение к БД установлено');
    
    const filePath = path.join(__dirname, '..', 'server', 'assets', 'Reestr_1.csv');
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`Файл не найден: ${filePath}`);
    }
    
    console.log(`📖 Чтение файла: ${filePath}`);
    
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim() !== '');
    
    console.log(`📊 Всего строк в файле: ${lines.length}`);
    
    // Заголовки
    const headers = parseCSVLine(lines[0]);
    console.log(`📋 Заголовки (${headers.length} полей):`, headers.slice(0, 5).join('; ') + '...');
    
    let records = [];
    let skippedLines = 0;
    let errorLines = [];
    
    // Пропускаем заголовок
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      
      // Проверяем, что количество полей соответствует заголовкам
      if (values.length !== headers.length) {
        skippedLines++;
        errorLines.push({
          line: i + 1,
          expected: headers.length,
          got: values.length,
          preview: lines[i].substring(0, 100)
        });
        continue;
      }
      
      // Создаем объект записи
      const record = {
        plp: cleanValue(values[0]),
        objectName: cleanValue(values[1]),
        samplingActNumber: cleanValue(values[2]),
        samplingDate: parseRussianDate(values[3]),
        samplingPlace: cleanValue(values[4]),
        personProvidedSample: cleanValue(values[5]),
        materialReceiptDate: parseRussianDate(values[6]),
        materialName: cleanValue(values[7]),
        qualityDocument: cleanValue(values[8]),
        manufacturer: cleanValue(values[9]),
        protocolNumber: cleanValue(values[10]),
        protocolDate: parseRussianDate(values[11]),
        testResult: cleanValue(values[12]),
        note: cleanValue(values[13]),
      };
      
      records.push(record);
      
      if (i % 100 === 0) {
        console.log(`📊 Обработано строк: ${i}/${lines.length - 1}`);
      }
    }
    
    console.log(`\n📊 Результаты парсинга:`);
    console.log(`✅ Успешно распарсено: ${records.length}`);
    console.log(`❌ Пропущено строк: ${skippedLines}`);
    
    if (errorLines.length > 0) {
      console.log(`\n⚠️ Первые 5 ошибок:`);
      errorLines.slice(0, 5).forEach(err => {
        console.log(`  Строка ${err.line}: ожидалось ${err.expected} полей, получено ${err.got}`);
        console.log(`  Содержимое: ${err.preview}...`);
      });
      
      // Сохраняем ошибки в файл
      const errorPath = path.join(__dirname, 'parse-errors.json');
      fs.writeFileSync(errorPath, JSON.stringify(errorLines, null, 2));
      console.log(`\n💾 Полный список ошибок сохранен в: ${errorPath}`);
    }
    
    if (records.length === 0) {
      console.log('⚠️ Нет данных для импорта');
      return;
    }
    
    // Импорт батчами
    const batchSize = 100;
    let imported = 0;
    
    console.log(`\n🚀 Начинаю импорт ${records.length} записей...`);
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      try {
        const result = await prisma.aEng.createMany({
          data: batch,
          skipDuplicates: true,
        });
        
        imported += result.count;
        console.log(`✅ Батч ${Math.floor(i / batchSize) + 1}: вставлено ${result.count}`);
        console.log(`📊 Прогресс: ${Math.min(i + batchSize, records.length)}/${records.length}`);
        
      } catch (error) {
        console.error(`❌ Ошибка в батче ${Math.floor(i / batchSize) + 1}:`, error.message);
        
        // Находим проблемную запись
        for (let j = 0; j < batch.length; j++) {
          try {
            await prisma.aEng.create({ data: batch[j] });
          } catch (singleError) {
            console.error(`   🔴 Проблемная запись ${i + j + 1}:`, singleError.message);
            console.log('   Данные:', JSON.stringify(batch[j], null, 2));
            break;
          }
        }
        break;
      }
    }
    
    console.log(`\n🎉 ИТОГИ ИМПОРТА:`);
    console.log(`📊 Всего записей в CSV: ${records.length}`);
    console.log(`✅ Успешно импортировано: ${imported}`);
    console.log(`📊 Всего в БД: ${await prisma.aEng.count()} записей`);
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  } finally {
    await prisma.$disconnect();
    console.log('🔌 Соединение с БД закрыто');
  }
}

importCSV();