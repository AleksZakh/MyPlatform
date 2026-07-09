// scripts/read-raw.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, '..', 'server', 'assets', 'Reestr.csv');

// Читаем файл как бинарный
const buffer = fs.readFileSync(filePath);

// Ищем разделители строк
let count = 0;
for (let i = 0; i < buffer.length; i++) {
  if (buffer[i] === 10) {
    // \n
    count++;
  }
}

console.log(`Количество символов \\n: ${count}`);

// Проверяем, есть ли \r\n
let countCRLF = 0;
for (let i = 0; i < buffer.length - 1; i++) {
  if (buffer[i] === 13 && buffer[i + 1] === 10) {
    // \r\n
    countCRLF++;
  }
}

console.log(`Количество символов \\r\\n: ${countCRLF}`);
console.log(`Общее количество строк: ${count + 1}`);
