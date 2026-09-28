// server/api/lab/sampling-test/upload.post.ts
import { PrismaClient } from '@prisma/client';
import { defineEventHandler, readMultipartFormData, createError } from 'h3';
import * as fs from 'node:fs';
import * as path from 'node:path';

const prisma = new PrismaClient();

// Папка на сервере, куда физически будут складываться PDF-документы
const UPLOAD_DIR = path.join(process.cwd(), 'public/files');

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
    let actDate = '';
    let objectName = '';
    let actLocation = '';
    console.log('formData ===> ', formData);

    // Разбираем поля из пришедшей формы
    for (const field of formData) {
      switch (field.name ) {
        case 'file':
          if(field.filename){
            fileBuffer = field.data;
            fileName = field.filename;
          }          
          break;
        case 'actNumber':
          actNumber = field.data.toString('utf-8');
          break;
        case 'date':
          actDate = field.data.toString('utf-8');
          break;
        case 'objectName':
          objectName = field.data.toString('utf-8');
          break;
        case 'location':
          actLocation = field.data.toString('utf-8');
          break;
        default:
          break;
      }
    }

    if (!fileBuffer || !actNumber) {
      throw createError({ statusCode: 400, statusMessage: 'Отсутствует файл или номер акта' });
    }

    // ФУНКЦИЯ ОЧИСТКИ СТРОК: Удаляет или заменяет спецсимволы (\, /, *, ?, :, ", <, >, |), 
    // которые запрещены файловой системой Linux/Windows или ломают URL путей.
    const sanitize = (text: string) => {
        return text
            .replace(/[\/\\?%*:|"<>]/g, '_') // Заменяем опасные символы на подчеркивание
            .replace(/\s+/g, '_')            // Заменяем пробелы на подчеркивания для красоты путей
            .substring(0, 50);               // Ограничиваем длину (на случай слишком длинных имен объектов)
    };

    // Генерируем компоненты пути на основе пришедших данных let actLocation = '';
    const safeAct = sanitize(actNumber);
    const safeDate = sanitize(actDate) || 'no-date';
    const safeObject = sanitize(objectName) || 'general-object';
    const safeLocation = sanitize(actLocation) || 'general-object';

    // Формируем безопасное имя файла на сервере и путь для сохранения
    const safeFileName = `act_${actNumber.replace(/\//g, '_')}_${Date.now()}.pdf`;
    // const serverFilePath = path.join(UPLOAD_DIR, safeFileName);

    // ВАРИАНТ Б (Альтернативный): Если вы хотите раскладывать файлы на сервере по ФИЗИЧЕСКИМ ПОДПАПКАМ объектов:
    const customObjectDir = path.join(UPLOAD_DIR, safeObject);
    const customLocation = path.join(customObjectDir, safeLocation);
    const customActDate = path.join(customLocation, safeDate)

    if (!fs.existsSync(customActDate)) fs.mkdirSync(customActDate, { recursive: true });
    const serverFilePath = path.join(customActDate, safeFileName);

    // Текущий целевой путь для сохранения на жесткий диск сервера
    // const serverFilePath = path.join(UPLOAD_DIR, safeFileName);

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





