// scripts/count-lines.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, '..', 'server', 'assets', 'Reestr.csv');

// Способ 1: Через readFile
const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');
console.log(`📝 Всего строк (через split): ${lines.length}`);
console.log(
  `📝 Непустых строк: ${lines.filter((l) => l.trim() !== '').length}`
);

// Способ 2: Через readline
import readline from 'readline';

let lineCount = 0;
const rl = readline.createInterface({
  input: fs.createReadStream(filePath),
  crlfDelay: Infinity,
});

rl.on('line', (line) => {
  lineCount++;
});

rl.on('close', () => {
  console.log(`📝 Всего строк (через readline): ${lineCount}`);
});

// Способ 3: Проверяем размер файла и байты
const stats = fs.statSync(filePath);
console.log(`📁 Размер файла: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

// Проверяем последние 500 байт файла
const buffer = fs.readFileSync(filePath);
const last500 = buffer.slice(-500).toString('utf-8');
console.log(`\n📄 Последние 500 байт файла:`);
console.log(last500.substring(0, 500));
