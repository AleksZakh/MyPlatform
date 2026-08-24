import fs from 'node:fs';
import path from 'node:path';
import { folderNameGenerator } from './folderNameGenerator';

export interface FileUploadResult {
  folderName: string;
  targetDir: string;
  fileDbPaths: Record<string, string>;
  body: Record<string, string>;
}

export interface FileProcessingOptions {
  // Поля, которые могут содержать файлы
  fileFields?: string[];
  // Базовый путь для загрузки
  baseUploadDir?: string;
  // Функция для генерации имени папки
  folderNameGenerator?: () => string;
  // Очищать ли старые файлы при обновлении
  cleanOldFiles?: boolean;
  // Пути к старым файлам для удаления
  oldFilePaths?: Record<string, string | null>;
}

/**
 * Универсальный обработчик загрузки файлов из multipart/form-data
 */
export async function handleFileUpload(
  multipartData: any[],
  options: FileProcessingOptions = {}
): Promise<FileUploadResult> {
  const {
    fileFields = ['sDoc', 'qualDoc', 'protocolDoc'],
    baseUploadDir = '/var/www/uploads-storage/files',
    cleanOldFiles = false,
    oldFilePaths = {},
  } = options;

  // Генерируем подкаталог
  const folderName = folderNameGenerator();
  const targetDir = path.join(baseUploadDir, folderName);

  // Создаем директории, если их нет
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const body: Record<string, string> = {};
  const fileDbPaths: Record<string, string> = {};

  // Инициализируем пути для файлов
  fileFields.forEach(field => {
    fileDbPaths[field] = '';
  });

  // 1. Сначала считываем все текстовые поля
  for (const item of multipartData) {
    if (item.name && !item.filename) {
      body[item.name] = item.data.toString('utf-8');
    }
  }

  // 2. Обрабатываем и сохраняем файлы
  for (const item of multipartData) {
    if (!item.name || !item.filename) continue;

    const fieldName = item.name;

    // Проверяем, является ли это поле файловым
    if (!fileFields.includes(fieldName)) continue;

    // Извлекаем расширение файла
    const rawFilename = Buffer.from(item.filename, 'latin1').toString('utf-8');
    const fileExt = path.extname(rawFilename).toLowerCase();

    // Формируем новое имя файла
    const newFilename = `${fieldName}${fileExt}`;
    const fullPath = path.join(targetDir, newFilename);

    // Записываем файл на диск
    fs.writeFileSync(fullPath, item.data);

    // Сохраняем относительный путь для БД
    fileDbPaths[fieldName] = path.join(folderName, newFilename);
  }

  // 3. Если нужно удалить старые файлы
  if (cleanOldFiles && Object.keys(oldFilePaths).length > 0) {
    // await cleanOldFilesFromDisk(oldFilePaths, baseUploadDir);
  }

  return {
    folderName,
    targetDir,
    fileDbPaths,
    body,
  };
}

/**
 * Удаление старых файлов с диска
 */
export async function cleanOldFilesFromDisk(
  oldFilePaths: Record<string, string | null>,
  baseUploadDir: string
): Promise<void> {
  for (const [field, filePath] of Object.entries(oldFilePaths)) {
    if (!filePath) continue;

    const fullPath = path.join(baseUploadDir, filePath);
    try {
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        console.log(`✅ Удален старый файл: ${fullPath}`);
      }
    } catch (error) {
      console.error(`❌ Ошибка при удалении файла ${fullPath}:`, error);
    }
  }
}

/**
 * Парсинг даты из различных форматов
 */
export function parseDate(value: any): Date | null {
  if (!value || String(value).trim() === '' || value === 'Invalid Date') {
    return null;
  }
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Обновление путей к файлам в данных для БД
 */
export function updateFilePathsInData(
  data: any,
  fileDbPaths: Record<string, string>,
  fieldMapping: Record<string, string> = {}
): any {
  const result = { ...data };

  // Стандартное маппинг полей
  const defaultMapping: Record<string, string> = {
    sDoc: 'sDocPath',
    qualDoc: 'qualDocPath',
    protocolDoc: 'protocolDocPath',
  };

  const mapping = { ...defaultMapping, ...fieldMapping };

  for (const [field, dbField] of Object.entries(mapping)) {
    if (fileDbPaths[field] !== undefined) {
      result[dbField] = fileDbPaths[field] || null;
    }
  }

  return result;
}