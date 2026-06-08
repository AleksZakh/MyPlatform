// server/api/lab-tests.get.ts
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export default defineEventHandler(async (event) => {
  try {
    // Путь к CSV файлу (поместите Reestr.csv в папку server/assets/)
    const csvPath = join(process.cwd(), 'server', 'assets', 'Reestr.csv');
    const csvContent = await readFile(csvPath, 'utf-8');
    
    // Парсинг CSV
    const lines = csvContent.trim().split('\n');
    const headers = lines[0]?.split(';').map(h => h.trim()) || [];
    
    const data = lines.slice(1).map(line => {
      const values = line.split(';');
      const row: Record<string, string> = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx]?.trim() || '';
      });
      return row;
    });

    // console.log(`Загружено ${data.length} записей из CSV.`, data);
    
    return {
      success: true,
      headers,
      data,
      total: data.length
    };
  } catch (error: any) {
    console.error('Ошибка чтения CSV:', error);
    return {
      success: false,
      error: error.message,
      headers: [],
      data: [],
      total: 0
    };
  }
});