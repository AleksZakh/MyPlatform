// server/api/lab/sampling-test/upload.post.ts
import { PrismaClient } from '@prisma/client';
import { defineEventHandler, readMultipartFormData, createError } from 'h3';
import * as fs from 'node:fs';
import * as path from 'node:path';

const prisma = new PrismaClient();

// Папка на сервере, куда физически будут складываться PDF-документы
const UPLOAD_DIR = path.join(process.cwd(), 'uploads/sampling-documents');

export default defineEventHandler(async (event) => {
  // Выводим яркое сообщение в терминал запущенного сервера Nuxt 3
  console.log('\n======================================================');
  console.log(`[🔗 СВЯЗЬ ПРОВЕРЕНА] Получен тестовый запрос на запись файла!`);
  console.log(`Время запроса: ${new Date().toLocaleTimeString()}`);
  console.log(`Метод: ${event.node.req.method} | URL: ${event.node.req.url}`);
  console.log('======================================================\n');

  try {
    // Гарантируем, что папка для файлов существует на сервере
    if (!fs.existsSync(UPLOAD_DIR)) {
        fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }

    // Читаем данные формы multipart/form-data
    const formData = await readMultipartFormData(event);
    if (!formData) {
      throw createError({ statusCode: 400, statusMessage: 'Данные формы не переданы' });
    }

    let fileBuffer: Buffer | null = null;
    let fileName = '';
    let actNumber = '';

    // Разбираем поля из пришедшей формы
    for (const field of formData) {
      if (field.name === 'file' && field.filename) {
        fileBuffer = field.data;
        fileName = field.filename;
      }
      if (field.name === 'actNumber') {
        actNumber = field.data.toString('utf-8');
      }
    }

    if (!fileBuffer || !actNumber) {
      throw createError({ statusCode: 400, statusMessage: 'Отсутствует файл или номер акта' });
    }

    // Формируем безопасное имя файла на сервере и путь для сохранения
    const safeFileName = `act_${actNumber.replace(/\//g, '_')}_${Date.now()}.pdf`;
    const serverFilePath = path.join(UPLOAD_DIR, safeFileName);

    // 1. Физически записываем файл на жесткий диск целевого сервера
    fs.writeFileSync(serverFilePath, fileBuffer);

    // Относительный путь, который мы сохраним в БД (чтобы фронтенд мог его скачать)
    const publicPath = `/uploads/sampling-documents/${safeFileName}`;

    // 2. Обновляем запись в базе данных через Prisma
    // const updatedRecord = await prisma.samplingTest.updateMany({
    //     where: {
    //         samplingActNumber: actNumber.trim()
    //     },
    //     data: {
    //         samplingDocumentPath: publicPath // Прописываем путь к файлу в схему БД
    //     }
    // });

    return {
      success: true,
      message: `Файл успешно загружен на сервер и привязан к акту ${actNumber}`,
      path: publicPath,
    //   updatedCount: updatedRecord.count
    };
    
  } catch (error) {
    console.error('Ошибка на сервере при приеме файла:', error);
    const statusCode = typeof error === 'object' && error !== null && 'statusCode' in error
      ? (error as { statusCode?: number }).statusCode
      : undefined;
    const statusMessage = error instanceof Error
      ? error.message
      : 'Внутренняя ошибка сервера при загрузке файла';
    throw createError({
        statusCode: statusCode || 500,
        statusMessage,
    });
    
  }
  
});





