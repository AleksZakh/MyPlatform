// server/api/lab/test-protocol/[id].put.ts
import { PrismaClient } from '@prisma/client';
import { defineEventHandler, getRouterParam, readMultipartFormData } from 'h3';
import { handleFileUpload, parseDate } from '~~/server/utils/fileUploadHandler';

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  try {
    const idParam = getRouterParam(event, 'id');
    const id = parseInt(idParam || '', 10);

    if (isNaN(id) || id <= 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Некорректный ID протокола',
      });
    }

    // Проверяем существование записи
    const existingProtocol = await prisma.testProtocol.findUnique({
      where: { id },
    });

    if (!existingProtocol) {
      throw createError({
        statusCode: 404,
        statusMessage: `Протокол с ID ${id} не найден`,
      });
    }

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

    // Проверка на дубликат (если номер изменился)
    if (body.protocolNumber.trim() !== existingProtocol.protocolNumber) {
      const duplicate = await prisma.testProtocol.findUnique({
        where: { protocolNumber: body.protocolNumber.trim() },
      });

      if (duplicate) {
        throw createError({
          statusCode: 400,
          statusMessage: `Протокол с номером "${body.protocolNumber}" уже существует`,
        });
      }
    }

    const editorEmail = body.editorEmail || event.context.user?.email || 'system@user';

    // Обновляем протокол
    const updatedProtocol = await prisma.testProtocol.update({
      where: { id },
      data: {
        protocolNumber: body.protocolNumber.trim(),
        protocolDate: parseDate(body.protocolDate),
        protocolDocPath: fileDbPaths.protocolDoc || existingProtocol.protocolDocPath,
        testResult: body.testResult || null,
        note: body.note || null,
        editorEmail: editorEmail,
        editedAt: new Date(),
      },
    });

    return {
      success: true,
      data: updatedProtocol,
      message: 'Протокол успешно обновлен',
    };

  } catch (error: any) {
    console.error('Ошибка при обновлении протокола:', error);
    
    if (error.statusCode) throw error;
    
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Ошибка при обновлении протокола',
    });
  }
});