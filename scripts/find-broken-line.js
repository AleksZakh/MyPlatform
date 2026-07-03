// scripts/find-broken-line.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, '..', 'server', 'assets', 'Reestr_1.csv');

console.log('🔍 Поиск проблемных строк в CSV...\n');

let lineNumber = 0;
let problemLines = [];

const rl = readline.createInterface({
  input: fs.createReadStream(filePath),
  crlfDelay: Infinity
});

rl.on('line', (line) => {
  lineNumber++;
  
  // Проверяем количество кавычек
  const quotes = (line.match(/"/g) || []).length;
  
  // Проверяем количество разделителей
  const separators = (line.match(/;/g) || []).length;
  
  // В CSV должно быть 13 разделителей (14 полей)
  const expectedSeparators = 13;
  
  if (quotes % 2 !== 0) {
    problemLines.push({
      line: lineNumber,
      issue: 'Нечетное количество кавычек',
      details: `Кавычек: ${quotes}`,
      preview: line.substring(0, 100) + '...'
    });
  }
  
  if (separators !== expectedSeparators && line.trim() !== '') {
    problemLines.push({
      line: lineNumber,
      issue: 'Неверное количество разделителей',
      details: `Найдено: ${separators}, ожидается: ${expectedSeparators}`,
      preview: line.substring(0, 100) + '...'
    });
  }
});

rl.on('close', () => {
  console.log(`📊 Проверено строк: ${lineNumber}`);
  console.log(`⚠️ Найдено проблемных строк: ${problemLines.length}\n`);
  
  if (problemLines.length > 0) {
    console.log('📋 Список проблемных строк:');
    problemLines.slice(0, 20).forEach(p => {
      console.log(`\n  Строка ${p.line}:`);
      console.log(`    Проблема: ${p.issue}`);
      console.log(`    Детали: ${p.details}`);
      console.log(`    Содержимое: ${p.preview}`);
    });
    
    if (problemLines.length > 20) {
      console.log(`\n... и еще ${problemLines.length - 20} проблемных строк`);
    }
    
    // Сохраняем проблемные строки в файл
    const outputPath = path.join(__dirname, 'problem-lines.json');
    fs.writeFileSync(outputPath, JSON.stringify(problemLines, null, 2));
    console.log(`\n💾 Полный список сохранен в: ${outputPath}`);
  } else {
    console.log('✅ Проблемных строк не найдено!');
  }
});