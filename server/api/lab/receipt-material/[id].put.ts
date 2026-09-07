// server/api/lab/receipt-material/[id].put.ts
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
        statusMessage: 'Некорректный ID поступления',
      });
    }

    // Проверяем существование записи
    const existingReceipt = await prisma.receiptMaterial.findUnique({
      where: { id },
    });

    if (!existingReceipt) {
      throw createError({
        statusCode: 404,
        statusMessage: `Поступление с ID ${id} не найдено`,
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
    if (body.materialId) {
      const materialId = parseInt(body.materialId);
      if (isNaN(materialId) || materialId <= 0) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Некорректный ID материала',
        });
      }

      const material = await prisma.material.findUnique({
        where: { id: materialId },
      });

      if (!material) {
        throw createError({
          statusCode: 404,
          statusMessage: `Материал с ID ${materialId} не найден`,
        });
      }
    }

    // Проверка на дубликат (если номер документа изменился)
    if (body.qualDocNumber?.trim() && body.qualDocNumber.trim() !== existingReceipt.qualDocNumber) {
      const materialId = body.materialId ? parseInt(body.materialId) : existingReceipt.materialId;
      
      const duplicate = await prisma.receiptMaterial.findFirst({
        where: {
          qualDocNumber: body.qualDocNumber.trim(),
          materialId: materialId,
          id: { not: id },
        },
      });

      if (duplicate) {
        throw createError({
          statusCode: 400,
          statusMessage: `Поступление с таким номером документа "${body.qualDocNumber}" для этого материала уже существует`,
        });
      }
    }

    const editorEmail = body.editorEmail || event.context.user?.email || 'system@user';

    // Подготавливаем данные для обновления
    const updateData: any = {
      editorEmail: editorEmail,
      editedAt: new Date(),
    };

    if (body.qualDate !== undefined) {
      updateData.qualDate = parseDate(body.qualDate);
    }
    if (body.qualDocNumber !== undefined) {
      updateData.qualDocNumber = body.qualDocNumber?.trim() || null;
    }
    if (body.note !== undefined) {
      updateData.note = body.note || null;
    }
    if (body.materialId !== undefined) {
      updateData.materialId = parseInt(body.materialId);
    }
    if (fileDbPaths.qualDoc) {
      updateData.qualDocPath = fileDbPaths.qualDoc;
    }

    // Обновляем поступление
    const updatedReceipt = await prisma.receiptMaterial.update({
      where: { id },
      data: updateData,
    });

    return {
      success: true,
      data: updatedReceipt,
      message: 'Поступление успешно обновлено',
    };

  } catch (error: any) {
    console.error('Ошибка при обновлении поступления:', error);
    
    if (error.statusCode) throw error;
    
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Ошибка при обновлении поступления',
    });
  }
});