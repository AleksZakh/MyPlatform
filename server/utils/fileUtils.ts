import fs from 'node:fs';
import path from 'node:path';

const BASE_UPLOAD_DIR = '/var/www/uploads-storage/files';

/**
 * Получить полный путь к файлу по относительному пути
 */
export function getFullFilePath(relativePath: string | null): string | null {
  if (!relativePath) return null;
  return path.join(BASE_UPLOAD_DIR, relativePath);
}

/**
 * Проверить существование файла
 */
export function fileExists(relativePath: string | null): boolean {
  if (!relativePath) return false;
  const fullPath = getFullFilePath(relativePath);
  if (!fullPath) return false;
  return fs.existsSync(fullPath);
}

/**
 * Получить информацию о файле
 */
export function getFileInfo(relativePath: string | null): {
  exists: boolean;
  size: number;
  modified: Date;
} | null {
  if (!relativePath) return null;
  const fullPath = getFullFilePath(relativePath);
  if (!fullPath) return null;

  try {
    const stats = fs.statSync(fullPath);
    return {
      exists: true,
      size: stats.size,
      modified: stats.mtime,
    };
  } catch {
    return null;
  }
}

/**
 * Удалить файл
 */
export function deleteUploadedFile(relativePath: string | null): boolean {
  if (!relativePath) return false;
  const fullPath = getFullFilePath(relativePath);
  if (!fullPath) return false;

  try {
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}