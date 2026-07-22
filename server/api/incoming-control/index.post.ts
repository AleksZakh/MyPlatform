import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';
import { folderNameGenerator } from '~~/server/utils/folderNameGenerator';

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  try {
    const multipartData = await readMultipartFormData(event);
    console.log('Переданыданныедлязаписи multipartData ===>', multipartData);

    if (!multipartData) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request: Данные не найдены',
      });
    }

    // Изолированный безопасный путь на сервере Ubuntu вне зоны видимости Git
    const baseUploadDir = '/var/www/uploads-storage/files';

    // Генерируем подкаталог (например: 2025-11-30_17-45)
    const folderName = folderNameGenerator();
    const targetDir = path.join(baseUploadDir, folderName);

    // Создаем директории, если их нет
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const body: Record<string, string> = {};

    // Сюда будем собирать пути для записи в БД
    const fileDbPaths: Record<string, string> = {
      sDoc: '',
      qualDoc: '',
      protocolDoc: '',
    };

    // 1. Сначала считываем все текстовые поля (чтобы иметь к ним доступ, если понадобятся)
    for (const item of multipartData) {
      if (item.name && !item.filename) {
        body[item.name] = item.data.toString('utf-8');
      }
    }

    // 2. Обрабатываем и сохраняем файлы с безопасными именами
    for (const item of multipartData) {
      if (!item.name || !item.filename) continue;

      const fieldName = item.name; // Имя поля на клиенте ('sDoc', 'qualDoc' или 'protocolDoc')

      // Извлекаем только расширение оригинального файла (например, '.docx' или '.pdf')
      // Используем latin1 -> utf-8 только для корректного извлечения расширения, если оно вдруг на русском
      const rawFilename = Buffer.from(item.filename, 'latin1').toString(
        'utf-8'
      );
      const fileExt = path.extname(rawFilename).toLowerCase(); // Получим например '.pdf'

      // Формируем новое имя файла: имя_поля.расширение (например: sDoc.docx, qualDoc.docx)
      // Кириллица здесь полностью отсутствует, что исключает ошибки файловой системы Ubuntu
      const newFilename = `${fieldName}${fileExt}`;

      // Полный физический путь для записи на диск Ubuntu
      const fullPath = path.join(targetDir, newFilename);

      // Записываем бинарный буфер файла на диск
      fs.writeFileSync(fullPath, item.data);

      // Формируем относительный путь для БД (например: "2025-11-30_17-45/sDoc.docx")
      fileDbPaths[fieldName] = path.join(folderName, newFilename);
    }

    // 3. Сохраняем очищенные данные в PostgreSQL через Prisma
    const newRecord = await prisma.aEng.create({
      data: {
        plp: body.plp || '',
        objectName: body.objName || '',
        samplingActNumber: body.actNumber || '',

        // Конвертируем строки дат в объекты Date для PostgreSQL
        samplingDate: body.sDate ? new Date(body.sDate) : new Date(),
        samplingPlace: body.sPlace || '',
        personProvidedSample: body.sPerson || '',
        materialReceiptDate: body.receiptDate
          ? new Date(body.receiptDate)
          : new Date(),
        materialName: body.material || '',
        manufacturer: body.manufacturer || null,

        protocolNumber: body.testProtocolNumber || '',
        protocolDate: body.testProtocolDate
          ? new Date(body.testProtocolDate)
          : new Date(),
        testResult: body.testResult || '',
        note: body.sNote || null,

        // Сохраняем английские пути к файлам в новые поля схемы
        sDocPath: fileDbPaths.sDoc || null,
        qualDocPath: fileDbPaths.qualDoc || null,
        protocolDocPath: fileDbPaths.protocolDoc || null,
        qualDocNumber: body.qualDocNumber || '',

        // Старое поле для совместимости
        qualityDocument: fileDbPaths.qualDoc || '',
        createdAt: new Date(),
      },
    });

    return {
      success: true,
      data: newRecord,
    };
  } catch (error: any) {
    console.error('Server Error:', error);
    if (error.statusCode) throw error;

    throw createError({
      statusCode: 500,
      statusMessage: `Internal Server Error: ${error.message || 'Ошибка сервера'}`,
    });
  }
});
