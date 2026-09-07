// server/api/lab/receipt-material/index.post.ts
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
    if (!body.materialId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Материал обязателен для заполнения',
      });
    }

    const materialId = parseInt(body.materialId);
    if (isNaN(materialId) || materialId <= 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Некорректный ID материала',
      });
    }

    // Проверяем существование материала
    const material = await prisma.material.findUnique({
      where: { id: materialId },
    });

    if (!material) {
      throw createError({
        statusCode: 404,
        statusMessage: `Материал с ID ${materialId} не найден`,
      });
    }

    // Проверка на дубликат (по номеру документа и материалу)
    if (body.qualDocNumber?.trim()) {
      const existing = await prisma.receiptMaterial.findFirst({
        where: {
          qualDocNumber: body.qualDocNumber.trim(),
          materialId: materialId,
        },
      });

      if (existing) {
        throw createError({
          statusCode: 400,
          statusMessage: `Поступление с таким номером документа "${body.qualDocNumber}" для этого материала уже существует`,
        });
      }
    }

    const authorEmail = body.authorEmail || event.context.user?.email || 'system@user';

    // Создаем поступление
    const newReceipt = await prisma.receiptMaterial.create({
      data: {
        qualDate: parseDate(body.qualDate),
        qualDocNumber: body.qualDocNumber?.trim() || null,
        qualDocPath: fileDbPaths.qualDoc || null,
        note: body.note || null,
        materialId: materialId,
        authorEmail: authorEmail,
        createdAt: new Date(),
      },
    });

    return {
      success: true,
      data: newReceipt,
      message: 'Поступление успешно создано',
    };

  } catch (error: any) {
    console.error('Ошибка при создании поступления:', error);
    
    if (error.statusCode) throw error;
    
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Ошибка при создании поступления',
    });
  }
});