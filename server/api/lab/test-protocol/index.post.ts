// server/api/lab/test-protocol/index.post.ts
import { PrismaClient } from '@prisma/client';
import { defineEventHandler, readMultipartFormData } from 'h3';
import { handleFileUpload, parseDate } from '~~/server/utils/fileUploadHandler';

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  try {
    const multipartData = await readMultipartFormData(event);

    if (!multipartData) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Форма не содержит данных',
      });
    }

    // Используем универсальный обработчик файлов
    const { body, fileDbPaths } = await handleFileUpload(multipartData);

    // Валидация
    if (!body.protocolNumber?.trim()) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Номер протокола обязателен для заполнения',
      });
    }

    // Проверка на дубликат номера протокола
    const existing = await prisma.testProtocol.findUnique({
      where: { protocolNumber: body.protocolNumber.trim() },
    });

    if (existing) {
      throw createError({
        statusCode: 400,
        statusMessage: `Протокол с номером "${body.protocolNumber}" уже существует`,
      });
    }

    const authorEmail = body.authorEmail || event.context.user?.email || 'system@user';

    // Создаем протокол
    const newProtocol = await prisma.testProtocol.create({
      data: {
        protocolNumber: body.protocolNumber.trim(),
        protocolDate: parseDate(body.protocolDate),
        protocolDocPath: fileDbPaths.protocolDoc || null,
        testResult: body.testResult || null,
        note: body.note || null,
        authorEmail: authorEmail,
        createdAt: new Date(),
      },
    });

    return {
      success: true,
      data: newProtocol,
      message: 'Протокол успешно создан',
    };

  } catch (error: any) {
    console.error('Ошибка при создании протокола:', error);
    
    if (error.statusCode) throw error;
    
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Ошибка при создании протокола',
    });
  }
});