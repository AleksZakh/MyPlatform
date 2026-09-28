// server/api/lab/sampling-test/upload.post.ts
import { PrismaClient } from '@prisma/client';
import { defineEventHandler, readMultipartFormData, createError } from 'h3';
import * as fs from 'node:fs';
import * as path from 'node:path';

const prisma = new PrismaClient();

// Корневая директория хранения статики в Nuxt 3
const BASE_UPLOAD_DIR = path.join(process.cwd(), 'public/files');

export default defineEventHandler(async (event) => {
  console.log('\n======================================================');
  console.log(`[💾 БОЕВАЯ ЗАПИСЬ БД] Получен запрос миграции файла с обновлением по ID`);
  console.log('======================================================\n');

  try {
    if (!fs.existsSync(BASE_UPLOAD_DIR)) {
        fs.mkdirSync(BASE_UPLOAD_DIR, { recursive: true });
    }

    const formData = await readMultipartFormData(event);
    if (!formData) {
      throw createError({ statusCode: 400, statusMessage: 'Данные формы не переданы' });
    }

    let fileBuffer: Buffer | null = null;
    let fileName = '';
    
    // Переменные для текстовых полей формы
    let dbRecordIdStr = '';
    let actNumber = '';
    let actDate = '';
    let objectName = '';
    let actLocation = '';

    // Разбираем пришедшие поля формы
    for (const field of formData) {
      switch (field.name) {
        case 'file':
          if (field.filename) {
            fileBuffer = field.data;
            fileName = field.filename;
          }          
          break;
        case 'dbRecordId':
          dbRecordIdStr = field.data.toString('utf-8').trim();
          break;
        case 'actNumber':
          actNumber = field.data.toString('utf-8').trim();
          break;
        case 'date':
          actDate = field.data.toString('utf-8').trim();
          break;
        case 'objectName':
          objectName = field.data.toString('utf-8').trim();
          break;
        case 'location':
          actLocation = field.data.toString('utf-8').trim();
          break;
        default:
          break;
      }
    }

    // Проверяем наличие критических параметров для сохранения и апдейта в БД
    if (!fileBuffer || !dbRecordIdStr || !actNumber) {
      throw createError({ statusCode: 400, statusMessage: 'Отсутствует файл, ID записи или номер акта' });
    }

    const dbRecordId = parseInt(dbRecordIdStr, 10);
    if (isNaN(dbRecordId)) {
      throw createError({ statusCode: 400, statusMessage: 'Некорректный формат Идентификатора БД (ID)' });
    }

    // Функция очистки имен для безопасной работы с путями файловой системы Linux
    const sanitize = (text: string) => {
        return text
            .replace(/[\/\\?%*:|"<>]/g, '_') // Убираем запрещенные символы
            .replace(/\s+/g, '_')            // Заменяем пробелы для читаемости путей
            .substring(0, 50);               // Ограничиваем длину директорий
    };

    const safeAct = sanitize(actNumber);
    const safeDate = sanitize(actDate) || 'no-date';
    const safeObject = sanitize(objectName) || 'general-object';
    const safeLocation = sanitize(actLocation) || 'general-location';

    // Формируем имя файла
    const safeFileName = `act_${safeAct}_${Date.now()}.pdf`;

    // Создаем каскадную вложенность папок: public/files/Имя_Объекта/Локация/Дата
    const customObjectDir = path.join(BASE_UPLOAD_DIR, safeObject);
    const customLocationDir = path.join(customObjectDir, safeLocation);
    const targetFolder = path.join(customLocationDir, safeDate);

    // Принудительно создаем дерево папок на сервере, если его еще нет
    if (!fs.existsSync(targetFolder)) {
        fs.mkdirSync(targetFolder, { recursive: true });
    }

    // Полный путь для записи файла на сервере
    const serverFilePath = path.join(targetFolder, safeFileName);
    fs.writeFileSync(serverFilePath, fileBuffer);

    // Веб-ссылка относительно корня public (папка public опускается)
    const publicPath = `/${safeObject}/${safeLocation}/${safeDate}/${safeFileName}`;

    // 🏆 ВЫПОЛНЯЕМ ТОЧЕЧНОЕ ОБНОВЛЕНИЕ В БД ПО ID ЧЕРЕЗ PRISMA
    const updatedRecord = await prisma.samplingTest.update({
        where: {
            id: dbRecordId
        },
        data: {
            samplingDocumentPath: publicPath 
        }
    });

    return {
      success: true,
      message: `Файл сохранен и привязан по ID=${dbRecordId} к акту ${updatedRecord.samplingActNumber}`,
      path: publicPath
    };
    
  } catch (error) {
    console.error('Ошибка на сервере при приеме файла:', error);
    const statusCode = typeof error === 'object' && error !== null && 'statusCode' in error
      ? (error as { statusCode?: number }).statusCode
      : undefined;
    const statusMessage = error instanceof Error ? error.message : 'Ошибка при сохранении файла';
    
    throw createError({
        statusCode: statusCode || 500,
        statusMessage,
    });
  }
});